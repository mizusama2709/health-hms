import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A plain native <select>, styled to match the shadcn Input.
 * Deliberately NOT the Base UI/shadcn Select — this app's forms are
 * native <form action={serverAction}> + FormData, and Base UI's Select
 * doesn't reliably participate in that without extra client wiring.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}

export { NativeSelect };
