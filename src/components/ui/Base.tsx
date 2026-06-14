import React from "react";

export const Card = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <div id={id} className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl ${className}`}>
    {children}
  </div>
);

export const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  disabled = false,
  className = "",
  id
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: "primary" | "secondary" | "outline" | "danger";
  disabled?: boolean;
  className?: string;
  id?: string;
}) => {
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700",
    outline: "border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${variants[variant]} ${className}`}
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
  id
}: { 
  label?: string; 
  value: string | number; 
  onChange: (val: any) => void; 
  type?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}) => (
  <div id={id} className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
      placeholder={placeholder}
      className="bg-zinc-950 border border-zinc-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm"
    />
  </div>
);

export const SegmentedControl = ({
  options,
  value,
  onChange,
  label,
  id
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: any) => void;
  label?: string;
  id?: string;
}) => (
  <div id={id} className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>}
    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === opt.value 
              ? "bg-zinc-800 text-white shadow-sm" 
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);
