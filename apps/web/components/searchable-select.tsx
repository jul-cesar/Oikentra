"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	ArrowDown01Icon,
	Search01Icon,
	Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import type { LocationOption } from "@oikentra/location-catalog";

type SearchableSelectProps = {
	value: string;
	options: LocationOption[];
	placeholder: string;
	onChange: (value: string) => void;
	disabled?: boolean;
};

export function SearchableSelect({
	value,
	options,
	placeholder,
	onChange,
	disabled = false,
}: SearchableSelectProps) {
	const listId = useId();
	const containerRef = useRef<HTMLDivElement>(null);
	const [query, setQuery] = useState(value);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);

	// Cierra el desplegable al hacer clic fuera.
	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	const filtered = useMemo(() => {
		const q = query.trim().toLocaleLowerCase();
		const source = q
			? options.filter(({ name }) => name.toLocaleLowerCase().includes(q))
			: options;
		return source.slice(0, 80);
	}, [options, query]);

	function commit(option: LocationOption) {
		onChange(option.name);
		setQuery(option.name);
		setOpen(false);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) return;
		if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
			setOpen(true);
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActive((index) => Math.min(index + 1, filtered.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActive((index) => Math.max(index - 1, 0));
		} else if (event.key === "Enter") {
			if (open && filtered[active]) {
				event.preventDefault();
				commit(filtered[active]);
			}
		} else if (event.key === "Escape") {
			setOpen(false);
		}
	}

	return (
		<div ref={containerRef} className="relative">
			<div className="group relative">
				<HugeiconsIcon
					icon={Search01Icon}
					size={19}
					strokeWidth={1.8}
					className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
					aria-hidden="true"
				/>
				<input
					role="combobox"
					aria-expanded={open}
					aria-controls={listId}
					aria-autocomplete="list"
					autoComplete="off"
					value={query}
					placeholder={placeholder}
					disabled={disabled}
					onFocus={() => setOpen(true)}
					onChange={(event) => {
						setQuery(event.target.value);
						setActive(0);
						setOpen(true);
						if (value) onChange("");
					}}
					onKeyDown={handleKeyDown}
					className="h-12 w-full min-w-0 rounded-xl border border-border bg-card pl-11 pr-11 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
				/>
				<HugeiconsIcon
					icon={ArrowDown01Icon}
					size={18}
					strokeWidth={1.8}
					className={cn(
						"pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform",
						open && "rotate-180",
					)}
					aria-hidden="true"
				/>
			</div>

			{open && !disabled ? (
				<ul
					id={listId}
					role="listbox"
					className="absolute z-20 mt-2 max-h-60 w-full max-w-[calc(100vw-2rem)] overflow-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg shadow-black/5 sm:max-w-none"
				>
					{filtered.length ? (
						filtered.map((option, index) => {
							const selected = option.name === value;
							return (
								<li key={option.code}>
									<button
										type="button"
										role="option"
										aria-selected={selected}
										className={cn(
											"flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors whitespace-normal",
											index === active
												? "bg-accent text-accent-foreground"
												: "text-foreground hover:bg-accent",
										)}
										onMouseEnter={() => setActive(index)}
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => commit(option)}
									>
										<span className="min-w-0 break-words">{option.name}</span>
										{selected ? (
											<HugeiconsIcon
												icon={Tick02Icon}
												size={16}
												strokeWidth={2}
												className="text-primary"
												aria-hidden="true"
											/>
										) : null}
									</button>
								</li>
							);
						})
					) : (
						<li className="px-3 py-2.5 text-sm text-muted-foreground">
							No encontramos coincidencias.
						</li>
					)}
				</ul>
			) : null}
		</div>
	);
}
