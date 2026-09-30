use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyTask {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub active: bool,
    pub created_at: String,
}

/// A daily task joined with today's (or a given date's) completion state.
/// This is what the frontend actually renders in the checklist.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyTaskWithStatus {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub completed: bool,
}

#[derive(Debug, Deserialize)]
pub struct NewDailyTask {
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDailyTask {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub active: bool,
}
