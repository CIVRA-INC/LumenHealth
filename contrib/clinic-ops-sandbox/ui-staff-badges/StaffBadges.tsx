import type { StaffRole, StaffStatus } from "./types";

type BadgeProps = {
  children: React.ReactNode;
  bg: string;
  color: string;
  ariaLabel: string;
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "2px 10px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.1,
  border: "1px solid transparent",
};

const Badge = ({ children, bg, color, ariaLabel }: BadgeProps) => (
  <span
    role="status"
    aria-label={ariaLabel}
    style={{
      ...baseStyle,
      background: bg,
      color,
    }}
  >
    {children}
  </span>
);

const roleConfig: Record<
  StaffRole,
  { label: string; bg: string; color: string; ariaLabel: string }
> = {
  CLINIC_ADMIN: {
    label: "Clinic Admin",
    bg: "#dbeafe",
    color: "#1d4ed8",
    ariaLabel: "Role: Clinic Admin",
  },
  DOCTOR: {
    label: "Doctor",
    bg: "#dcfce7",
    color: "#166534",
    ariaLabel: "Role: Doctor",
  },
  NURSE: {
    label: "Nurse",
    bg: "#fef3c7",
    color: "#92400e",
    ariaLabel: "Role: Nurse",
  },
  ASSISTANT: {
    label: "Assistant",
    bg: "#e2e8f0",
    color: "#334155",
    ariaLabel: "Role: Assistant",
  },
  READ_ONLY: {
    label: "Read-Only",
    bg: "#ede9fe",
    color: "#5b21b6",
    ariaLabel: "Role: Read-Only",
  },
};

const statusConfig: Record<
  StaffStatus,
  { label: string; bg: string; color: string; ariaLabel: string }
> = {
  ACTIVE: {
    label: "Active",
    bg: "#dcfce7",
    color: "#166534",
    ariaLabel: "Status: Active",
  },
  INACTIVE: {
    label: "Inactive",
    bg: "#fee2e2",
    color: "#b91c1c",
    ariaLabel: "Status: Inactive",
  },
};

export function RoleBadge({ role }: { role: StaffRole }) {
  const config = roleConfig[role];
  return (
    <Badge bg={config.bg} color={config.color} ariaLabel={config.ariaLabel}>
      {config.label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: StaffStatus }) {
  const config = statusConfig[status];
  return (
    <Badge bg={config.bg} color={config.color} ariaLabel={config.ariaLabel}>
      {config.label}
    </Badge>
  );
}
