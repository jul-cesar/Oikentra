"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: Map<string, React.ReactNode>;
  registerLabel: (value: string, label: React.ReactNode) => void;
} | null>(null);

function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [labels, setLabels] = React.useState(
    () => new Map<string, React.ReactNode>(),
  );
  const registerLabel = React.useCallback(
    (itemValue: string, label: React.ReactNode) => {
      setLabels((current) => {
        if (current.get(itemValue) === label) return current;
        const next = new Map(current);
        next.set(itemValue, label);
        return next;
      });
    },
    [],
  );
  const contextValue = React.useMemo(
    () => ({ value, onValueChange, open, setOpen, labels, registerLabel }),
    [value, onValueChange, open, labels, registerLabel],
  );
  return (
    <SelectContext.Provider value={contextValue}>
      <div data-oikentra-select className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function useSelect() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within Select");
  return ctx;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSelect();
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cn(
        "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-sm outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <HugeiconsIcon
        icon={ChevronDownIcon}
        size={16}
        className="shrink-0 opacity-60"
      />
    </button>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useSelect();
  const label = value ? labels.get(value) : undefined;
  return (
    <span
      className={cn("truncate", (!value || !label) && "text-muted-foreground")}
    >
      {value ? (label ?? placeholder) : placeholder}
    </span>
  );
}

function SelectContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useSelect();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-oikentra-select]")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, setOpen]);
  if (!open) return <div className="hidden">{children}</div>;
  return (
    <div
      data-oikentra-select
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border p-1 shadow-md",
        className,
      )}
      role="listbox"
    >
      {children}
    </div>
  );
}

function SelectItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const {
    value: selected,
    onValueChange,
    setOpen,
    registerLabel,
  } = useSelect();
  React.useEffect(
    () => registerLabel(value, children),
    [value, children, registerLabel],
  );
  const active = selected === value;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={cn(
        "hover:bg-accent hover:text-accent-foreground flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
        active && "bg-accent text-accent-foreground",
        className,
      )}
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
    >
      <span className="flex-1 truncate">{children}</span>
      {active ? <HugeiconsIcon icon={CheckIcon} size={15} /> : null}
    </button>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
