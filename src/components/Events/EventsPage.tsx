import { useEffect, useState } from "react";
import * as api from "../../api/client";
import type { Category, EventItem, RecurringRuleInput } from "../../types";
import Modal from "../common/Modal";
import { CategorySelect, CategoryTag } from "../common/Category";
import RecurrenceField from "../common/RecurrenceField";
import { todayLocalISODate } from "../../utils/date";

export default function EventsPage({ categories }: { categories: Category[] }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventItem | "new" | null>(null);

  const refresh = () => api.listEvents().then(setEvents);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
  const handler = () => setEditing("new");
  window.addEventListener("daybook:new", handler);
  return () => window.removeEventListener("daybook:new", handler);
  }, []);

  const catById = (id: string | null) => categories.find((c) => c.id === id) ?? null;
  const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">{events.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + New event
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">No events yet.</div>
        ) : (
          sorted.map((e) => (
            <div className="list-item" key={e.id}>
              <div className="list-item-main">
                <div className="list-item-title">{e.title}</div>
                <div className="list-item-meta">
                  {e.event_date}
                  {e.event_time ? ` · ${e.event_time}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                  {e.recurring_rule_id ? " · repeats" : ""}
                </div>
              </div>
              <CategoryTag category={catById(e.category_id)} />
              <button className="icon-btn" onClick={() => setEditing(e)}>
                Edit
              </button>
            </div>
          ))
        )}
      </div>

      {editing && (
        <EventModal
          event={editing === "new" ? null : editing}
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

function EventModal({
  event,
  categories,
  onClose,
  onSaved,
}: {
  event: EventItem | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventDate, setEventDate] = useState(event?.event_date ?? todayLocalISODate());
  const [eventTime, setEventTime] = useState(event?.event_time ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(event?.category_id ?? null);
  const [recurrence, setRecurrence] = useState<RecurringRuleInput | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (event) {
      await api.updateEvent({
        id: event.id,
        title: title.trim(),
        description: description || null,
        event_date: eventDate,
        event_time: eventTime || null,
        location: location || null,
        category_id: categoryId,
      });
    } else {
      await api.createEvent({
        title: title.trim(),
        description: description || null,
        event_date: eventDate,
        event_time: eventTime || null,
        location: location || null,
        category_id: categoryId,
        recurring_rule: recurrence,
      });
    }
    setSaving(false);
    onSaved();
  };

  const remove = async () => {
    if (!event) return;
    await api.deleteEvent(event.id);
    onSaved();
  };

  return (
    <Modal title={event ? "Edit event" : "New event"} onClose={onClose}>
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
          <label className="field-label">Date</label>
          <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Time (optional)</label>
          <input className="input" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="field-label">Location (optional)</label>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label">Category</label>
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>
      {!event && <RecurrenceField value={recurrence} onChange={setRecurrence} />}
      <div className="modal-actions">
        {event && (
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
