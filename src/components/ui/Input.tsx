import { cn } from "@/utils";
import React from "react";

const inputBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      required,
      helperText,
      className,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={(props as any).id}
            className="text-sm font-semibold text-[var(--color-text-primary)]"
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none",
                disabled
                  ? "text-[var(--color-text-muted)]"
                  : "text-[var(--color-accent)]",
              )}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full h-[50px] rounded-[14px] px-4 text-sm text-[var(--color-text-primary)]",
              "placeholder:text-[rgba(255,255,255,0.35)]",
              "focus:outline-none transition-all duration-200",
              "backdrop-blur-xl",
              icon && "pl-11",
              error && "!border-red-400",
              disabled &&
                "!bg-[rgba(255,255,255,0.02)] !text-[var(--color-text-muted)] cursor-not-allowed opacity-60",
              className,
            )}
            style={{
              ...inputBase,
              fontFamily: "var(--font-sans)",
              ...style,
            }}
            onFocus={(e) => {
              if (!disabled) {
                e.currentTarget.style.border = "2px solid rgba(59,130,246,0.6)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 4px rgba(59,130,246,0.15), inset 0 2px 4px rgba(0,0,0,0.2)";
                e.currentTarget.style.background = "rgba(59,130,246,0.06)";
              }
              props.onFocus?.(e as any);
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = error
                ? "2px solid rgba(248,113,113,0.5)"
                : "1px solid rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow =
                "inset 0 2px 4px rgba(0,0,0,0.2)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              props.onBlur?.(e as any);
            }}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-medium text-red-400 mt-1">✕ {error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-text-muted)]">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      required,
      helperText,
      className,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full min-h-[120px] rounded-[14px] px-4 py-3 text-sm text-[var(--color-text-primary)]",
            "placeholder:text-[rgba(255,255,255,0.35)]",
            "focus:outline-none transition-all duration-200 resize-none backdrop-blur-xl",
            error && "!border-red-400",
            disabled &&
              "!bg-[rgba(255,255,255,0.02)] !text-[var(--color-text-muted)] cursor-not-allowed opacity-60",
            className,
          )}
          style={{ ...inputBase, fontFamily: "var(--font-sans)", ...style }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.border = "2px solid rgba(59,130,246,0.6)";
              e.currentTarget.style.boxShadow =
                "0 0 0 4px rgba(59,130,246,0.15), inset 0 2px 4px rgba(0,0,0,0.2)";
              e.currentTarget.style.background = "rgba(59,130,246,0.06)";
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = error
              ? "2px solid rgba(248,113,113,0.5)"
              : "1px solid rgba(255,255,255,0.08)";
            e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.2)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
          {...props}
        />
        {error && (
          <p className="text-xs font-medium text-red-400 mt-1">✕ {error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-text-muted)]">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      required,
      helperText,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full h-[50px] rounded-[14px] px-4 text-sm text-[var(--color-text-primary)]",
              "focus:outline-none transition-all duration-200 cursor-pointer appearance-none",
              error && "!border-red-400",
              disabled &&
                "!bg-[rgba(255,255,255,0.02)] !text-[var(--color-text-muted)] cursor-not-allowed opacity-60",
              className,
            )}
            style={{
              ...inputBase,
              fontFamily: "var(--font-sans)",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "12px",
              paddingRight: "36px",
            }}
            onFocus={(e) => {
              if (!disabled) {
                e.currentTarget.style.border = "2px solid rgba(59,130,246,0.6)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 4px rgba(59,130,246,0.15), inset 0 2px 4px rgba(0,0,0,0.2)";
                e.currentTarget.style.background = "rgba(59,130,246,0.06)";
                e.currentTarget.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`;
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = error
                ? "2px solid rgba(248,113,113,0.5)"
                : "1px solid rgba(255,255,255,0.08)";
              e.currentTarget.style.boxShadow =
                "inset 0 2px 4px rgba(0,0,0,0.2)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`;
            }}
            {...props}
          >
            {options.map((o) => (
              <option
                key={o.value}
                value={o.value}
                style={{ background: "#13131f" }}
              >
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="text-xs font-medium text-red-400 mt-1">✕ {error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-text-muted)]">{helperText}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

// Checkbox Component
interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { label, error, required, helperText, className, disabled, ...props },
    ref,
  ) => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className={cn(
              "w-5 h-5 rounded-[6px] cursor-pointer transition-all duration-200",
              "accent-blue-500 appearance-none",
              "border border-[rgba(255,255,255,0.2)]",
              "checked:bg-blue-500 checked:border-blue-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
            style={{
              background: props.checked
                ? "rgb(59,130,246)"
                : "rgba(255,255,255,0.04)",
              borderColor: error
                ? "rgb(248,113,113)"
                : props.checked
                  ? "rgb(59,130,246)"
                  : "rgba(255,255,255,0.2)",
              accentColor: "rgb(59,130,246)",
              ...((props.style as any) || {}),
            }}
            {...props}
          />
          {label && (
            <label className="text-sm font-medium text-[var(--color-text-primary)] cursor-pointer">
              {label}
              {required && <span className="text-red-400 ml-1">*</span>}
            </label>
          )}
        </div>
        {error && (
          <p className="text-xs font-medium text-red-400 ml-8">✕ {error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-text-muted)] ml-8">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

// Radio Component
interface RadioProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    { label, error, required, helperText, className, disabled, ...props },
    ref,
  ) => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <input
            ref={ref}
            type="radio"
            disabled={disabled}
            className={cn(
              "w-5 h-5 rounded-full cursor-pointer transition-all duration-200",
              "border-2 border-[rgba(255,255,255,0.3)]",
              "accent-blue-500 appearance-none",
              "checked:border-blue-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
            style={{
              background: props.checked
                ? "radial-gradient(circle, rgb(59,130,246) 30%, transparent 70%)"
                : "rgba(255,255,255,0.04)",
              borderColor: error
                ? "rgb(248,113,113)"
                : props.checked
                  ? "rgb(59,130,246)"
                  : "rgba(255,255,255,0.3)",
              accentColor: "rgb(59,130,246)",
              ...((props.style as any) || {}),
            }}
            {...props}
          />
          {label && (
            <label className="text-sm font-medium text-[var(--color-text-primary)] cursor-pointer">
              {label}
              {required && <span className="text-red-400 ml-1">*</span>}
            </label>
          )}
        </div>
        {error && (
          <p className="text-xs font-medium text-red-400 ml-8">✕ {error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-text-muted)] ml-8">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Radio.displayName = "Radio";

// Switch Component
interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    { label, error, required, helperText, className, disabled, ...props },
    ref,
  ) => {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className={cn(
              "relative w-12 h-6 rounded-full cursor-pointer appearance-none transition-all duration-300",
              "border border-[rgba(255,255,255,0.2)]",
              "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
            style={{
              background: props.checked
                ? "rgb(59,130,246)"
                : "rgba(255,255,255,0.1)",
              borderColor: error
                ? "rgb(248,113,113)"
                : props.checked
                  ? "rgb(59,130,246)"
                  : "rgba(255,255,255,0.2)",
              backgroundImage: props.checked
                ? "linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.2) 60%, transparent 60%)"
                : "none",
              backgroundPosition: "right center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "100% 100%",
              boxShadow: props.checked
                ? "inset 0 0 0 1px rgba(59,130,246,0.5)"
                : "inset 0 0 0 1px rgba(255,255,255,0.1)",
              ...((props.style as any) || {}),
            }}
            {...props}
          />
          {label && (
            <label className="text-sm font-medium text-[var(--color-text-primary)] cursor-pointer">
              {label}
              {required && <span className="text-red-400 ml-1">*</span>}
            </label>
          )}
        </div>
        {error && (
          <p className="text-xs font-medium text-red-400 ml-14">✕ {error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-text-muted)] ml-14">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Switch.displayName = "Switch";
