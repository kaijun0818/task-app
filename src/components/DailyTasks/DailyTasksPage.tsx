import { useEffect, useState } from "react";
import * as api from "../../api/client";
import type { Category, DailyTaskWithStatus } from "../../types";
import Modal from "../common/Modal";
import { CategorySelect } from "../common/Category";
import CompletionHeatmap from "../Heatmap/CompletionHeatmap";
import { playCompletionChime } from "../../utils/sound";

import { todayLocalISODate } from "../../utils/date";

const todayStr = todayLocalISODate;

export default function DailyTasksPage({ categories }: { categories: Category[] }) {
  const [tasks, setTasks] = useState<DailyTaskWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DailyTaskWithStatus | "new" | null>(null);
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const date = todayStr();

  const refresh = () => api.listDailyTasksForDate(date).then(setTasks);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
  const handler = () => setEditing("new");
  window.addEventListener("daybook:new", handler);
  return () => window.removeEventListener("daybook:new", handler);
  }, []);

  const toggle = async (task: DailyTaskWithStatus) => {
    const nowCompleted = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nowCompleted } : t))
    );
    if (nowCompleted) {
      setPoppingId(task.id);
      playCompletionChime();
      setTimeout(() => setPoppingId((cur) => (cur === task.id ? null : cur)), 320);
    }
    await api.toggleDailyTask(task.id, date, nowCompleted);
  };

  const doneCount = tasks.filter((t) => t.completed).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Tasks</h1>
          <p className="page-subtitle">
            {date} · {doneCount}/{tasks.length} done today
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + New daily task
        </button>
      </div>

      <div className="section">
        <div className="card">
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              No daily tasks yet. Add something you want to check off every day.
            </div>
          ) : (
            tasks.map((t) => (
              <div className="task-row" key={t.id}>
                <button
                  className={`checkbox ${t.completed ? "checked" : ""} ${poppingId === t.id ? "pop" : ""}`}
                  onClick={() => toggle(t)}
                  aria-label={t.completed ? "Mark not done" : "Mark done"}
                >
                  {t.completed && (
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
                <span className={`task-title ${t.completed ? "done" : ""}`}>{t.title}</span>
                <button className="icon-btn" onClick={() => setEditing(t)}>
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <p className="section-title">Completion history</p>
        <div className="card">
          <CompletionHeatmap />
        </div>
      </div>

      {editing && (
        <DailyTaskModal
          task={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function DailyTaskModal({
  task,
  categories,
  onClose,
  onSaved,
}: {
  task: DailyTaskWithStatus | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(task?.category_id ?? null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (task) {
      await api.updateDailyTask(task.id, title.trim(), description || null, categoryId, true);
    } else {
      await api.createDailyTask(title.trim(), description || null, categoryId);
    }
    setSaving(false);
    onSaved();
  };

  const remove = async () => {
    if (!task) return;
    await api.deleteDailyTask(task.id);
    onSaved();
  };

  return (
    <Modal title={task ? "Edit daily task" : "New daily task"} onClose={onClose}>
      <div className="field">
        <label className="field-label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label className="field-label">Notes (optional)</label>
        <textarea
          className="textarea"
          rows={2}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label">Category</label>
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>
      <div className="modal-actions">
        {task && (
          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        )}
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