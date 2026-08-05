import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A plain native <select>, styled to match the shadcn Input.
 * Deliberately NOT the Base UI/shadcn Select — this app's forms are
 * native <form action={serverAction}> + FormData, and Base UI's Select
 * doesn't reliably participate in that without extra client wiring.
 *
 * `appearance-none` drops the browser's default arrow in favor of one drawn
 * to match the rest of the design system. Sizing classes (w-*, h-*, text-*)
 * go on the wrapper — not the <select> itself — so the wrapper (which the
 * chevron is positioned against) always exactly matches the select's box,
 * even inside a flex row where `align-items: stretch` would otherwise grow
 * a plain wrapper taller than its content and throw the icon off-center.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative h-8 w-full", className)}>
      <select
        data-slot="native-select"
        className="size-full min-w-0 appearance-none truncate rounded-lg border border-input bg-transparent px-2.5 py-1 pr-7 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
        {...props}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
