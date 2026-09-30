use crate::db::DbState;
use crate::models::{Category, category::NewCategory};
use chrono::Local;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn list_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, created_at FROM categories ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category(state: State<DbState>, category: NewCategory) -> Result<Category, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Local::now().to_rfc3339();
    conn.execute(
        "INSERT INTO categories (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, category.name, category.color, created_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(Category {
        id,
        name: category.name,
        color: category.color,
        created_at,
    })
}

#[tauri::command]
pub fn delete_category(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
