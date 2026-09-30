import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  DailyTaskWithStatus,
  DashboardData,
  Deadline,
  DeadlineOccurrence,
  EventItem,
  EventOccurrence,
  HeatmapDay,
  Project,
  ProjectDetail,
  ProjectGoalWithProject,
  ProjectWithProgress,
  RecurringRuleInput,
} from "../types";

// --- Dashboard ---
export const getDashboard = () => invoke<DashboardData>("get_dashboard");

// --- Categories ---
export const listCategories = () => invoke<Category[]>("list_categories");
export const createCategory = (name: string, color: string) =>
  invoke<Category>("create_category", { category: { name, color } });
export const deleteCategory = (id: string) => invoke<void>("delete_category", { id });

// --- Daily tasks ---
export const listDailyTasksForDate = (date: string) =>
  invoke<DailyTaskWithStatus[]>("list_daily_tasks_for_date", { date });

export const toggleDailyTask = (taskId: string, date: string, completed: boolean) =>
  invoke<void>("toggle_daily_task", { taskId, date, completed });

export const createDailyTask = (title: string, description: string | null, categoryId: string | null) =>
  invoke<string>("create_daily_task", {
    task: { title, description, category_id: categoryId },
  });

export const updateDailyTask = (
  id: string,
  title: string,
  description: string | null,
  categoryId: string | null,
  active: boolean
) =>
  invoke<void>("update_daily_task", {
    task: { id, title, description, category_id: categoryId, active },
  });

export const deleteDailyTask = (id: string) => invoke<void>("delete_daily_task", { id });

export const getCompletionHeatmap = (startDate: string, endDate: string) =>
  invoke<HeatmapDay[]>("get_completion_heatmap", { startDate, endDate });

// --- Deadlines ---
export const listDeadlines = () => invoke<Deadline[]>("list_deadlines");

export const listDeadlinesInRange = (startDate: string, endDate: string) =>
  invoke<DeadlineOccurrence[]>("list_deadlines_in_range", { startDate, endDate });

export const createDeadline = (input: {
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  category_id: string | null;
  recurring_rule: RecurringRuleInput | null;
}) => invoke<string>("create_deadline", { deadline: input });

export const updateDeadline = (input: {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  category_id: string | null;
  status: string;
}) => invoke<void>("update_deadline", { deadline: input });

export const deleteDeadline = (id: string) => invoke<void>("delete_deadline", { id });

// --- Events ---
export const listEvents = () => invoke<EventItem[]>("list_events");

export const listEventsInRange = (startDate: string, endDate: string) =>
  invoke<EventOccurrence[]>("list_events_in_range", { startDate, endDate });

export const createEvent = (input: {
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  category_id: string | null;
  recurring_rule: RecurringRuleInput | null;
}) => invoke<string>("create_event", { event: input });

export const updateEvent = (input: {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  category_id: string | null;
}) => invoke<void>("update_event", { event: input });

export const deleteEvent = (id: string) => invoke<void>("delete_event", { id });

// --- Projects ---
export const listProjects = () => invoke<ProjectWithProgress[]>("list_projects");

export const getProjectDetail = (projectId: string) =>
  invoke<ProjectDetail>("get_project_detail", { projectId });

export const createProject = (input: {
  title: string;
  description: string | null;
  due_date: string;
  category_id: string | null;
}) => invoke<string>("create_project", { project: input });

export const updateProject = (input: {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  category_id: string | null;
  status: string;
}) => invoke<void>("update_project", { project: input });

export const deleteProject = (id: string) => invoke<void>("delete_project", { id });

export const createProjectGoal = (input: {
  project_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
}) => invoke<string>("create_project_goal", { goal: input });

export const updateProjectGoal = (input: {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
}) => invoke<void>("update_project_goal", { goal: input });

export const deleteProjectGoal = (id: string) => invoke<void>("delete_project_goal", { id });

export const listProjectsInRange = (startDate: string, endDate: string) =>
  invoke<ProjectWithProgress[]>("list_projects_in_range", { startDate, endDate });

export const listProjectGoalsInRange = (startDate: string, endDate: string) =>
  invoke<ProjectGoalWithProject[]>("list_project_goals_in_range", { startDate, endDate });