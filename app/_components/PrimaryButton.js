// Path: app/_components/PrimaryButton.js
"use client";

/**
 * PrimaryButton
 * - Supports both link and button behavior.
 * - IMPORTANT: forwards onClick (previous version ignored it, breaking flows).
 */
export default function PrimaryButton({
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
    background: "#111",
    color: "#fff",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    ...style,
  };

  // If href is provided, render as link.
  // Still forward onClick, and block interaction when disabled.
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

  // Otherwise, render as a real button.
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

