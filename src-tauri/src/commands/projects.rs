use crate::db::DbState;
use crate::models::project::{
    NewProject, NewProjectGoal, Project, ProjectDetail, ProjectGoal, ProjectGoalWithProject,
    ProjectWithProgress, UpdateProject, UpdateProjectGoal,
};
use chrono::Local;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn map_project_with_progress(row: &rusqlite::Row) -> rusqlite::Result<ProjectWithProgress> {
    Ok(ProjectWithProgress {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        due_date: row.get(3)?,
        category_id: row.get(4)?,
        status: row.get(5)?,
        created_at: row.get(6)?,
        total_goals: row.get(7)?,
        completed_goals: row.get(8)?,
    })
}

const PROJECT_WITH_PROGRESS_SELECT: &str = "SELECT p.id, p.title, p.description, p.due_date, p.category_id, p.status, p.created_at,
        (SELECT COUNT(*) FROM project_goals g WHERE g.project_id = p.id) as total_goals,
        (SELECT COUNT(*) FROM project_goals g WHERE g.project_id = p.id AND g.status = 'completed') as completed_goals
     FROM projects p";

#[tauri::command]
pub fn create_project(state: State<DbState>, project: NewProject) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO projects (id, title, description, due_date, category_id, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6)",
        params![
            id,
            project.title,
            project.description,
            project.due_date,
            project.category_id,
            Local::now().to_rfc3339()
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_project(state: State<DbState>, project: UpdateProject) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE projects SET title = ?1, description = ?2, due_date = ?3, category_id = ?4, status = ?5
         WHERE id = ?6",
        params![
            project.title,
            project.description,
            project.due_date,
            project.category_id,
            project.status,
            project.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Deleting a project cascades (via the foreign key) to delete all of its goals.
#[tauri::command]
pub fn delete_project(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_projects(state: State<DbState>) -> Result<Vec<ProjectWithProgress>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!("{} ORDER BY p.due_date ASC", PROJECT_WITH_PROGRESS_SELECT);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], map_project_with_progress)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Projects whose due_date falls in [start_date, end_date] — feeds the calendar.
#[tauri::command]
pub fn list_projects_in_range(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<ProjectWithProgress>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "{} WHERE p.due_date BETWEEN ?1 AND ?2 ORDER BY p.due_date ASC",
        PROJECT_WITH_PROGRESS_SELECT
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], map_project_with_progress)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Active (non-completed) projects due within `days` — feeds the dashboard.
#[tauri::command]
pub fn list_upcoming_projects(state: State<DbState>, days: i64) -> Result<Vec<ProjectWithProgress>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let today = Local::now().date_naive();
    let cutoff = today + chrono::Duration::days(days);
    let sql = format!(
        "{} WHERE p.status != 'completed' AND p.due_date <= ?1 ORDER BY p.due_date ASC",
        PROJECT_WITH_PROGRESS_SELECT
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![cutoff.format("%Y-%m-%d").to_string()], map_project_with_progress)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project_detail(state: State<DbState>, project_id: String) -> Result<ProjectDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let project = conn
        .query_row(
            "SELECT id, title, description, due_date, category_id, status, created_at
             FROM projects WHERE id = ?1",
            params![project_id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    due_date: row.get(3)?,
                    category_id: row.get(4)?,
                    status: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, description, due_date, priority, status, created_at
             FROM project_goals WHERE project_id = ?1 ORDER BY due_date ASC",
        )
        .map_err(|e| e.to_string())?;
    let goals = stmt
        .query_map(params![project_id], |row| {
            Ok(ProjectGoal {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                due_date: row.get(4)?,
                priority: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(ProjectDetail { project, goals })
}

#[tauri::command]
pub fn create_project_goal(state: State<DbState>, goal: NewProjectGoal) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let project_due_date: String = conn
        .query_row(
            "SELECT due_date FROM projects WHERE id = ?1",
            params![goal.project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if goal.due_date > project_due_date {
        return Err("Sub-goal due date can't be after the project's due date".to_string());
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO project_goals (id, project_id, title, description, due_date, priority, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7)",
        params![
            id,
            goal.project_id,
            goal.title,
            goal.description,
            goal.due_date,
            goal.priority,
            Local::now().to_rfc3339()
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn update_project_goal(state: State<DbState>, goal: UpdateProjectGoal) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let project_due_date: String = conn
        .query_row(
            "SELECT p.due_date FROM project_goals g JOIN projects p ON p.id = g.project_id WHERE g.id = ?1",
            params![goal.id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if goal.due_date > project_due_date {
        return Err("Sub-goal due date can't be after the project's due date".to_string());
    }
    conn.execute(
        "UPDATE project_goals SET title = ?1, description = ?2, due_date = ?3, priority = ?4, status = ?5
         WHERE id = ?6",
        params![
            goal.title,
            goal.description,
            goal.due_date,
            goal.priority,
            goal.status,
            goal.id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_project_goal(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM project_goals WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn map_goal_with_project(row: &rusqlite::Row) -> rusqlite::Result<ProjectGoalWithProject> {
    Ok(ProjectGoalWithProject {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_title: row.get(2)?,
        title: row.get(3)?,
        description: row.get(4)?,
        due_date: row.get(5)?,
        priority: row.get(6)?,
        status: row.get(7)?,
        created_at: row.get(8)?,
    })
}

const GOAL_WITH_PROJECT_SELECT: &str = "SELECT g.id, g.project_id, p.title as project_title, g.title, g.description,
        g.due_date, g.priority, g.status, g.created_at
     FROM project_goals g JOIN projects p ON p.id = g.project_id";

/// Sub-goals whose due_date falls in [start_date, end_date] — feeds the calendar.
#[tauri::command]
pub fn list_project_goals_in_range(
    state: State<DbState>,
    start_date: String,
    end_date: String,
) -> Result<Vec<ProjectGoalWithProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let sql = format!(
        "{} WHERE g.due_date BETWEEN ?1 AND ?2 ORDER BY g.due_date ASC",
        GOAL_WITH_PROJECT_SELECT
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![start_date, end_date], map_goal_with_project)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Incomplete sub-goals due within `days` — feeds the dashboard.
#[tauri::command]
pub fn list_upcoming_project_goals(
    state: State<DbState>,
    days: i64,
) -> Result<Vec<ProjectGoalWithProject>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let today = Local::now().date_naive();
    let cutoff = today + chrono::Duration::days(days);
    let sql = format!(
        "{} WHERE g.status != 'completed' AND g.due_date <= ?1 ORDER BY g.due_date ASC",
        GOAL_WITH_PROJECT_SELECT
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![cutoff.format("%Y-%m-%d").to_string()], map_goal_with_project)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}