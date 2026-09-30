use super::daily_tasks::list_daily_tasks_for_date;
use super::deadlines::list_upcoming_deadlines;
use super::events::list_upcoming_events;
use super::projects::{list_upcoming_project_goals, list_upcoming_projects};
use crate::db::DbState;
use crate::models::daily_task::DailyTaskWithStatus;
use crate::models::project::{ProjectGoalWithProject, ProjectWithProgress};
use crate::models::{Deadline, Event};
use chrono::Local;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct DashboardData {
    pub date: String,
    pub daily_tasks: Vec<DailyTaskWithStatus>,
    pub upcoming_deadlines: Vec<Deadline>,
    pub upcoming_events: Vec<Event>,
    pub upcoming_projects: Vec<ProjectWithProgress>,
    pub upcoming_project_goals: Vec<ProjectGoalWithProject>,
}

/// Single call that assembles everything the "Today" dashboard needs:
/// today's daily-task checklist, deadlines/projects/goals due within a
/// week, and events happening within a month. Avoids the frontend firing
/// five requests on load.
#[tauri::command]
pub fn get_dashboard(state: State<DbState>) -> Result<DashboardData, String> {
    let today = Local::now().date_naive().format("%Y-%m-%d").to_string();
    let daily_tasks = list_daily_tasks_for_date(State::clone(&state), today.clone())?;
    let upcoming_deadlines = list_upcoming_deadlines(State::clone(&state), 7)?;
    let upcoming_events = list_upcoming_events(State::clone(&state), 30)?;
    let upcoming_projects = list_upcoming_projects(State::clone(&state), 7)?;
    let upcoming_project_goals = list_upcoming_project_goals(State::clone(&state), 7)?;
    Ok(DashboardData {
        date: today,
        daily_tasks,
        upcoming_deadlines,
        upcoming_events,
        upcoming_projects,
        upcoming_project_goals,
    })
}