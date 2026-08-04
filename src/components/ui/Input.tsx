import { cn } from "@/utils";

const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, style, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={(props as any).id}
          className="text-xs font-medium text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={cn(
            "w-full rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)]",
            "placeholder:text-[var(--color-text-muted)]",
            "focus:outline-none transition-all duration-150",
            "backdrop-blur-xl",
            icon && "pl-9",
            error && "!border-[var(--color-danger)]",
            className,
          )}
          style={{
            ...inputBase,
            fontFamily: 'var(--font-sans)',
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = '1px solid rgba(124,106,247,0.5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.1), inset 0 2px 4px rgba(0,0,0,0.2)';
            e.currentTarget.style.background = 'rgba(124,106,247,0.06)';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            props.onBlur?.(e);
          }}
          aria-invalid={!!error}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, style, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)]",
          "placeholder:text-[var(--color-text-muted)]",
          "focus:outline-none transition-all duration-150 resize-none backdrop-blur-xl",
          className,
        )}
        style={{ ...inputBase, fontFamily: 'var(--font-sans)', ...style }}
        onFocus={(e) => {
          e.currentTarget.style.border = '1px solid rgba(124,106,247,0.5)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.1), inset 0 2px 4px rgba(0,0,0,0.2)';
          e.currentTarget.style.background = 'rgba(124,106,247,0.06)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        }}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <select
        className={cn(
          "w-full rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)]",
          "focus:outline-none transition-all duration-150 cursor-pointer",
          className,
        )}
        style={{ ...inputBase, fontFamily: 'var(--font-sans)' }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: '#13131f' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
