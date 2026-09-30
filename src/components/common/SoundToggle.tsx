import { useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "../../utils/sound";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled());

  const toggle = () => {
    const next = !enabled;
    setSoundEnabled(next);
    setEnabled(next);
  };

  return (
    <button
      className="nav-item"
      onClick={toggle}
      style={{ marginTop: "auto", fontSize: 13, color: "var(--text-muted)" }}
      title={enabled ? "Sound on completion: On" : "Sound on completion: Off"}
    >
      {enabled ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
        </svg>
      )}
      {enabled ? "Sound on" : "Sound off"}
    </button>
  );
}