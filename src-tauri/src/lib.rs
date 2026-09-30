mod commands;
mod db;
mod models;
mod recurrence;
mod scheduler;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let path = db::db_path(&handle);
            let conn = db::init_db(&path);
            app.manage(DbState(Mutex::new(conn)));
            scheduler::start(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::categories::list_categories,
            commands::categories::create_category,
            commands::categories::delete_category,
            commands::daily_tasks::list_daily_tasks_for_date,
            commands::daily_tasks::toggle_daily_task,
            commands::daily_tasks::create_daily_task,
            commands::daily_tasks::update_daily_task,
            commands::daily_tasks::delete_daily_task,
            commands::daily_tasks::get_completion_heatmap,
            commands::deadlines::create_deadline,
            commands::deadlines::update_deadline,
            commands::deadlines::delete_deadline,
            commands::deadlines::list_deadlines,
            commands::deadlines::list_deadlines_in_range,
            commands::deadlines::list_upcoming_deadlines,
            commands::events::create_event,
            commands::events::update_event,
            commands::events::delete_event,
            commands::events::list_events,
            commands::events::list_events_in_range,
            commands::events::list_upcoming_events,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            commands::projects::list_projects,
            commands::projects::list_projects_in_range,
            commands::projects::list_upcoming_projects,
            commands::projects::get_project_detail,
            commands::projects::create_project_goal,
            commands::projects::update_project_goal,
            commands::projects::delete_project_goal,
            commands::projects::list_project_goals_in_range,
            commands::projects::list_upcoming_project_goals,
            commands::dashboard::get_dashboard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}