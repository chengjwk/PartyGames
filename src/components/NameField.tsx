// Name entry row: avatar, text field and reroll dice all sit inside a single
// input-looking box. The avatar and dice are inline rather than siblings of
// the input so there's no nested padding to burn — that's what keeps a
// full-length 24-character name on one line on a narrow phone.

import Avatar from "./Avatar";
import DiceIcon from "./DiceIcon";
import { randomName } from "../lib/randomName";

export default function NameField({
  name,
  setName,
  avatar,
  onSubmit,
  autoFocus = true,
}: {
  name: string;
  setName: (s: string) => void;
  avatar: string;
  onSubmit: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <Avatar id={avatar} size={40} />
      <input
        type="text"
        inputMode="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        autoFocus={autoFocus}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 16,
          padding: "6px 0",
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--fg)",
        }}
      />
      <button
        onClick={() => setName(randomName())}
        aria-label="Random name"
        title="New random name"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted)",
          padding: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <DiceIcon />
      </button>
    </div>
  );
}
