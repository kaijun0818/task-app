use crate::db::DbState;
use crate::models::daily_task::{DailyTaskWithStatus, NewDailyTask, UpdateDailyTask};
use chrono::Local;
use rusqlite::params;
use serde::Serialize;
use tauri::State;
use uuid::Uuid;

/// All active daily tasks, joined with their completion state for `date`
/// (YYYY-MM-DD). A task with no log row yet for that date is "not completed" -
/// this is what makes the checklist appear freshly unchecked every day
/// without any batch job needing to run at midnight.
#[tauri::command]
pub fn list_daily_tasks_for_date(
    state: State<DbState>,
    date: String,
) -> Result<Vec<DailyTaskWithStatus>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.title, t.description, t.category_id,
                    COALESCE(l.completed, 0) as completed
             FROM daily_tasks t
             LEFT JOIN daily_task_logs l
                    ON l.daily_task_id = t.id AND l.log_date = ?1
             WHERE t.active = 1
             ORDER BY t.created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![date], |row| {
            Ok(DailyTaskWithStatus {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                category_id: row.get(3)?,
                completed: row.get::<_, i64>(4)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_daily_task(
    state: State<DbState>,
    task_id: String,
    date: String,
    completed: bool,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO daily_task_logs (id, daily_task_id, log_date, completed)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(daily_task_id, log_date)
         DO UPDATE SET completed = excluded.completed",
        params![Uuid::new_v4().to_string(), task_id, date, completed as i64],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_daily_task(state: State<DbState>, task: NewDailyTask) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO daily_tasks (id, title, description, category_id, active, created_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5)",
        params![
            id,
            task.title,
            task.description,
            task.category_id,
            Local::now().to_rfc3339()
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_daily_task(state: State<DbState>, task: UpdateDailyTask) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE daily_tasks SET title = ?1, description = ?2, category_id = ?3, active = ?4
         WHERE id = ?5",
        params![
            task.title,
            task.description,
            task.category_id,
            task.active as i64,
            task.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Deletes are soft (active = 0) by default from the UI's "archive" action;
/// this is a hard delete for when the user explicitly removes a task.
#[tauri::command]
pub fn delete_daily_task(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM daily_tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct HeatmapDay {
    pub date: String,
    pub completed: i64,
    pub total: i64,
}

/// Aggregate completion across ALL active daily tasks, one row per day,
/// for the given inclusive date range. Powers the heatmap view.
#[tauri::command]
pub fn get_completion_heatmap(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<HeatmapDay>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT log_date,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as done,
                    COUNT(*) as total
             FROM daily_task_logs
             WHERE log_date BETWEEN ?1 AND ?2
             GROUP BY log_date
             ORDER BY log_date ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(HeatmapDay {
                date: row.get(0)?,
                completed: row.get(1)?,
                total: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
