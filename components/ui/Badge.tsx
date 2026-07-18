type BadgeVariant = "primary" | "success" | "danger" | "warning" | "info" | "muted";

export function Badge({ variant = "primary", children, className = "" }: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>;
}
