// Shared "Edit profile" modal — rename + change avatar without
// re-joining the room. Originally inline in WordHive's Play.tsx;
// extracted so MathHive and Pollinart can use the same component
// for consistency.
//
// The modal itself doesn't send messages — it surfaces the new
// (name, avatar) via `onSave`. Callers translate that into their
// own protocol's `rename` / `setAvatar` messages and persist to
// localStorage as needed.

import { useState } from "react";
import { AVATARS } from "../lib/avatars";
import Avatar from "./Avatar";
import NameField from "./NameField";

interface EditProfileProps {
  initialName: string;
  initialAvatar: string;
  onCancel: () => void;
  onSave: (name: string, avatar: string) => void;
}

export default function EditProfile({
  initialName,
  initialAvatar,
  onCancel,
  onSave,
}: EditProfileProps) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, avatar);
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 15, 20, 0.85)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 20px",
        overflowY: "auto",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 18,
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Edit profile</h2>
        <NameField name={name} setName={setName} avatar={avatar} onSubmit={save} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              aria-label={`Avatar ${a}`}
              style={{
                background: "transparent",
                padding: 4,
                aspectRatio: "1 / 1",
                borderRadius: 12,
                border:
                  a === avatar ? "3px solid var(--accent)" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <Avatar id={a} />
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              fontSize: 16,
              padding: 14,
              background: "var(--bg-elev)",
              color: "var(--fg)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            style={{ flex: 2, fontSize: 16, padding: 14 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Small inline pencil icon — call site for the "edit" affordance
// on a player row. Exported so each game's PlayerRow can render it
// without duplicating the SVG.
export function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 6l5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
