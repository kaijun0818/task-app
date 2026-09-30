use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Deadline {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String, // ISO date (YYYY-MM-DD)
    pub priority: String, // "low" | "medium" | "high"
    pub category_id: Option<String>,
    pub status: String, // "pending" | "completed" | "overdue"
    pub recurring_rule_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDeadline {
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub priority: String,
    pub category_id: Option<String>,
    pub recurring_rule: Option<super::recurring_rule::NewRecurringRule>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeadline {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub priority: String,
    pub category_id: Option<String>,
    pub status: String,
}
