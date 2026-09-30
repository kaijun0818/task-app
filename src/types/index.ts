export type Priority = "low" | "medium" | "high";
export type DeadlineStatus = "pending" | "completed" | "overdue";
export type Frequency = "daily" | "weekly" | "monthly" | "custom";

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface RecurringRuleInput {
  frequency: Frequency;
  interval: number;
  by_weekdays: string | null; // "0,2,4" Sun=0..Sat=6, weekly only
  end_date: string | null;
  occurrence_count: number | null;
}

export interface DailyTaskWithStatus {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  completed: boolean;
}

export interface Deadline {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: Priority;
  category_id: string | null;
  status: DeadlineStatus;
  recurring_rule_id: string | null;
  created_at: string;
}

export interface DeadlineOccurrence extends Deadline {
  occurrence_date: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  category_id: string | null;
  recurring_rule_id: string | null;
  created_at: string;
}

export interface EventOccurrence extends EventItem {
  occurrence_date: string;
}

export interface HeatmapDay {
  date: string;
  completed: number;
  total: number;
}

export type ProjectStatus = "active" | "completed";
export type GoalStatus = "pending" | "completed";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  category_id: string | null;
  status: ProjectStatus;
  created_at: string;
}

export interface ProjectWithProgress extends Project {
  total_goals: number;
  completed_goals: number;
}

export interface ProjectGoal {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: Priority;
  status: GoalStatus;
  created_at: string;
}

export interface ProjectDetail {
  project: Project;
  goals: ProjectGoal[];
}

export interface ProjectGoalWithProject {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: Priority;
  status: GoalStatus;
  created_at: string;
}

export interface DashboardData {
  date: string;
  daily_tasks: DailyTaskWithStatus[];
  upcoming_deadlines: Deadline[];
  upcoming_events: EventItem[];
  upcoming_projects: ProjectWithProgress[];
  upcoming_project_goals: ProjectGoalWithProject[];
}