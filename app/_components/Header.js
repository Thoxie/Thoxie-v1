// path: /app/_components/Header.js
import { ROUTES } from "../_config/routes";
import StateBadge from "./StateBadge";

export default function Header() {
  return (
    <header
      style={{
        backgroundColor: "#f15a22",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <img
          src="/thoxie-logo.png"
          alt="Thoxie"
          style={{
            height: "64px",
            width: "auto",
            display: "block",
          }}
        />
        <StateBadge />
      </div>

      <nav style={{ display: "flex", gap: "12px" }}>
        <NavLink href={ROUTES.home}>Home</NavLink>
        <NavLink href={ROUTES.howItWorks}>How It Works</NavLink>
        <NavLink href={ROUTES.start}>Start</NavLink>
        <NavLink href={ROUTES.dashboard}>Da
