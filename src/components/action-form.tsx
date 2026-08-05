"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
  const formRef = React.useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const confirmedRef = React.useRef(false);

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
    <>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        onSubmit={(e) => {
          if (confirmMessage && !confirmedRef.current) {
            e.preventDefault();
            setConfirmOpen(true);
          }
          confirmedRef.current = false;
        }}
      >
        {children}
      </form>
      {confirmMessage && (
        <AlertDialog open={confirmOpen} onOpenChange={(open) => setConfirmOpen(open)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  confirmedRef.current = true;
                  formRef.current?.requestSubmit();
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export { ActionForm };
