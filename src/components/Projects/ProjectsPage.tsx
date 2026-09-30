import { useEffect, useState } from "react";
import * as api from "../../api/client";
import type {
  Category,
  Priority,
  ProjectDetail,
  ProjectGoal,
  ProjectStatus,
  ProjectWithProgress,
} from "../../types";
import Modal from "../common/Modal";
import { CategorySelect, CategoryTag } from "../common/Category";
import { todayLocalISODate } from "../../utils/date";
import { playCompletionChime } from "../../utils/sound";

export default function ProjectsPage({ categories }: { categories: Category[] }) {
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<"new" | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const refresh = () => api.listProjects().then(setProjects);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  // Only react to Ctrl+T while on the list (the detail view has its own
  // listener for adding a goal instead).
  useEffect(() => {
    const handler = () => {
      if (!selectedProjectId) setEditingProject("new");
    };
    window.addEventListener("daybook:new", handler);
    return () => window.removeEventListener("daybook:new", handler);
  }, [selectedProjectId]);

  const catById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  if (selectedProjectId) {
    return (
      <ProjectDetailView
        projectId={selectedProjectId}
        categories={categories}
        onBack={() => {
          setSelectedProjectId(null);
          refresh();
        }}
      />
    );
  }

  const sorted = [...projects].sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Big deadlines with their own sub-goals</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditingProject("new")}>
          + New project
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            No projects yet. Create one for a big deadline you want to break into sub-goals.
          </div>
        ) : (
          sorted.map((p) => {
            const pct = p.total_goals === 0 ? 0 : Math.round((p.completed_goals / p.total_goals) * 100);
            return (
              <button key={p.id} className="project-card" onClick={() => setSelectedProjectId(p.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div className="list-item-title">{p.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {p.status === "completed" && <span className="tag status-completed">completed</span>}
                    <CategoryTag category={catById(p.category_id)} />
                  </div>
                </div>
                <div className="list-item-meta">
                  Due {p.due_date} · {p.completed_goals}/{p.total_goals} goals done
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {editingProject === "new" && (
        <ProjectModal
          categories={categories}
          onClose={() => setEditingProject(null)}
          onSaved={() => {
            setEditingProject(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ProjectDetailView({
  projectId,
  categories,
  onBack,
}: {
  projectId: string;
  categories: Category[];
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<ProjectGoal | "new" | null>(null);
  const [editingProjectInfo, setEditingProjectInfo] = useState(false);
  const [poppingId, setPoppingId] = useState<string | null>(null);

  const refresh = () => api.getProjectDetail(projectId).then(setDetail);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    const handler = () => setEditingGoal("new");
    window.addEventListener("daybook:new", handler);
    return () => window.removeEventListener("daybook:new", handler);
  }, []);

  const catById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  const toggleGoal = async (goal: ProjectGoal) => {
    const nowCompleting = goal.status !== "completed";
    if (nowCompleting) {
      setPoppingId(goal.id);
      playCompletionChime();
      setTimeout(() => setPoppingId((cur) => (cur === goal.id ? null : cur)), 320);
    }
    await api.updateProjectGoal({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      due_date: goal.due_date,
      priority: goal.priority,
      status: nowCompleting ? "completed" : "pending",
    });
    refresh();
  };

  const deleteProject = async () => {
    if (!detail) return;
    if (!window.confirm(`Delete "${detail.project.title}" and all its sub-goals? This can't be undone.`)) return;
    await api.deleteProject(detail.project.id);
    onBack();
  };

  if (loading || !detail) return <div className="empty-state">Loading…</div>;

  const { project, goals } = detail;
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const pct = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);
  const sortedGoals = [...goals].sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div>
      <button className="icon-btn" onClick={onBack} style={{ marginBottom: 14 }}>
        ← All projects
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-subtitle">
            Due {project.due_date}
            {project.status === "completed" ? " · completed" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setEditingProjectInfo(true)}>
            Edit project
          </button>
          <button className="btn btn-danger" onClick={deleteProject}>
            Delete project
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        {project.description && (
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-muted)" }}>{project.description}</p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="page-subtitle" style={{ marginTop: 0 }}>
            {completedGoals} of {totalGoals} sub-goals done
          </span>
          <CategoryTag category={catById(project.category_id)} />
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="page-header">
        <p className="section-title-row" style={{ margin: 0 }}>
          Sub-goals
        </p>
        <button className="btn btn-primary" onClick={() => setEditingGoal("new")}>
          + New goal
        </button>
      </div>

      <div className="card">
        {sortedGoals.length === 0 ? (
          <div className="empty-state">No sub-goals yet. Break this project down into steps.</div>
        ) : (
          sortedGoals.map((g) => (
            <div className="list-item" key={g.id}>
              <button
                className={`checkbox ${g.status === "completed" ? "checked" : ""} ${poppingId === g.id ? "pop" : ""}`}
                onClick={() => toggleGoal(g)}
                aria-label="Toggle complete"
              >
                {g.status === "completed" && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path
                      d="M1 4.5L4 7.5L10 1"
                      stroke="#fdf6f3"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <div className="list-item-main">
                <div className={`task-title ${g.status === "completed" ? "done" : ""}`} style={{ fontWeight: 500 }}>
                  {g.title}
                </div>
                <div className="list-item-meta">{g.due_date}</div>
              </div>
              <span className={`tag priority-${g.priority}`}>{g.priority}</span>
              <button className="icon-btn" onClick={() => setEditingGoal(g)}>
                Edit
              </button>
            </div>
          ))
        )}
      </div>

      {editingGoal && (
        <GoalModal
          projectId={project.id}
          projectDueDate={project.due_date}
          goal={editingGoal === "new" ? null : editingGoal}
          onClose={() => setEditingGoal(null)}
          onSaved={() => {
            setEditingGoal(null);
            refresh();
          }}
        />
      )}

      {editingProjectInfo && (
        <ProjectModal
          project={project}
          categories={categories}
          onClose={() => setEditingProjectInfo(false)}
          onSaved={() => {
            setEditingProjectInfo(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ProjectModal({
  project,
  categories,
  onClose,
  onSaved,
}: {
  project?: import("../../types").Project;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [dueDate, setDueDate] = useState(project?.due_date ?? todayLocalISODate());
  const [categoryId, setCategoryId] = useState<string | null>(project?.category_id ?? null);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (project) {
      await api.updateProject({
        id: project.id,
        title: title.trim(),
        description: description || null,
        due_date: dueDate,
        category_id: categoryId,
        status,
      });
    } else {
      await api.createProject({
        title: title.trim(),
        description: description || null,
        due_date: dueDate,
        category_id: categoryId,
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal title={project ? "Edit project" : "New project"} onClose={onClose}>
      <div className="field">
        <label className="field-label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label className="field-label">Description (optional)</label>
        <textarea
          className="textarea"
          rows={2}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="row">
        <div className="field">
          <label className="field-label">Due date</label>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {project && (
          <div className="field">
            <label className="field-label">Status</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>
      <div className="field">
        <label className="field-label">Category</label>
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim()}>
          Save
        </button>
      </div>
    </Modal>
  );
}

function GoalModal({
  projectId,
  projectDueDate,
  goal,
  onClose,
  onSaved,
}: {
  projectId: string;
  projectDueDate: string;
  goal: ProjectGoal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [dueDate, setDueDate] = useState(goal?.due_date ?? todayLocalISODate());
  const [priority, setPriority] = useState<Priority>(goal?.priority ?? "medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exceedsProjectDeadline = dueDate > projectDueDate;

  const save = async () => {
    if (!title.trim() || exceedsProjectDeadline) return;
    setSaving(true);
    setError(null);
    try {
      if (goal) {
        await api.updateProjectGoal({
          id: goal.id,
          title: title.trim(),
          description: description || null,
          due_date: dueDate,
          priority,
          status: goal.status,
        });
      } else {
        await api.createProjectGoal({
          project_id: projectId,
          title: title.trim(),
          description: description || null,
          due_date: dueDate,
          priority,
        });
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!goal) return;
    await api.deleteProjectGoal(goal.id);
    onSaved();
  };

  return (
    <Modal title={goal ? "Edit sub-goal" : "New sub-goal"} onClose={onClose}>
      <div className="field">
        <label className="field-label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label className="field-label">Details (optional)</label>
        <textarea
          className="textarea"
          rows={2}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="row">
        <div className="field">
          <label className="field-label">Due date (by {projectDueDate})</label>
          <input
            className="input"
            type="date"
            value={dueDate}
            max={projectDueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {exceedsProjectDeadline && (
            <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
              Can't be after the project's due date ({projectDueDate}).
            </p>
          )}
        </div>
        <div className="field">
          <label className="field-label">Priority</label>
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <div className="modal-actions">
        {goal && (
          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        )}
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !title.trim() || exceedsProjectDeadline}>
          Save
        </button>
      </div>
    </Modal>
  );
}