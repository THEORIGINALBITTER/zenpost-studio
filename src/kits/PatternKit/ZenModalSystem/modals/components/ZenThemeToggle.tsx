import React from "react";

type Theme = "dark" | "light";

interface ZenThemeToggleProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
  labelDark?: string;   // default: "Dark Thema"
  labelLight?: string;  // default: "Light Thema"
  containerStyle?: React.CSSProperties; // optional wrapper overrides
}

export const ZenThemeToggle: React.FC<ZenThemeToggleProps> = ({
  theme,
  onChange,
  labelDark = "Dark Thema",
  labelLight = "Light Thema",
  containerStyle,
}) => {
  const label = theme === "dark" ? labelDark : labelLight;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        ...containerStyle,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          backgroundColor: "transparent",
          border: "1px solid #3A3A3A",
          borderRadius: 6,
          fontFamily: "monospace",
          fontSize: 11,
          color: "#555",
        }}
      >
        <span>{label}</span>

        <button
          type="button"
          onClick={() => onChange("dark")}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: theme === "dark" ? "1px solid #AC8E66" : "1px solid #3A3A3A",
            backgroundColor: theme === "dark" ? "#212121" : "transparent",
            color: theme === "dark" ? "#AC8E66" : "#555",
            cursor: "pointer",
            fontFamily: "monospace",
            boxShadow: theme === "dark" ? "0 2px 6px rgba(0,0,0,0.35)" : "none",
            fontSize: 10,
          }}
        >
          Dark
        </button>

        <button
          type="button"
          onClick={() => onChange("light")}
          style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: theme === "light" ? "1px solid #AC8E66" : "1px solid #3A3A3A",
            backgroundColor: theme === "light" ? "#D9D4C5" : "transparent",
            color: theme === "light" ? "#AC8E66" : "#555",
            cursor: "pointer",
            fontFamily: "monospace",
            boxShadow: theme === "light" ? "0 2px 6px rgba(0,0,0,0.2)" : "none",
            fontSize: 10,
          }}
        >
          Light
        </button>
      </div>
    </div>
  );
};
