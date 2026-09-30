import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

type DropdownItem = {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
};

interface TableDropdownProps {
  items?: DropdownItem[];
  label?: string;
}

const MENU_WIDTH = 208;
const GAP = 6;

/**
 * The row "⋯" menu. It opens next to its button, not as a centred modal: a
 * `position: fixed` overlay inside the page is positioned against any
 * transformed ancestor (the page-enter animation is one), which put the old
 * modal below the fold. This renders into document.body and places itself
 * from the button's position on screen, flipping above when there is no room
 * below. Esc, a click outside, scrolling or resizing closes it.
 */
export default function TableDropdown({ items = [], label = "Actions" }: TableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? items.length * 40 + 12;
    const below = r.bottom + GAP + height <= window.innerHeight - 8;
    const top = below ? r.bottom + GAP : Math.max(8, r.top - GAP - height);
    const left = Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPos({ top, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const buttons = Array.from(menuRef.current?.querySelectorAll("button") ?? []);
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    const onScroll = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, close]);

  // Keyboard users land on the first action
  useEffect(() => {
    if (open && pos) menuRef.current?.querySelector("button")?.focus();
  }, [open, pos]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={`inline-grid h-8 w-8 cursor-pointer place-items-center rounded-lg transition-colors ${
          open ? "bg-paper-deep text-ink" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
        }`}
      >
        <MoreHorizontal size={18} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: MENU_WIDTH }}
            className="fixed z-[70] animate-fade overflow-hidden rounded-xl bg-white py-1.5 font-sans shadow-lift"
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                onClick={() => {
                  close();
                  item.action();
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] font-medium outline-none transition-colors focus:bg-paper-deep ${
                  item.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-paper-deep"
                }`}
              >
                {item.icon && <span className={item.danger ? "text-danger" : "text-ink-faint"}>{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
