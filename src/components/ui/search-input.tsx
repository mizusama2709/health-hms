import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The plain Input with a leading search icon, for the many GET-form filter
 * boxes ("Name, phone, Patient ID, email", "Medicine name", etc.) — signals
 * "type to filter" at a glance instead of looking like any other text field.
 * Not for SearchableSelect, which already has its own combobox affordance.
 */
function SearchInput({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <div className={cn("relative h-8 w-full", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <InputPrimitive
        type={type}
        data-slot="search-input"
        className="size-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        {...props}
      />
    </div>
  );
}

export { SearchInput };
