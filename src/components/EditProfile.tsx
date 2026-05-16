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
import { randomName } from "../lib/randomName";
import Avatar from "./Avatar";

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--bg-elev)",
            borderRadius: 10,
          }}
        >
          <Avatar id={avatar} size={56} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={{ fontSize: 20, padding: 10, flex: 1, minWidth: 0 }}
          />
          <button
            onClick={() => setName(randomName())}
            aria-label="Random name"
            title="New random name"
            style={{
              background: "var(--bg)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DiceIcon />
          </button>
        </div>
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

export function DiceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}
