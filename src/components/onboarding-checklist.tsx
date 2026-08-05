"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "onboarding-checklist-dismissed";

export type OnboardingItem = { label: string; done: boolean; href: string };

/**
 * A fresh tenant's dashboard is mostly empty numbers until someone sets up
 * the org profile, adds a doctor, a service, and a second staff member —
 * this surfaces those as one checklist instead of making a new admin
 * discover each step by wandering the nav. Completion is derived live from
 * real data (never a separate "onboarding" flag to drift out of sync);
 * only the dismissal is client-side state, and it re-appears if the
 * underlying setup is still incomplete on a later visit after being reset.
 */
export function OnboardingChecklist({ items }: { items: OnboardingItem[] }) {
  const [dismissed, setDismissed] = React.useState(true);
  const allDone = items.every((i) => i.done);

  React.useEffect(() => {
    const sync = () => setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
    sync();
    // Also react to the flag changing in another tab, so dismissing once
    // doesn't leave the checklist showing in a tab left open elsewhere.
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  if (dismissed || allDone) return null;

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Finish setting up your clinic</p>
            <p className="text-xs text-muted-foreground">A few steps to get Health HMS ready for day-to-day use.</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss checklist"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "true");
              setDismissed(true);
            }}
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                  item.done && "text-muted-foreground"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={cn(item.done && "line-through")}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
