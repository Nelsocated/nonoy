"use client";

import { useId } from "react";
import { Select, type SelectOption } from "@/components/select";
import {
  monthChoices,
  pickMonth,
  yearChoices,
  type Month,
} from "@/lib/admin/month";

function Dropdown({
  id,
  label,
  value,
  onChange,
  disabled,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: SelectOption[];
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        options={options}
        placeholder=""
        className="font-medium"
      />
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
    <div className="grid grid-cols-[minmax(9rem,1fr)_minmax(6.5rem,auto)] gap-2">
      <Dropdown
        id={`${ids}-month`}
        label="Month"
        value={month}
        disabled={!ready}
        onChange={(m) => current && onChange(pickMonth(year, m, current))}
        options={ready ? monthChoices(Number(year), current) : []}
      />
      <Dropdown
        id={`${ids}-year`}
        label="Year"
        value={year}
        disabled={!ready}
        onChange={(y) => current && onChange(pickMonth(y, month, current))}
        options={
          ready
            ? yearChoices(current).map((y) => ({
                value: String(y),
                label: String(y),
              }))
            : []
        }
      />
    </div>
  );
}
