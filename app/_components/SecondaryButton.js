// Path: app/_components/SecondaryButton.js
"use client";

/**
 * SecondaryButton
 * - Supports both link and button behavior.
 * - IMPORTANT: forwards onClick (previous version ignored it, breaking actions).
 */
export default function SecondaryButton({
  href,
  children,
  style,
  onClick,
  disabled = false,
  type = "button",
  target,
  rel,
  ariaLabel,
}) {
  const baseStyle = {
    display: "inline-block",
    padding: "10px 12px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 800,
    border: "2px solid #111",
    color: "#111",
    background: "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    ...style,
  };

  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          if (typeof onClick === "function") onClick(e);
        }}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
        aria-disabled={disabled ? "true" : "false"}
        style={baseStyle}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={(e) => {
        if (disabled) return;
        if (typeof onClick === "function") onClick(e);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      style={baseStyle}
    >
      {children}
    </button>
  );
}
