"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search, CornerDownLeft, FileText, User, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/components/layout/role-shell";
import { globalSearchAction } from "@/app/globalSearchActions";
import type { GlobalSearchResult } from "@/lib/globalSearch";

type Item = { id: string; label: string; sublabel?: string; href: string; group: string; icon: typeof FileText };

function flattenPages(sections: NavSection[]): Item[] {
  const items: Item[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      const candidates = item.children ?? [item];
      for (const c of candidates) {
        if (c.href) items.push({ id: c.href, label: c.label, href: c.href, group: "Pages", icon: FileText });
      }
    }
  }
  return items;
}

/**
 * ⌘K / Ctrl+K opens a single "jump anywhere" palette — pages from this
 * role's own nav tree (filtered client-side, no round trip) plus
 * patients/staff (server-searched, debounced) so finding a person doesn't
 * require first guessing which section of the app they live in.
 */
export function CommandPalette({ sections }: { sections: NavSection[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [peopleResults, setPeopleResults] = React.useState<{ patients: GlobalSearchResult[]; staff: GlobalSearchResult[] }>({
    patients: [],
    staff: [],
  });
  const [highlighted, setHighlighted] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pages = React.useMemo(() => flattenPages(sections), [sections]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!query.trim()) return;
    debounceRef.current = setTimeout(async () => {
      const results = await globalSearchAction(query);
      setPeopleResults(results);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const filteredPages = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages.slice(0, 6);
    return pages.filter((p) => p.label.toLowerCase().includes(q));
  }, [pages, query]);

  // Empty query shows no stale people-results from a previous search —
  // derived at render time instead of reset via effect.
  const effectivePeopleResults = query.trim() ? peopleResults : { patients: [], staff: [] };

  const allItems: Item[] = [
    ...effectivePeopleResults.patients.map((p) => ({ ...p, group: "Patients", icon: User })),
    ...effectivePeopleResults.staff.map((s) => ({ ...s, group: "Staff", icon: UserCog })),
    ...filteredPages,
  ];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setPeopleResults({ patients: [], staff: [] });
      setHighlighted(0);
    }
  }

  const groups = ["Patients", "Staff", "Pages"] as const;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger
        className="hidden items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted sm:flex"
      >
        <Search className="size-3.5" />
        <span>Search…</span>
        <kbd className="ml-2 rounded border border-border px-1 text-[10px]">⌘K</kbd>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          className="fixed top-24 left-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
          initialFocus={inputRef}
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              placeholder="Search patients, staff, or jump to a page…"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlighted((h) => Math.min(h + 1, allItems.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlighted((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (allItems[highlighted]) go(allItems[highlighted].href);
                }
              }}
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {allItems.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No results</p>
            ) : (
              groups.map((group) => {
                const items = allItems
                  .map((item, index) => ({ item, index }))
                  .filter(({ item }) => item.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-2 last:mb-0">
                    <p className="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group}</p>
                    {items.map(({ item, index }) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={`${item.group}-${item.id}`}
                          type="button"
                          onMouseEnter={() => setHighlighted(index)}
                          onClick={() => go(item.href)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm",
                            index === highlighted ? "bg-accent text-accent-foreground" : ""
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.sublabel && <span className="shrink-0 truncate text-xs text-muted-foreground">{item.sublabel}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="size-3" /> to select
            </span>
            <span>↑↓ to navigate</span>
            <span>esc to close</span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
