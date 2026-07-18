type ButtonVariant = "primary" | "ghost" | "danger";

export function Button({ variant = "ghost", children, className = "", disabled, ...props }: {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
