"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  // small grey note on the right of the row ("waiting")
  hint?: string;
  disabled?: boolean;
};

const trigger =
  "flex w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-surface pr-3 pl-3 text-left outline-none transition focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-brand-100 aria-expanded:border-primary aria-expanded:ring-3 aria-expanded:ring-brand-100 aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50";

const sizes = {
  md: "min-h-11 py-2 text-base",
  // the big field-form inputs (Pickup, Sale)
  lg: "min-h-[3.25rem] py-3 text-lg",
};

// A dropdown that matches the app instead of the phone's own picker.
// Keyboard works like a native <select> (the ARIA "select-only combobox"):
// focus stays on the button; arrows, Home/End, Enter/Space, Esc and typing
// a letter move through the list. The list opens in the top layer
// (popover), so it isn't clipped by dialogs or scrolling cards.
export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = "Pick one",
  disabled,
  size = "md",
  className = "",
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: keyof typeof sizes;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}) {
  const auto = useId();
  const buttonId = id ?? auto;
  const listId = `${buttonId}-list`;
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<React.CSSProperties>({});
  const typed = useRef({ text: "", at: 0 });

  const selected = options.findIndex((o) => o.value === value);
  const current = options[selected];

  const usable = (i: number) =>
    i >= 0 && i < options.length && !options[i].disabled;
  // the next pickable row from `from` going `step` (+1 down, -1 up)
  const next = (from: number, step: 1 | -1) => {
    for (let i = from + step; i >= 0 && i < options.length; i += step)
      if (usable(i)) return i;
    return from;
  };
  const first = () => next(-1, 1);
  const last = () => next(options.length, -1);

  function show(at = usable(selected) ? selected : first()) {
    if (disabled || !options.length) return;
    setActive(at);
    setOpen(true);
  }
  function hide() {
    setOpen(false);
  }
  function pick(i: number) {
    if (!usable(i)) return;
    if (options[i].value !== value) onChange(options[i].value);
    hide();
  }

  // under the button, or above it when there's no room below
  function position() {
    const b = button.current?.getBoundingClientRect();
    if (!b) return;
    const gap = 4;
    const want = Math.min(list.current?.scrollHeight ?? 256, 256);
    const below = window.innerHeight - b.bottom - gap - 8;
    const above = b.top - gap - 8;
    const up = below < want && above > below;
    setPlace({
      left: b.left,
      // at least as wide as the button, wider when a row needs it (a
      // narrow year button would otherwise cut "2026" off), never off-screen
      minWidth: b.width,
      maxWidth: window.innerWidth - b.left - 8,
      maxHeight: Math.max(Math.min(256, up ? above : below), 120),
      // the popover's default inset is 0 on every side: clear the unused ones
      right: "auto",
      ...(up
        ? { top: "auto", bottom: window.innerHeight - b.top + gap }
        : { top: b.bottom + gap, bottom: "auto" }),
    });
  }

  useLayoutEffect(() => {
    const el = list.current;
    if (!open || !el) return;
    // top layer where supported; otherwise it's already fixed + z-50
    if (el.showPopover && !el.matches(":popover-open")) el.showPopover();
    position();
    return () => {
      if (el.hidePopover && el.matches(":popover-open")) el.hidePopover();
    };
  }, [open]);

  // follow the button while the page scrolls; close on a tap elsewhere
  useEffect(() => {
    if (!open) return;
    const onMove = (e: Event) => {
      if (e.target instanceof Node && list.current?.contains(e.target)) return;
      position();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (button.current?.contains(t) || list.current?.contains(t)) return;
      // the field's own label clicks the button, which toggles it shut
      if (t instanceof Element && t.closest(`label[for="${buttonId}"]`)) return;
      hide();
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, buttonId]);

  // keep the highlighted row in view
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  // typing letters jumps to the next row that starts with them
  function typeahead(key: string) {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at > 600 ? key : t.text + key;
    t.at = now;
    const text = t.text.toLowerCase();
    // a single letter moves past the current row; a longer word may stay on it
    const start = Math.max(open ? active : selected, -1);
    const from = t.text.length > 1 ? Math.max(start, 0) : start + 1;
    for (let n = 0; n < options.length; n++) {
      const i = (from + n) % options.length;
      if (usable(i) && options[i].label.toLowerCase().startsWith(text)) {
        if (open) setActive(i);
        else pick(i);
        return;
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const k = e.key;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) {
        e.preventDefault();
        show(k === "ArrowUp" && !usable(selected) ? last() : undefined);
      } else if (k === "Home" || k === "End") {
        e.preventDefault();
        show(k === "Home" ? first() : last());
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeahead(k);
      }
      return;
    }
    switch (k) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => next(a, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) pick(active);
        else setActive((a) => next(a, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(first());
        break;
      case "End":
        e.preventDefault();
        setActive(last());
        break;
      case "PageDown":
        e.preventDefault();
        setActive((a) => {
          let i = a;
          for (let n = 0; n < 10; n++) i = next(i, 1);
          return i;
        });
        break;
      case "PageUp":
        e.preventDefault();
        setActive((a) => {
          let i = a;
          for (let n = 0; n < 10; n++) i = next(i, -1);
          return i;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        break;
      case "Escape":
        // don't let the Esc also close a dialog the select sits in
        e.preventDefault();
        e.stopPropagation();
        hide();
        break;
      case "Tab":
        pick(active);
        break;
      default:
        if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          typeahead(k);
        }
    }
  }

  return (
    <>
      <button
        ref={button}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onKeyDown}
        onBlur={hide}
        className={`${trigger} ${sizes[size]} ${className}`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${current ? "" : "text-muted-foreground"}`}
        >
          {current ? current.label : placeholder}
        </span>
        {current?.hint && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {current.hint}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-primary transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <ul
        ref={list}
        id={listId}
        role="listbox"
        popover="manual"
        aria-labelledby={buttonId}
        tabIndex={-1}
        // clicks on a row mustn't pull focus off the button
        onMouseDown={(e) => e.preventDefault()}
        style={place}
        className={`select-pop fixed z-50 m-0 w-max overflow-y-auto overscroll-contain rounded-md border border-input bg-surface p-1 text-foreground shadow-raised ${open ? "" : "hidden"}`}
      >
        {options.map((o, i) => {
          const isSelected = i === selected;
          return (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={o.disabled || undefined}
              onPointerMove={() => usable(i) && i !== active && setActive(i)}
              onClick={() => pick(i)}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded px-3 py-2 text-base ${
                i === active
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : ""
              } ${isSelected ? "font-medium" : ""} ${
                o.disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.hint && (
                <span className="shrink-0 text-sm text-muted-foreground">
                  {o.hint}
                </span>
              )}
              <Check
                aria-hidden
                className={`size-4 shrink-0 text-primary ${isSelected ? "" : "invisible"}`}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
