import { useEffect, useState } from "react";
import * as api from "../../api/client";
import type { Category, Deadline, Priority, RecurringRuleInput } from "../../types";
import { todayLocalISODate } from "../../utils/date";
import Modal from "../common/Modal";
import { CategorySelect, CategoryTag } from "../common/Category";
import RecurrenceField from "../common/RecurrenceField";
import { playCompletionChime } from "../../utils/sound";

export default function DeadlinesPage({ categories }: { categories: Category[] }) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Deadline | "new" | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [sortBy, setSortBy] = useState<"priority" | "due_date">("priority");
  const [poppingId, setPoppingId] = useState<string | null>(null);

  const refresh = () => api.listDeadlines().then(setDeadlines);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setEditing("new");
    window.addEventListener("daybook:new", handler);
    return () => window.removeEventListener("daybook:new", handler);
  }, []);

  const catById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  const markComplete = async (d: Deadline) => {
    const nowCompleting = d.status !== "completed";
    if (nowCompleting) {
      setPoppingId(d.id);
      playCompletionChime();
      setTimeout(() => setPoppingId((cur) => (cur === d.id ? null : cur)), 320);
    }
    await api.updateDeadline({
      id: d.id,
      title: d.title,
      description: d.description,
      due_date: d.due_date,
      priority: d.priority,
      category_id: d.category_id,
      status: nowCompleting ? "completed" : "pending",
    });
    refresh();
  };

  const clearCompleted = async () => {
    const completedIds = deadlines.filter((d) => d.status === "completed").map((d) => d.id);
    await Promise.all(completedIds.map((id) => api.deleteDeadline(id)));
    refresh();
  };

  const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

  const filtered = deadlines.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (categoryFilter !== "all" && d.category_id !== categoryFilter) return false;
    if (priorityFilter !== "all" && d.priority !== priorityFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "priority") {
      const diff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      return diff !== 0 ? diff : a.due_date.localeCompare(b.due_date);
    }
    return a.due_date.localeCompare(b.due_date);
  });

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Deadlines</h1>
          <p className="page-subtitle">
            {sorted.length} of {deadlines.length} shown
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + New deadline
        </button>
      </div>

      {deadlines.some((d) => d.status === "completed") && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="btn" onClick={clearCompleted}>
            Clear completed
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 130 }}>
            <label className="field-label">Status</label>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 130 }}>
            <label className="field-label">Category</label>
            <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 130 }}>
            <label className="field-label">Priority</label>
            <select className="select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 150 }}>
            <label className="field-label">Sort by</label>
            <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="priority">Priority</option>
              <option value="due_date">Due date</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              className="btn"
              style={{ alignSelf: "flex-end" }}
              onClick={() => {
                setStatusFilter("all");
                setCategoryFilter("all");
                setPriorityFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            {deadlines.length === 0 ? "No deadlines yet." : "Nothing matches these filters."}
          </div>
        ) : (
          sorted.map((d) => (
            <div className="list-item" key={d.id}>
              <button
                className={`checkbox ${d.status === "completed" ? "checked" : ""} ${poppingId === d.id ? "pop" : ""}`}
                onClick={() => markComplete(d)}
                aria-label="Toggle complete"
              >
                {d.status === "completed" && (
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
                <div className="list-item-title">{d.title}</div>
                <div className="list-item-meta">
                  {d.due_date}
                  {d.recurring_rule_id ? " · repeats" : ""}
                  {d.status === "overdue" ? " · overdue" : ""}
                </div>
              </div>
              <span className={`tag priority-${d.priority}`}>{d.priority}</span>
              <CategoryTag category={catById(d.category_id)} />
              <button className="icon-btn" onClick={() => setEditing(d)}>
                Edit
              </button>
            </div>
          ))
        )}
      </div>

      {editing && (
        <DeadlineModal
          deadline={editing === "new" ? null : editing}
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

function DeadlineModal({
  deadline,
  categories,
  onClose,
  onSaved,
}: {
  deadline: Deadline | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(deadline?.title ?? "");
  const [description, setDescription] = useState(deadline?.description ?? "");
  const [dueDate, setDueDate] = useState(deadline?.due_date ?? todayLocalISODate());
  const [priority, setPriority] = useState<Priority>(deadline?.priority ?? "medium");
  const [categoryId, setCategoryId] = useState<string | null>(deadline?.category_id ?? null);
  const [recurrence, setRecurrence] = useState<RecurringRuleInput | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (deadline) {
      await api.updateDeadline({
        id: deadline.id,
        title: title.trim(),
        description: description || null,
        due_date: dueDate,
        priority,
        category_id: categoryId,
        status: deadline.status,
      });
    } else {
      await api.createDeadline({
        title: title.trim(),
        description: description || null,
        due_date: dueDate,
        priority,
        category_id: categoryId,
        recurring_rule: recurrence,
      });
    }
    setSaving(false);
    onSaved();
  };

  const remove = async () => {
    if (!deadline) return;
    await api.deleteDeadline(deadline.id);
    onSaved();
  };

  return (
    <Modal title={deadline ? "Edit deadline" : "New deadline"} onClose={onClose}>
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
      <div className="row">
        <div className="field">
          <label className="field-label">Due date</label>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Priority</label>
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field-label">Category</label>
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>
      {!deadline && <RecurrenceField value={recurrence} onChange={setRecurrence} />}
      <div className="modal-actions">
        {deadline && (
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