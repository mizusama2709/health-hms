"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

export type ActionResult = { success: boolean; message?: string };

/**
 * Wraps a server action that returns { success, message } (see
 * src/lib/actionResult.ts) so its result surfaces as a toast instead of a
 * silent page reload or an uncaught-error crash page. Requires the action's
 * signature to be (prevState, formData) => Promise<ActionResult>, per React's
 * useActionState contract — see withActionResult in src/lib/actionResult.ts
 * for the helper that adapts a plain (formData) => Promise<void> action.
 */
function ActionForm({
  action,
  successMessage,
  confirmMessage,
  children,
  className,
}: {
  action: (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  successMessage?: string;
  /** When set, a native confirm() must be accepted before the action fires — for destructive/irreversible actions. */
  confirmMessage?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const handledRef = React.useRef<ActionResult | undefined>(undefined);

  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (!state) return;

    if (state.success) {
      toast.success(state.message ?? successMessage ?? "Done");
    } else {
      toast.error(state.message ?? "Something went wrong");
    }
  }, [state, successMessage]);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}

export { ActionForm };
