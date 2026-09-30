import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";

/**
 * The admin's small UI kit, on the tokens in tailwind.config.js. New screens
 * build from these so they look like one product; older screens still use
 * common/button, common/modal etc. until they are next touched.
 */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "attention" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
};

export function Btn({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: BtnProps) {
  const variants = {
    primary: "bg-brand-900 text-white hover:bg-brand-950 shadow-sm",
    secondary: "bg-white text-ink ring-1 ring-inset ring-rule hover:bg-paper hover:ring-ink-faint/50",
    ghost: "text-ink-soft hover:bg-paper-deep hover:text-ink",
    attention: "bg-attention text-white hover:bg-attention-deep shadow-sm",
    danger: "bg-white text-danger ring-1 ring-inset ring-danger/30 hover:bg-danger-soft",
  };
  const sizes = { sm: "h-8 px-3 text-[13px] gap-1.5", md: "h-10 px-4 text-sm gap-2" };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={twMerge(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge("rounded-xl bg-white shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  green: "bg-brand-50 text-brand-950 ring-brand-200",
  orange: "bg-attention-soft text-attention-deep ring-attention/25",
  red: "bg-danger-soft text-danger-deep ring-danger/20",
  gray: "bg-paper-deep text-ink-soft ring-rule",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
};
export type Tone = keyof typeof tones;

export function Pill({ tone = "gray", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={twMerge("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={twMerge("animate-pulse rounded-md bg-paper-deep", className)} />;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-paper-deep text-ink-faint">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-ink-soft">{children}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-rule">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
              active ? "border-brand-900 text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
            {item.count != null && (
              <span className={`tnum rounded-full px-1.5 text-[11px] ${active ? "bg-brand-50 text-brand-950" : "bg-paper-deep text-ink-soft"}`}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A panel from the right edge. Esc and the backdrop close it. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-[520px]" }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Rendered at the document root: inside the page, a transformed ancestor
  // (the page-enter animation) would pin a fixed overlay to the page, not the
  // screen, cutting the drawer off on short pages
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end font-sans" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade bg-ink/40" onClick={onClose} />
      <aside className={`relative flex h-full w-full ${width} animate-slide-in flex-col bg-white shadow-lift`}>
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-[-0.01em] text-ink">{title}</div>
            {subtitle && <div className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-2 grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-paper-deep hover:text-ink">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-rule bg-paper px-6 py-4">{footer}</footer>}
      </aside>
    </div>,
    document.body
  );
}

/** A centred confirmation for anything that can't be undone, like sending to hundreds of people. */
export function Confirm({ open, title, children, confirmLabel, onConfirm, onCancel, loading }: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 font-sans" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade bg-ink/50" onClick={onCancel} />
      <div className="relative w-full max-w-md animate-rise rounded-2xl bg-white p-6 shadow-lift">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Btn>
          <Btn onClick={onConfirm} loading={loading}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const formatNumber = (n: number | string | null | undefined) => new Intl.NumberFormat("en-US").format(Number(n ?? 0));

export const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};

export const initials = (first?: string | null, last?: string | null) =>
  `${first?.trim()?.[0] ?? ""}${last?.trim()?.[0] ?? ""}`.toUpperCase() || "?";
