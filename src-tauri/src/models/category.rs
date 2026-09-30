use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String, // hex string, e.g. "#8B7FD6"
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewCategory {
    pub name: String,
    pub color: String,
}
