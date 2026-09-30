import type { Frequency, RecurringRuleInput } from "../../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RecurrenceField({
  value,
  onChange,
}: {
  value: RecurringRuleInput | null;
  onChange: (v: RecurringRuleInput | null) => void;
}) {
  const enabled = value !== null;

  const setFrequency = (frequency: Frequency) =>
    onChange({
      frequency,
      interval: value?.interval ?? 1,
      by_weekdays: frequency === "weekly" ? value?.by_weekdays ?? null : null,
      end_date: value?.end_date ?? null,
      occurrence_count: value?.occurrence_count ?? null,
    });

  const toggleWeekday = (day: number) => {
    if (!value) return;
    const current = new Set(
      (value.by_weekdays ?? "").split(",").filter(Boolean).map(Number)
    );
    if (current.has(day)) current.delete(day);
    else current.add(day);
    onChange({ ...value, by_weekdays: Array.from(current).sort().join(",") || null });
  };

  return (
    <div className="field">
      <label className="field-label">Repeats</label>
      <div className="row" style={{ marginBottom: enabled ? 10 : 0 }}>
        <select
          className="select"
          value={enabled ? value!.frequency : ""}
          onChange={(e) =>
            e.target.value === "" ? onChange(null) : setFrequency(e.target.value as Frequency)
          }
        >
          <option value="">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom interval (days)</option>
        </select>
        {enabled && (
          <input
            className="input"
            type="number"
            min={1}
            style={{ maxWidth: 90 }}
            value={value!.interval}
            onChange={(e) => onChange({ ...value!, interval: Math.max(1, Number(e.target.value)) })}
            title="Repeat every N"
          />
        )}
      </div>

      {enabled && value!.frequency === "weekly" && (
        <div className="row" style={{ marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
          {WEEKDAYS.map((label, i) => {
            const active = (value!.by_weekdays ?? "").split(",").includes(String(i));
            return (
              <button
                key={label}
                type="button"
                className="btn"
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  background: active ? "var(--lavender)" : undefined,
                  color: active ? "#fdf6f3" : undefined,
                  borderColor: active ? "var(--lavender)" : undefined,
                }}
                onClick={() => toggleWeekday(i)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {enabled && (
        <div className="row">
          <div className="field">
            <label className="field-label">Ends on (optional)</label>
            <input
              className="input"
              type="date"
              value={value!.end_date ?? ""}
              onChange={(e) => onChange({ ...value!, end_date: e.target.value || null })}
            />
          </div>
          <div className="field">
            <label className="field-label">Or after N occurrences</label>
            <input
              className="input"
              type="number"
              min={1}
              value={value!.occurrence_count ?? ""}
              onChange={(e) =>
                onChange({
                  ...value!,
                  occurrence_count: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
