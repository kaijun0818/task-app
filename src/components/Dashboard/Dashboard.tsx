import { useEffect, useState } from "react";
import * as api from "../../api/client";
import type { Category, DashboardData, Priority } from "../../types";
import { CategoryTag } from "../common/Category";
import { playCompletionChime } from "../../utils/sound";

const SECTION_ICONS = {
  tasks: "M9 11l3 3L22 4M3 12v6a2 2 0 0 0 2 2h6M3 6v0a2 2 0 0 1 2-2h9",
  deadlines: "M12 2v10l6 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  events: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
};

function SectionIcon({ path }: { path: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="empty-state-rich">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <p>{message}</p>
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : done / total;
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke="var(--lavender)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 42 42)"
        style={{ transition: "stroke-dashoffset 400ms ease" }}
      />
      <text x="42" y="47" textAnchor="middle" fontSize="17" fontFamily="var(--font-mono)" fill="var(--text)">
        {total === 0 ? "–" : `${done}/${total}`}
      </text>
    </svg>
  );
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Winding down?";
}

function progressLine(done: number, total: number): string {
  if (total === 0) return "Add a daily task to get started.";
  if (done === total) return "All done for today — nice work.";
  if (done === 0) return "Nothing checked off yet — let's go.";
  return done / total >= 0.5 ? "More than halfway there." : "Making progress.";
}

type UpcomingKind = "deadline" | "project" | "goal";

interface UpcomingItem {
  id: string;
  title: string;
  due_date: string;
  kind: UpcomingKind;
  priority?: Priority;
  overdue?: boolean;
  projectTitle?: string;
}

function KindTag({ kind }: { kind: UpcomingKind }) {
  if (kind === "project") return <span className="tag" style={{ color: "var(--lavender)" }}>project</span>;
  if (kind === "goal") return <span className="tag" style={{ color: "var(--warning)" }}>goal</span>;
  return null;
}

export default function Dashboard({ categories }: { categories: Category[] }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [poppingId, setPoppingId] = useState<string | null>(null);

  const refresh = () => api.getDashboard().then(setData);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const catById = (id: string | null) => categories.find((c) => c.id === id) ?? null;

  const toggle = async (taskId: string, completed: boolean) => {
    if (!data) return;
    const nowCompleted = !completed;
    setData({
      ...data,
      daily_tasks: data.daily_tasks.map((t) => (t.id === taskId ? { ...t, completed: nowCompleted } : t)),
    });
    if (nowCompleted) {
      setPoppingId(taskId);
      playCompletionChime();
      setTimeout(() => setPoppingId((cur) => (cur === taskId ? null : cur)), 320);
    }
    await api.toggleDailyTask(taskId, data.date, nowCompleted);
  };

  if (loading || !data) return <div className="empty-state">Loading…</div>;

  const doneCount = data.daily_tasks.filter((t) => t.completed).length;
  const totalCount = data.daily_tasks.length;
  const hour = new Date().getHours();

  const dueSoon: UpcomingItem[] = [
    ...data.upcoming_deadlines.map((d) => ({
      id: `deadline-${d.id}`,
      title: d.title,
      due_date: d.due_date,
      kind: "deadline" as const,
      priority: d.priority,
      overdue: d.status === "overdue",
    })),
    ...data.upcoming_projects.map((p) => ({
      id: `project-${p.id}`,
      title: p.title,
      due_date: p.due_date,
      kind: "project" as const,
    })),
    ...data.upcoming_project_goals.map((g) => ({
      id: `goal-${g.id}`,
      title: g.title,
      due_date: g.due_date,
      kind: "goal" as const,
      priority: g.priority,
      projectTitle: g.project_title,
    })),
  ].sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{greetingFor(hour)}, KJ</h1>
          <p className="page-subtitle">
            {data.date} · {progressLine(doneCount, totalCount)}
          </p>
        </div>
      </div>

      <div className="card dashboard-hero">
        <ProgressRing done={doneCount} total={totalCount} />
        <div>
          <div className="dashboard-hero-title">Today's daily tasks</div>
          <div className="dashboard-hero-sub">
            {totalCount === 0 ? "Nothing set up yet" : `${doneCount} of ${totalCount} checked off`}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          <div className="section">
            <p className="section-title-row">
              <SectionIcon path={SECTION_ICONS.tasks} />
              Daily tasks
            </p>
            <div className="card">
              {data.daily_tasks.length === 0 ? (
                <EmptyState icon={SECTION_ICONS.tasks} message="No daily tasks set up yet." />
              ) : (
                data.daily_tasks.map((t) => (
                  <div className="task-row" key={t.id}>
                    <button
                      className={`checkbox ${t.completed ? "checked" : ""} ${poppingId === t.id ? "pop" : ""}`}
                      onClick={() => toggle(t.id, t.completed)}
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
                    <CategoryTag category={catById(t.category_id)} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="section">
            <p className="section-title-row">
              <SectionIcon path={SECTION_ICONS.deadlines} />
              Due within 7 days
            </p>
            <div className="card">
              {dueSoon.length === 0 ? (
                <EmptyState icon={SECTION_ICONS.deadlines} message="Nothing due soon." />
              ) : (
                dueSoon.map((item) => (
                  <div className="list-item" key={item.id}>
                    <div className="list-item-main">
                      <div className="list-item-title">{item.title}</div>
                      <div className="list-item-meta">
                        {item.due_date}
                        {item.overdue ? " · overdue" : ""}
                        {item.projectTitle ? ` · part of ${item.projectTitle}` : ""}
                      </div>
                    </div>
                    {item.priority && <span className={`tag priority-${item.priority}`}>{item.priority}</span>}
                    <KindTag kind={item.kind} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <p className="section-title-row">
              <SectionIcon path={SECTION_ICONS.events} />
              Events within 1 month
            </p>
            <div className="card">
              {data.upcoming_events.length === 0 ? (
                <EmptyState icon={SECTION_ICONS.events} message="Nothing coming up." />
              ) : (
                data.upcoming_events.map((e) => (
                  <div className="list-item" key={e.id}>
                    <div className="list-item-main">
                      <div className="list-item-title">{e.title}</div>
                      <div className="list-item-meta">
                        {e.event_date}
                        {e.event_time ? ` · ${e.event_time}` : ""}
                      </div>
                    </div>
                    <CategoryTag category={catById(e.category_id)} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}