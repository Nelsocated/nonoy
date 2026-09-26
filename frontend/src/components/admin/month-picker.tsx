"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import {
  monthChoices,
  pickMonth,
  yearChoices,
  type Month,
} from "@/lib/admin/month";

const select =
  "min-h-11 w-full appearance-none rounded-md border border-input bg-surface py-2 pr-9 pl-3 text-base font-medium outline-none transition focus:border-primary focus:ring-3 focus:ring-brand-100 disabled:opacity-50";

function Dropdown({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={select}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary"
        />
      </div>
    </div>
  );
}

// Month + year dropdowns (Reports, Trips). Months after `current` can't be
// picked; switching to such a year lands on the current month.
export function MonthPicker({
  value,
  current,
  onChange,
}: {
  value: Month | null;
  current: Month | null;
  onChange: (month: Month) => void;
}) {
  const ids = useId();
  const ready = value && current;
  const [year, month] = value ? value.split("-") : ["", ""];
  return (
    <div className="grid grid-cols-[minmax(9rem,1fr)_minmax(6rem,auto)] gap-2">
      <Dropdown
        id={`${ids}-month`}
        label="Month"
        value={month}
        disabled={!ready}
        onChange={(m) => current && onChange(pickMonth(year, m, current))}
      >
        {ready &&
          monthChoices(Number(year), current).map((m) => (
            <option key={m.value} value={m.value} disabled={m.disabled}>
              {m.label}
            </option>
          ))}
      </Dropdown>
      <Dropdown
        id={`${ids}-year`}
        label="Year"
        value={year}
        disabled={!ready}
        onChange={(y) => current && onChange(pickMonth(y, month, current))}
      >
        {ready &&
          yearChoices(current).map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
      </Dropdown>
    </div>
  );
}
