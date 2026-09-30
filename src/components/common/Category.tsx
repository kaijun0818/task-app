import type { Category } from "../../types";

export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <select
      className="select"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">No category</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function CategoryTag({ category }: { category?: Category | null }) {
  if (!category) return null;
  return (
    <span className="tag" style={{ borderColor: category.color, color: category.color }}>
      {category.name}
    </span>
  );
}
