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
  <section id={id} className={`border border-zinc-800 bg-zinc-950/80 p-5 shadow-sm ${className}`}>
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
    primary: "bg-white text-black hover:bg-zinc-200",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700",
    outline: "border border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white",
    danger: "bg-red-700 text-white hover:bg-red-800",
  };

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
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
    {label && <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>}
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
      className="h-10 border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-400"
    />
  </label>
);

export const SegmentedControl = ({ options, value, onChange, label, id, disabled = false }: SegmentedControlProps) => (
  <div id={id} className="grid gap-2">
    {label && <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>}
    <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-1 border border-zinc-800 bg-black p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`min-h-9 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            value === option.value ? "bg-white text-black" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
