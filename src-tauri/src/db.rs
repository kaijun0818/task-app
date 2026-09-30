use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct DbState(pub Mutex<Connection>);

/// Resolve the on-disk path for the SQLite database, inside the app's
/// per-user data directory (e.g. %APPDATA%/com.kj.daybook on Windows).
pub fn db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let dir = app_handle
        .path()
        .app_data_dir()
        .expect("could not resolve app data dir");
    std::fs::create_dir_all(&dir).expect("could not create app data dir");
    dir.join("daybook.sqlite3")
}

pub fn init_db(path: &PathBuf) -> Connection {
    let conn = Connection::open(path).expect("failed to open sqlite database");
    conn.pragma_update(None, "foreign_keys", true).unwrap();
    migrate(&conn);
    conn
}

fn migrate(conn: &Connection) {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS categories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            color       TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recurring_rules (
            id                  TEXT PRIMARY KEY,
            frequency           TEXT NOT NULL,       -- daily | weekly | monthly | custom
            interval            INTEGER NOT NULL DEFAULT 1,
            by_weekdays         TEXT,                 -- comma-separated 0-6 (Sun-Sat), used when frequency = weekly
            end_date            TEXT,                 -- ISO date, nullable = no end
            occurrence_count    INTEGER                -- nullable = unlimited (bounded by end_date instead)
        );

        CREATE TABLE IF NOT EXISTS daily_tasks (
            id           TEXT PRIMARY KEY,
            title        TEXT NOT NULL,
            description  TEXT,
            category_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
            active       INTEGER NOT NULL DEFAULT 1,
            created_at   TEXT NOT NULL
        );

        -- One row per (task, calendar day) so completion state resets
        -- naturally every day without mutating the task definition.
        CREATE TABLE IF NOT EXISTS daily_task_logs (
            id             TEXT PRIMARY KEY,
            daily_task_id  TEXT NOT NULL REFERENCES daily_tasks(id) ON DELETE CASCADE,
            log_date       TEXT NOT NULL,
            completed      INTEGER NOT NULL DEFAULT 0,
            UNIQUE(daily_task_id, log_date)
        );

        CREATE TABLE IF NOT EXISTS deadlines (
            id                  TEXT PRIMARY KEY,
            title               TEXT NOT NULL,
            description         TEXT,
            due_date            TEXT NOT NULL,
            priority            TEXT NOT NULL DEFAULT 'medium',  -- low | medium | high
            category_id         TEXT REFERENCES categories(id) ON DELETE SET NULL,
            status              TEXT NOT NULL DEFAULT 'pending', -- pending | completed | overdue
            recurring_rule_id   TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
            created_at          TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events (
            id                  TEXT PRIMARY KEY,
            title               TEXT NOT NULL,
            description         TEXT,
            event_date          TEXT NOT NULL,
            event_time          TEXT,
            location            TEXT,
            category_id         TEXT REFERENCES categories(id) ON DELETE SET NULL,
            recurring_rule_id   TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
            created_at          TEXT NOT NULL
        );

        -- A "big deadline": the umbrella project with its own due date.
        CREATE TABLE IF NOT EXISTS projects (
            id            TEXT PRIMARY KEY,
            title         TEXT NOT NULL,
            description   TEXT,
            due_date      TEXT NOT NULL,
            category_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
            status        TEXT NOT NULL DEFAULT 'active', -- active | completed
            created_at    TEXT NOT NULL
        );

        -- Sub-goals belonging to a project, each with their own due date
        -- and details. Deleting the project cascades to its goals.
        CREATE TABLE IF NOT EXISTS project_goals (
            id            TEXT PRIMARY KEY,
            project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title         TEXT NOT NULL,
            description   TEXT,
            due_date      TEXT NOT NULL,
            priority      TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
            status        TEXT NOT NULL DEFAULT 'pending', -- pending | completed
            created_at    TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_daily_task_logs_date ON daily_task_logs(log_date);
        CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON deadlines(due_date);
        CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
        CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
        CREATE INDEX IF NOT EXISTS idx_project_goals_project_id ON project_goals(project_id);
        "#,
    )
    .expect("failed to run migrations");
}