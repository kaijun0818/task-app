import { useEffect, useState } from "react";
import * as api from "../../api/client";
import type { HeatmapDay } from "../../types";
import { toLocalISODate } from "../../utils/date";

function intensity(day: HeatmapDay | undefined): number {
  if (!day || day.total === 0) return 0;
  const ratio = day.completed / day.total;
  if (ratio === 0) return 0;
  if (ratio < 0.34) return 1;
  if (ratio < 0.67) return 2;
  if (ratio < 1) return 3;
  return 4;
}

const LEVEL_COLOR = ["var(--surface-raised)", "#f2c3cd", "#e8a0b0", "#dd7d92", "var(--lavender)"];

export default function CompletionHeatmap() {
  const [days, setDays] = useState<Map<string, HeatmapDay>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 364);
    api
      .getCompletionHeatmap(toLocalISODate(start), toLocalISODate(end))
      .then((rows) => setDays(new Map(rows.map((r) => [r.date, r]))))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading…</div>;
  if (days.size === 0)
    return (
      <div className="empty-state">
        No completion history yet — check off a daily task to start building this up.
      </div>
    );

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 364);
  // Align the grid to start on a Sunday so weekday rows line up.
  start.setDate(start.getDate() - start.getDay());

  const cells: { date: string; level: number }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toLocalISODate(d);
    cells.push({ date: iso, level: intensity(days.get(iso)) });
  }

  return (
    <div>
      <div className="heatmap-grid">
        {cells.map((c) => (
          <div
            key={c.date}
            className="heatmap-cell"
            title={`${c.date}: ${days.get(c.date)?.completed ?? 0}/${days.get(c.date)?.total ?? 0} done`}
            style={{ background: LEVEL_COLOR[c.level] }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
        <span className="page-subtitle" style={{ marginTop: 0 }}>
          Less
        </span>
        {LEVEL_COLOR.map((color, i) => (
          <div key={i} className="heatmap-cell" style={{ background: color }} />
        ))}
        <span className="page-subtitle" style={{ marginTop: 0 }}>
          More
        </span>
      </div>
    </div>
  );
}
