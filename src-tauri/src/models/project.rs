use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub category_id: Option<String>,
    pub status: String, // "active" | "completed"
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewProject {
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub category_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProject {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub category_id: Option<String>,
    pub status: String,
}

/// A project row plus its goal-completion counts, for the project list view.
#[derive(Debug, Serialize)]
pub struct ProjectWithProgress {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub category_id: Option<String>,
    pub status: String,
    pub created_at: String,
    pub total_goals: i64,
    pub completed_goals: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectGoal {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub priority: String, // "low" | "medium" | "high"
    pub status: String,   // "pending" | "completed"
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewProjectGoal {
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub priority: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectGoal {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub priority: String,
    pub status: String,
}

/// A project plus its full list of sub-goals, for the detail view.
#[derive(Debug, Serialize)]
pub struct ProjectDetail {
    pub project: Project,
    pub goals: Vec<ProjectGoal>,
}

/// A sub-goal joined with its parent project's title — used wherever goals
/// need to be shown standalone (calendar, dashboard) and still say which
/// project they belong to.
#[derive(Debug, Serialize, Clone)]
pub struct ProjectGoalWithProject {
    pub id: String,
    pub project_id: String,
    pub project_title: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub priority: String,
    pub status: String,
    pub created_at: String,
}