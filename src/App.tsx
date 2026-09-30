import { useEffect, useState } from "react";
import * as api from "./api/client";
import type { Category } from "./types";
import Dashboard from "./components/Dashboard/Dashboard";
import DailyTasksPage from "./components/DailyTasks/DailyTasksPage";
import DeadlinesPage from "./components/Deadlines/DeadlinesPage";
import EventsPage from "./components/Events/EventsPage";
import CalendarPage from "./components/Calendar/CalendarPage";
import ProjectsPage from "./components/Projects/ProjectsPage";
import CategoriesPage from "./components/Categories/CategoriesPage";
import SoundToggle from "./components/common/SoundToggle";

type Page = "dashboard" | "daily" | "deadlines" | "events" | "projects" | "calendar" | "categories";

function Icon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const ICONS: Record<Page, string> = {
  dashboard: "M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10",
  daily: "M9 11l3 3L22 4M3 12v6a2 2 0 0 0 2 2h6M3 6v0a2 2 0 0 1 2-2h9",
  deadlines: "M12 2v10l6 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  events: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  projects: "M20 7h-9M14 17H5M17 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 13a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 3v10M17 7v14",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01",
  categories: "M20.6 12l-8-8H4v8.6l8 8a2 2 0 0 0 2.8 0l5.8-5.8a2 2 0 0 0 0-2.8zM7 7h.01",
};

const NAV: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Today" },
  { id: "daily", label: "Daily Tasks" },
  { id: "deadlines", label: "Deadlines" },
  { id: "events", label: "Events" },
  { id: "projects", label: "Projects" },
  { id: "calendar", label: "Calendar" },
  { id: "categories", label: "Categories" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [categories, setCategories] = useState<Category[]>([]);

  const refreshCategories = () => api.listCategories().then(setCategories);

  useEffect(() => {
    refreshCategories();
  }, []);

  // Global shortcuts: Ctrl+1-7 switch tabs, Ctrl+T asks the current page to
  // open its "new" modal (each page listens for this itself). Skipped
  // entirely while typing in a field so shortcuts never hijack form input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      if (isTyping) return;
      if (!e.ctrlKey) return;

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("daybook:new"));
        return;
      }

      const idx = Number(e.key);
      if (Number.isInteger(idx) && idx >= 1 && idx <= NAV.length) {
        e.preventDefault();
        setPage(NAV[idx - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-brand">
          Day<span>book</span>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)}
          >
            <Icon path={ICONS[n.id]} />
            {n.label}
          </button>
        ))}
        <SoundToggle />
      </nav>
      <main className="main">
        {page === "dashboard" && <Dashboard categories={categories} />}
        {page === "daily" && <DailyTasksPage categories={categories} />}
        {page === "deadlines" && <DeadlinesPage categories={categories} />}
        {page === "events" && <EventsPage categories={categories} />}
        {page === "projects" && <ProjectsPage categories={categories} />}
        {page === "calendar" && <CalendarPage categories={categories} />}
        {page === "categories" && (
          <CategoriesPage categories={categories} onChanged={refreshCategories} />
        )}
      </main>
    </div>
  );
}