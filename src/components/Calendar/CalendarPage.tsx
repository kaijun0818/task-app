import { useEffect, useMemo, useState } from "react";
import * as api from "../../api/client";
import type {
  Category,
  DeadlineOccurrence,
  EventOccurrence,
  ProjectGoalWithProject,
  ProjectWithProgress,
} from "../../types";
import { CategoryTag } from "../common/Category";
import Modal from "../common/Modal";
import { toLocalISODate } from "../../utils/date";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
}

type ItemKind = "deadline" | "event" | "project" | "goal";

const KIND_ICON: Record<ItemKind, string> = {
  deadline: "◆",
  event: "●",
  project: "▲",
  goal: "✦",
};

const KIND_COLOR: Record<ItemKind, string> = {
  deadline: "#a8483f",
  event: "#4d7a5e",
  project: "#a14f65",
  goal: "#8f6a2e",
};

export default function CalendarPage({ categories }: { categories: Category[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [deadlines, setDeadlines] = useState<DeadlineOccurrence[]>([]);
  const [events, setEvents] = useState<EventOccurrence[]>([]);
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [goals, setGoals] = useState<ProjectGoalWithProject[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const gridStart = useMemo(() => {
    const d = new Date(cursor);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [cursor]);

  const gridEnd = useMemo(() => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + 41); // 6 full weeks
    return d;
  }, [gridStart]);

  useEffect(() => {
    const start = toLocalISODate(gridStart);
    const end = toLocalISODate(gridEnd);
    api.listDeadlinesInRange(start, end).then(setDeadlines);
    api.listEventsInRange(start, end).then(setEvents);
    api.listProjectsInRange(start, end).then(setProjects);
    api.listProjectGoalsInRange(start, end).then(setGoals);
  }, [gridStart, gridEnd]);

  // q = previous month, e = next month (skipped while typing in a field).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "q" || e.key === "Q") {
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
      } else if (e.key === "e" || e.key === "E") {
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const catById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  const cells = useMemo(() => {
    const out: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      out.push(new Date(d));
    }
    return out;
  }, [gridStart, gridEnd]);

  const todayISO = toLocalISODate(new Date());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const itemsFor = (iso: string) => ({
    deadlines: deadlines.filter((d) => d.occurrence_date === iso),
    events: events.filter((e) => e.occurrence_date === iso),
    projects: projects.filter((p) => p.due_date === iso),
    goals: goals.filter((g) => g.due_date === iso),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">
            {monthLabel} · <span style={{ opacity: 0.7 }}>q / e to change month</span>
          </p>
        </div>
        <div className="calendar-nav">
          <span className="page-subtitle" style={{ marginTop: 0, marginRight: 4 }}>
            {(["deadline", "event", "project", "goal"] as ItemKind[]).map((k) => (
              <span key={k}>
                <span style={{ color: KIND_COLOR[k] }}>{KIND_ICON[k]}</span> {k[0].toUpperCase() + k.slice(1)}
                {k !== "goal" ? " \u00A0 " : ""}
              </span>
            ))}
          </span>
          <button
            className="btn"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            ← Prev
          </button>
          <button className="btn" onClick={() => setCursor(new Date())}>
            Today
          </button>
          <button
            className="btn"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            Next →
          </button>
        </div>
      </div>

      <div className="calendar-grid" style={{ marginBottom: 6 }}>
        {WEEKDAY_LABELS.map((w) => (
          <div className="calendar-weekday" key={w}>
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((d) => {
          const iso = toLocalISODate(d);
          const outside = d.getMonth() !== cursor.getMonth();
          const { deadlines: dl, events: ev, projects: pr, goals: gl } = itemsFor(iso);
          const shown = [
            ...dl.map((item) => ({ kind: "deadline" as const, title: item.title })),
            ...ev.map((item) => ({ kind: "event" as const, title: item.title })),
            ...pr.map((item) => ({ kind: "project" as const, title: item.title })),
            ...gl.map((item) => ({ kind: "goal" as const, title: item.title })),
          ];
          return (
            <button
              key={iso}
              className={`calendar-cell ${outside ? "outside" : ""} ${iso === todayISO ? "today" : ""}`}
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelectedDate(iso)}
            >
              <span className="calendar-date">{d.getDate()}</span>
              {shown.slice(0, 2).map((s, i) => (
                <span key={i} className={`calendar-chip calendar-chip-${s.kind}`}>
                  <span className="calendar-chip-icon">{KIND_ICON[s.kind]}</span>
                  {s.title}
                </span>
              ))}
              {shown.length > 2 && (
                <span className="calendar-date">+{shown.length - 2} more</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <DayDetail
          date={selectedDate}
          items={itemsFor(selectedDate)}
          catById={catById}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

function DayDetail({
  date,
  items,
  catById,
  onClose,
}: {
  date: string;
  items: {
    deadlines: DeadlineOccurrence[];
    events: EventOccurrence[];
    projects: ProjectWithProgress[];
    goals: ProjectGoalWithProject[];
  };
  catById: (id: string | null) => Category | null;
  onClose: () => void;
}) {
  const nothing =
    items.deadlines.length === 0 &&
    items.events.length === 0 &&
    items.projects.length === 0 &&
    items.goals.length === 0;

  return (
    <Modal title={date} onClose={onClose}>
      {nothing && <div className="empty-state">Nothing scheduled.</div>}
      {items.deadlines.map((d) => (
        <div className="list-item" key={`d-${d.id}-${d.occurrence_date}`}>
          <div className="list-item-main">
            <div className="list-item-title">{d.title}</div>
            <div className="list-item-meta">Deadline · {d.priority} priority</div>
          </div>
          <CategoryTag category={catById(d.category_id)} />
        </div>
      ))}
      {items.projects.map((p) => (
        <div className="list-item" key={`p-${p.id}`}>
          <div className="list-item-main">
            <div className="list-item-title">{p.title}</div>
            <div className="list-item-meta">
              Project · {p.completed_goals}/{p.total_goals} sub-goals done
            </div>
          </div>
          <CategoryTag category={catById(p.category_id)} />
        </div>
      ))}
      {items.goals.map((g) => (
        <div className="list-item" key={`g-${g.id}`}>
          <div className="list-item-main">
            <div className="list-item-title">{g.title}</div>
            <div className="list-item-meta">
              Sub-goal · {g.priority} priority · part of {g.project_title}
            </div>
          </div>
        </div>
      ))}
      {items.events.map((e) => (
        <div className="list-item" key={`e-${e.id}-${e.occurrence_date}`}>
          <div className="list-item-main">
            <div className="list-item-title">{e.title}</div>
            <div className="list-item-meta">
              Event{e.event_time ? ` · ${e.event_time}` : ""}
              {e.location ? ` · ${e.location}` : ""}
            </div>
          </div>
          <CategoryTag category={catById(e.category_id)} />
        </div>
      ))}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}