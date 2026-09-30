use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecurringRule {
    pub id: String,
    pub frequency: String, // "daily" | "weekly" | "monthly" | "custom"
    pub interval: i64,     // every N frequency-units
    pub by_weekdays: Option<String>, // "0,2,4" (Sun=0..Sat=6), weekly only
    pub end_date: Option<String>,
    pub occurrence_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct NewRecurringRule {
    pub frequency: String,
    pub interval: i64,
    pub by_weekdays: Option<String>,
    pub end_date: Option<String>,
    pub occurrence_count: Option<i64>,
}
