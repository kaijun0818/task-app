import { useEffect, useRef, useState } from "react";
import * as api from "../../api/client";
import type { Category } from "../../types";

const SWATCHES = [
  "#e0899b", // sakura pink
  "#8fb79c", // sage
  "#cf5f55", // terracotta
  "#d5a054", // amber
  "#8a9bc4", // dusty blue
  "#b98bc9", // mauve
  "#c9a86a", // ochre
  "#6fb0a8", // teal
  "#d6789a", // rose
  "#9a8f6a", // olive
];

export default function CategoriesPage({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => nameInputRef.current?.focus();
    window.addEventListener("daybook:new", handler);
    return () => window.removeEventListener("daybook:new", handler);
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await api.createCategory(name.trim(), color);
    setName("");
    onChanged();
  };

  const remove = async (id: string) => {
    await api.deleteCategory(id);
    onChanged();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Color tags used across tasks, deadlines and events</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Name</label>
            <input
              className="input"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Academic"
            />
          </div>
          <div style={{ display: "flex", gap: 6, paddingBottom: 8, flexWrap: "wrap", maxWidth: 260 }}>
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: c,
                  border: color === c ? "2px solid var(--text)" : "2px solid transparent",
                }}
              />
            ))}
          </div>
          <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>
            Add
          </button>
        </div>
      </div>

      <div className="card">
        {categories.length === 0 ? (
          <div className="empty-state">No categories yet.</div>
        ) : (
          categories.map((c) => (
            <div className="list-item" key={c.id}>
              <span
                style={{ width: 14, height: 14, borderRadius: 4, background: c.color, flexShrink: 0 }}
              />
              <div className="list-item-main">
                <div className="list-item-title">{c.name}</div>
              </div>
              <button className="icon-btn" onClick={() => remove(c.id)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}