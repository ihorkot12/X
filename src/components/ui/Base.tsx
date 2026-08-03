import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  disabled?: boolean;
  className?: string;
  id?: string;
  type?: "button" | "submit";
};

type InputProps = {
  label?: string;
  value: string | number;
  onChange: (val: string | number) => void;
  type?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  min?: number;
  max?: number;
};

type SegmentedControlProps = {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
};

export const Card = ({ children, className = "", id }: CardProps) => (
  <section
    id={id}
    className={`rounded-lg border border-[var(--bbp-border)] bg-[var(--bbp-panel)] p-4 transition-colors duration-150 hover:border-[var(--bbp-border-strong)] sm:p-5 ${className}`}
  >
    {children}
  </section>
);

export const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  id,
  type = "button",
}: ButtonProps) => {
  const variants = {
    primary:
      "border border-[var(--bbp-accent-strong)] bg-[var(--bbp-accent)] text-[#18140d] hover:bg-[var(--bbp-accent-strong)]",
    secondary:
      "border border-[var(--bbp-border)] bg-[var(--bbp-panel-strong)] text-[var(--bbp-text)] hover:border-[var(--bbp-border-strong)] hover:bg-[#272821]",
    outline:
      "border border-[var(--bbp-border)] bg-transparent text-[var(--bbp-muted)] hover:border-[var(--bbp-border-strong)] hover:bg-[var(--bbp-accent-soft)] hover:text-[var(--bbp-text)]",
    danger:
      "border border-[var(--bbp-danger)] bg-[var(--bbp-danger-soft)] text-[#f0aaa2] hover:bg-[rgba(219,125,115,0.2)]",
  };

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-bold leading-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  id,
  min,
  max,
}: InputProps) => (
  <label className={`grid gap-1.5 ${className}`}>
    {label && <span className="text-[11px] font-bold uppercase text-[var(--bbp-muted-strong)]">{label}</span>}
    <input
      id={id}
      type={type}
      min={min}
      max={max}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        onChange(type === "number" ? (nextValue === "" ? "" : Number(nextValue)) : nextValue);
      }}
      placeholder={placeholder}
      className="h-10 rounded-md border border-[var(--bbp-border)] bg-[var(--bbp-panel-soft)] px-3 text-sm text-[var(--bbp-text)] transition-colors duration-150 placeholder:text-[var(--bbp-muted-strong)] focus:border-[var(--bbp-accent-strong)]"
    />
  </label>
);

export const SegmentedControl = ({ options, value, onChange, label, id, disabled = false }: SegmentedControlProps) => (
  <div id={id} className="grid gap-2">
    {label && <span className="text-[11px] font-bold uppercase text-[var(--bbp-muted-strong)]">{label}</span>}
    <div className="flex snap-x gap-1 overflow-x-auto rounded-md border border-[var(--bbp-border)] bg-[var(--bbp-panel-soft)] p-1 [scrollbar-width:thin] sm:grid sm:grid-cols-[repeat(auto-fit,minmax(76px,1fr))] sm:overflow-visible">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-9 min-w-[88px] flex-none snap-start whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-bold leading-tight transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-0 ${
            value === option.value
              ? "border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-accent-strong)]"
              : "border-transparent text-[var(--bbp-muted)] hover:border-[var(--bbp-border)] hover:bg-[var(--bbp-panel-strong)] hover:text-[var(--bbp-text)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
