use crate::db::DbState;
use chrono::Local;
use std::thread;
use std::time::Duration;
use tauri::Manager;

/// Sweeps `pending` deadlines whose due_date has passed and flips them to
/// `overdue`. The dashboard/list views are date-driven already, so this
/// isn't required for correctness, but it keeps `status` (used for
/// filtering/coloring) accurate without the user having to re-open a deadline.
pub fn start(app_handle: tauri::AppHandle) {
    thread::spawn(move || loop {
        if let Some(state) = app_handle.try_state::<DbState>() {
            if let Ok(conn) = state.0.lock() {
                let today = Local::now().date_naive().format("%Y-%m-%d").to_string();
                let _ = conn.execute(
                    "UPDATE deadlines SET status = 'overdue'
                     WHERE status = 'pending' AND due_date < ?1",
                    [today],
                );
            }
        }
        thread::sleep(Duration::from_secs(60 * 60)); // hourly is plenty
    });
}
