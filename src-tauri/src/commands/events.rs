use crate::db::DbState;
use crate::models::event::{Event, NewEvent, UpdateEvent};
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
pub fn create_event(state: State<DbState>, event: NewEvent) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let recurring_rule_id = match &event.recurring_rule {
        Some(r) => Some(insert_recurring_rule(&conn, r)?),
        None => None,
    };
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO events (id, title, description, event_date, event_time, location, category_id, recurring_rule_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            event.title,
            event.description,
            event.event_date,
            event.event_time,
            event.location,
            event.category_id,
            recurring_rule_id,
            Local::now().to_rfc3339()
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_event(state: State<DbState>, event: UpdateEvent) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE events SET title = ?1, description = ?2, event_date = ?3, event_time = ?4,
                location = ?5, category_id = ?6
         WHERE id = ?7",
        params![
            event.title,
            event.description,
            event.event_date,
            event.event_time,
            event.location,
            event.category_id,
            event.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_event(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM events WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_events(state: State<DbState>) -> Result<Vec<Event>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, event_date, event_time, location, category_id, recurring_rule_id, created_at
             FROM events ORDER BY event_date ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], map_event_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Clone)]
pub struct EventOccurrence {
    #[serde(flatten)]
    pub event: Event,
    pub occurrence_date: String,
}

/// Events that fall inside [start_date, end_date], with recurring events
/// expanded into one entry per occurrence. Powers the calendar view.
#[tauri::command]
pub fn list_events_in_range(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<EventOccurrence>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let range_start = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d").map_err(|e| e.to_string())?;
    let range_end = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d").map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, event_date, event_time, location, category_id, recurring_rule_id, created_at
             FROM events",
        )
        .map_err(|e| e.to_string())?;
    let all: Vec<Event> = stmt
        .query_map([], map_event_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for e in all {
        let anchor = match NaiveDate::parse_from_str(&e.event_date, "%Y-%m-%d") {
            Ok(v) => v,
            Err(_) => continue,
        };
        match &e.recurring_rule_id {
            None => {
                if anchor >= range_start && anchor <= range_end {
                    out.push(EventOccurrence {
                        occurrence_date: e.event_date.clone(),
                        event: e,
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
                        out.push(EventOccurrence {
                            occurrence_date: occ.format("%Y-%m-%d").to_string(),
                            event: e.clone(),
                        });
                    }
                }
            }
        }
    }
    out.sort_by(|a, b| a.occurrence_date.cmp(&b.occurrence_date));
    Ok(out)
}

/// Events happening within the next `days` (inclusive of today) — feeds
/// the dashboard's "today / coming up" list.
#[tauri::command]
pub fn list_upcoming_events(state: State<DbState>, days: i64) -> Result<Vec<Event>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let today = Local::now().date_naive();
    let cutoff = today + chrono::Duration::days(days);
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, event_date, event_time, location, category_id, recurring_rule_id, created_at
             FROM events
             WHERE event_date >= ?1 AND event_date <= ?2
             ORDER BY event_date ASC, event_time ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(
            params![today.format("%Y-%m-%d").to_string(), cutoff.format("%Y-%m-%d").to_string()],
            map_event_row,
        )
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

fn map_event_row(row: &rusqlite::Row) -> rusqlite::Result<Event> {
    Ok(Event {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        event_date: row.get(3)?,
        event_time: row.get(4)?,
        location: row.get(5)?,
        category_id: row.get(6)?,
        recurring_rule_id: row.get(7)?,
        created_at: row.get(8)?,
    })
}
