"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * A type-to-filter picker over a plain hidden <input>, so it participates in
 * native <form action={serverAction}> + FormData submission exactly like
 * NativeSelect does. Options are fetched server-side (debounced) via
 * `search` rather than shipped up front — built for catalogs too large to
 * hand the client in full (thousands of medicines) — see native-select.tsx
 * for why Base UI's Select isn't used here.
 */
function SearchableSelect({
  id,
  name,
  search,
  defaultOption,
  placeholder = "Type to search…",
  required,
  className,
  onValueChange,
}: {
  id?: string;
  name: string;
  search: (query: string) => Promise<Option[]>;
  defaultOption?: Option;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const [selectedValue, setSelectedValue] = React.useState(defaultOption?.value ?? "");
  const [query, setQuery] = React.useState(defaultOption?.label ?? "");
  const [results, setResults] = React.useState<Option[]>(defaultOption ? [defaultOption] : []);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function runSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const found = await search(q);
      if (requestId === requestIdRef.current) {
        setResults(found);
        setLoading(false);
        setHighlighted(0);
      }
    }, 250);
  }

  function selectOption(option: Option) {
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
        onFocus={() => {
          setOpen(true);
          if (results.length === 0) runSearch(query);
        }}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setSelectedValue("");
          setOpen(true);
          runSearch(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlighted((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            if (open && results[highlighted]) {
              e.preventDefault();
              selectOption(results[highlighted]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && loading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-popover px-2.5 py-1.5 text-sm text-muted-foreground shadow-md">
          Searching…
        </div>
      )}
      {open && !loading && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-input bg-popover text-popover-foreground shadow-md"
        >
          {results.map((option, i) => (
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
      {open && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-popover px-2.5 py-1.5 text-sm text-muted-foreground shadow-md">
          No matches
        </div>
      )}
    </div>
  );
}

export { SearchableSelect };
