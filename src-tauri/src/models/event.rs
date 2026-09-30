use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub event_date: String, // ISO date (YYYY-MM-DD)
    pub event_time: Option<String>, // "HH:MM"
    pub location: Option<String>,
    pub category_id: Option<String>,
    pub recurring_rule_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewEvent {
    pub title: String,
    pub description: Option<String>,
    pub event_date: String,
    pub event_time: Option<String>,
    pub location: Option<String>,
    pub category_id: Option<String>,
    pub recurring_rule: Option<super::recurring_rule::NewRecurringRule>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub event_date: String,
    pub event_time: Option<String>,
    pub location: Option<String>,
    pub category_id: Option<String>,
}
