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
    className={`rounded-lg border border-[var(--bbp-border)] bg-[linear-gradient(180deg,rgba(14,20,27,0.96),rgba(8,12,17,0.98))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.32)] ring-1 ring-white/[0.04] transition duration-200 hover:border-[var(--bbp-border-strong)] ${className}`}
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
      "border border-[#c8f4ff]/45 bg-[linear-gradient(180deg,#e7fbff,#97e3ff)] text-[#071118] shadow-[0_14px_34px_rgba(84,200,255,0.22)] hover:brightness-105",
    secondary:
      "border border-[var(--bbp-border)] bg-[rgba(12,19,26,0.9)] text-[var(--bbp-text)] hover:border-[var(--bbp-border-strong)] hover:bg-[rgba(16,25,35,0.96)]",
    outline:
      "border border-[var(--bbp-border)] bg-[rgba(7,10,14,0.58)] text-[var(--bbp-muted)] hover:border-[var(--bbp-border-strong)] hover:bg-[rgba(12,18,24,0.85)] hover:text-[var(--bbp-text)]",
    danger: "border border-[rgba(255,128,139,0.32)] bg-[rgba(255,128,139,0.12)] text-[#ffd8dc] hover:bg-[rgba(255,128,139,0.18)]",
  };

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
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
    {label && <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bbp-muted-strong)]">{label}</span>}
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
      className="h-11 rounded-md border border-[var(--bbp-border)] bg-[rgba(7,11,15,0.9)] px-3 text-sm text-[var(--bbp-text)] outline-none transition placeholder:text-[var(--bbp-muted-strong)] focus:border-[var(--bbp-accent-strong)] focus:ring-2 focus:ring-[var(--bbp-accent-ring)]"
    />
  </label>
);

export const SegmentedControl = ({ options, value, onChange, label, id, disabled = false }: SegmentedControlProps) => (
  <div id={id} className="grid gap-2">
    {label && <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bbp-muted-strong)]">{label}</span>}
    <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-1 rounded-lg border border-[var(--bbp-border)] bg-[rgba(7,10,14,0.76)] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            value === option.value
              ? "border border-[var(--bbp-border-strong)] bg-[var(--bbp-accent-soft)] text-[var(--bbp-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "text-[var(--bbp-muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--bbp-text)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
