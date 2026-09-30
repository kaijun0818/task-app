use crate::db::DbState;
use crate::models::deadline::{Deadline, NewDeadline, UpdateDeadline};
use crate::models::RecurringRule;
use crate::recurrence::expand_occurrences;
use chrono::{Local, NaiveDate};
use rusqlite::{params, OptionalExtension};
use serde::Serialize;
use tauri::State;
use uuid::Uuid;

fn insert_recurring_rule(
    conn: &rusqlite::Connection,
    rule: &crate::models::recurring_rule::NewRecurringRule,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO recurring_rules (id, frequency, interval, by_weekdays, end_date, occurrence_count)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            rule.frequency,
            rule.interval,
            rule.by_weekdays,
            rule.end_date,
            rule.occurrence_count
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn create_deadline(state: State<DbState>, deadline: NewDeadline) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let recurring_rule_id = match &deadline.recurring_rule {
        Some(r) => Some(insert_recurring_rule(&conn, r)?),
        None => None,
    };
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO deadlines (id, title, description, due_date, priority, category_id, status, recurring_rule_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8)",
        params![
            id,
            deadline.title,
            deadline.description,
            deadline.due_date,
            deadline.priority,
            deadline.category_id,
            recurring_rule_id,
            Local::now().to_rfc3339()
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_deadline(state: State<DbState>, deadline: UpdateDeadline) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE deadlines SET title = ?1, description = ?2, due_date = ?3, priority = ?4,
                category_id = ?5, status = ?6
         WHERE id = ?7",
        params![
            deadline.title,
            deadline.description,
            deadline.due_date,
            deadline.priority,
            deadline.category_id,
            deadline.status,
            deadline.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_deadline(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM deadlines WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Every non-recurring deadline plus every recurring deadline's base row.
/// (For a range-aware list that expands recurrence, see `list_deadlines_in_range`.)
#[tauri::command]
pub fn list_deadlines(state: State<DbState>) -> Result<Vec<Deadline>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, due_date, priority, category_id, status, recurring_rule_id, created_at
             FROM deadlines ORDER BY due_date ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], map_deadline_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Clone)]
pub struct DeadlineOccurrence {
    #[serde(flatten)]
    pub deadline: Deadline,
    pub occurrence_date: String,
}

/// Deadlines that fall inside [start_date, end_date], with recurring
/// deadlines expanded into one entry per occurrence. Powers the calendar view.
#[tauri::command]
pub fn list_deadlines_in_range(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<DeadlineOccurrence>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let range_start = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d").map_err(|e| e.to_string())?;
    let range_end = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d").map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, due_date, priority, category_id, status, recurring_rule_id, created_at
             FROM deadlines",
        )
        .map_err(|e| e.to_string())?;
    let all: Vec<Deadline> = stmt
        .query_map([], map_deadline_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for d in all {
        let anchor = match NaiveDate::parse_from_str(&d.due_date, "%Y-%m-%d") {
            Ok(v) => v,
            Err(_) => continue,
        };
        match &d.recurring_rule_id {
            None => {
                if anchor >= range_start && anchor <= range_end {
                    out.push(DeadlineOccurrence {
                        occurrence_date: d.due_date.clone(),
                        deadline: d,
                    });
                }
            }
            Some(rule_id) => {
                let rule: Option<RecurringRule> = conn
                    .query_row(
                        "SELECT id, frequency, interval, by_weekdays, end_date, occurrence_count
                         FROM recurring_rules WHERE id = ?1",
                        params![rule_id],
                        |row| {
                            Ok(RecurringRule {
                                id: row.get(0)?,
                                frequency: row.get(1)?,
                                interval: row.get(2)?,
                                by_weekdays: row.get(3)?,
                                end_date: row.get(4)?,
                                occurrence_count: row.get(5)?,
                            })
                        },
                    )
                    .optional()
                    .map_err(|e| e.to_string())?;
                if let Some(rule) = rule {
                    for occ in expand_occurrences(&rule, anchor, range_start, range_end) {
                        out.push(DeadlineOccurrence {
                            occurrence_date: occ.format("%Y-%m-%d").to_string(),
                            deadline: d.clone(),
                        });
                    }
                }
            }
        }
    }
    out.sort_by(|a, b| a.occurrence_date.cmp(&b.occurrence_date));
    Ok(out)
}

/// Deadlines due within the next `days` (inclusive of today) that are
/// still pending — feeds the dashboard's "coming up" list.
#[tauri::command]
pub fn list_upcoming_deadlines(state: State<DbState>, days: i64) -> Result<Vec<Deadline>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let today = Local::now().date_naive();
    let cutoff = today + chrono::Duration::days(days);
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, due_date, priority, category_id, status, recurring_rule_id, created_at
             FROM deadlines
             WHERE status != 'completed' AND due_date <= ?1
             ORDER BY due_date ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![cutoff.format("%Y-%m-%d").to_string()], map_deadline_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn map_deadline_row(row: &rusqlite::Row) -> rusqlite::Result<Deadline> {
    Ok(Deadline {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        due_date: row.get(3)?,
        priority: row.get(4)?,
        category_id: row.get(5)?,
        status: row.get(6)?,
        recurring_rule_id: row.get(7)?,
        created_at: row.get(8)?,
    })
}
