"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A type-to-filter picker over a plain hidden <input>, so it participates in
 * native <form action={serverAction}> + FormData submission exactly like
 * NativeSelect does. Built for option lists too large for a usable <select>
 * (thousands of medicines) — see native-select.tsx for why Base UI's Select
 * isn't used here.
 */
function SearchableSelect({
  id,
  name,
  options,
  defaultValue,
  placeholder = "Type to search…",
  required,
  className,
  onValueChange,
}: {
  id?: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const initial = React.useMemo(
    () => options.find((o) => o.value === defaultValue) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [selectedValue, setSelectedValue] = React.useState(initial?.value ?? "");
  const [query, setQuery] = React.useState(initial?.label ?? "");
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
  }, [query, options]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectOption(option: { value: string; label: string }) {
    setSelectedValue(option.value);
    setQuery(option.label);
    setOpen(false);
    onValueChange?.(option.value);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} required={required} />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
          className
        )}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedValue("");
          setOpen(true);
          setHighlighted(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            if (open && filtered[highlighted]) {
              e.preventDefault();
              selectOption(filtered[highlighted]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-input bg-popover text-popover-foreground shadow-md"
        >
          {filtered.map((option, i) => (
            <li key={option.value} role="option" aria-selected={option.value === selectedValue}>
              <button
                type="button"
                className={cn(
                  "block w-full cursor-default px-2.5 py-1.5 text-left text-sm",
                  i === highlighted ? "bg-accent text-accent-foreground" : ""
                )}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(option);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-popover px-2.5 py-1.5 text-sm text-muted-foreground shadow-md">
          No matches
        </div>
      )}
    </div>
  );
}

export { SearchableSelect };
