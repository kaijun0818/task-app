# Daybook

A Windows desktop app for daily task tracking, deadlines, and events — built with Tauri (Rust) + React + SQLite.

## Features

- **Daily tasks** that reset automatically every day (completion is logged per-date, not on the task itself)
- **Deadlines** and **events**, full CRUD, with recurrence (daily / weekly on specific weekdays / monthly / custom interval)
- **Unified "Today" dashboard** — daily checklist + deadlines/events due within 7 days
- **Completion heatmap** — a year of daily-task completion history, GitHub-contributions style
- **Calendar view** — month grid with recurring deadlines/events expanded onto the right days
- **Color-coded categories** shared across all three entity types
- All data stored locally in SQLite (no account, no network calls)

## Prerequisites

You'll need these installed on your Windows machine:

1. **Node.js** (v18+) — https://nodejs.org
2. **Rust** — https://www.rust-lang.org/tools/install (installs `cargo`)
3. **Tauri prerequisites for Windows** — Microsoft C++ Build Tools + WebView2 (WebView2 ships with Windows 11 by default). Full list: https://v2.tauri.app/start/prerequisites/

## Setup

```bash
npm install
```

## Run in development

```bash
npm run tauri dev
```

This starts the Vite dev server and opens the app in a native window with hot reload.

## Build the Windows installer

```bash
npm run tauri build
```

Output installers (`.msi` and `.exe`/NSIS) land in `src-tauri/target/release/bundle/`.

## Notes

- **Icons are placeholders.** `src-tauri/icons/` contains generated lavender rounded-square icons so the project builds out of the box. Swap them for real artwork with `npx tauri icon path/to/your-logo.png` (regenerates every required size).
- **The Rust backend was written but not compiled** in the environment this was built in (no Rust toolchain available there) — it follows standard Tauri 2 + rusqlite patterns, but give `npm run tauri dev` a run first and expect to fix any small compile issues that surface.
- The SQLite database is created automatically on first run, in your Windows per-user app data folder (`%APPDATA%\com.kj.daybook\daybook.sqlite3`).
- Descoped for this version (can revisit anytime): Windows toast reminders, system tray quick-add, auto-start with Windows.

## Project structure

```
task-app/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── db.rs               # SQLite connection + schema migrations
│   │   ├── models/             # Data structs (Category, DailyTask, Deadline, Event, RecurringRule)
│   │   ├── commands/            # Tauri commands — CRUD + dashboard aggregation
│   │   ├── recurrence.rs        # Expands recurring rules into concrete occurrence dates
│   │   └── scheduler.rs         # Hourly background sweep for overdue deadlines
│   └── tauri.conf.json
├── src/                 # React frontend
│   ├── api/client.ts            # Typed wrapper around every Tauri command
│   ├── types/                   # Shared TypeScript types
│   └── components/
│       ├── Dashboard/           # "Today" unified view
│       ├── DailyTasks/          # Checklist page
│       ├── Deadlines/           # Deadline CRUD
│       ├── Events/              # Event CRUD
│       ├── Calendar/            # Month grid view
│       ├── Categories/          # Tag management
│       ├── Heatmap/             # Completion history heatmap
│       └── common/              # Modal, category picker, recurrence field
└── package.json
```
