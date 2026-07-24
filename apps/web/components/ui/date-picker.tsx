"use client";

import * as React from "react";
import { Calendar03Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const formatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "long", year: "numeric" });
const weekdays = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

function toDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function DatePicker({ value, onChange, placeholder = "Selecciona una fecha", className }: DatePickerProps) {
  const selected = toDate(value);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => selected ?? new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first.getDay() + days) / 7) * 7 }, (_, index) => {
    const day = index - first.getDay() + 1;
    return day >= 1 && day <= days ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-oikentra-date-picker]")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div data-oikentra-date-picker className={cn("relative", className)}>
      <Button type="button" variant="outline" className="w-full justify-start text-left font-normal" onClick={() => {
        if (!open) setMonth(selected ?? new Date());
        setOpen((current) => !current);
      }}>
        <HugeiconsIcon icon={Calendar03Icon} size={16} />
        <span className={cn(!selected && "text-muted-foreground")}>{selected ? formatter.format(selected) : placeholder}</span>
      </Button>
      {open ? (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-2 w-[18rem] rounded-md border p-3 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            </Button>
            <p className="text-sm font-medium capitalize">{new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(month)}</p>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {weekdays.map((day) => <div key={day} className="py-1">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, index) => date ? (
              <button key={toISODate(date)} type="button" className={cn("h-8 rounded-md text-sm hover:bg-accent", sameDay(selected, date) && "bg-primary text-primary-foreground hover:bg-primary/90")} onClick={() => { onChange(toISODate(date)); setOpen(false); }}>
                {date.getDate()}
              </button>
            ) : <span key={`empty-${index}`} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { DatePicker };
export type { DatePickerProps };
