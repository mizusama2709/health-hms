"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
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
export type UndoConfig = {
  /** Same (prevState, formData) => Promise<ActionResult> shape as `action` — often the very same action, called with different field values (e.g. the opposite target state). */
  action: (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  /**
   * Plain field name → value pairs for the reverse operation, built by the
   * caller from values it already has at render time (not derived from the
   * original submission — a generic "flip whatever changed" isn't knowable
   * here). A function here (e.g. `() => FormData`) can't cross the
   * server/client boundary from a Server Component page — only plain
   * serializable data and "use server" actions can.
   */
  fields: Record<string, string>;
  message?: string;
};

/** Shown in a toast's action button so a next-step link can ride along with the success message (e.g. "Booked — Start vitals"). */
export type NextStep = { label: string; href: string };

function ActionForm({
  action,
  successMessage,
  confirmMessage,
  undo,
  nextStep,
  children,
  className,
}: {
  action: (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  successMessage?: string;
  /** When set, a confirm dialog must be accepted before the action fires — reserve for irreversible actions; prefer `undo` for anything reversible. */
  confirmMessage?: string;
  /** When set, the success toast offers "Undo" instead of (or alongside) a pre-confirm — better for actions that are cheap to reverse. */
  undo?: UndoConfig;
  /** When set (and `undo` isn't), the success toast offers a button linking straight to the obvious next step (e.g. "Booked — Start vitals") instead of ending the flow on a bare confirmation. */
  nextStep?: NextStep;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const handledRef = React.useRef<ActionResult | undefined>(undefined);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const confirmedRef = React.useRef(false);
  const router = useRouter();

  React.useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (!state) return;

    if (state.success) {
      const message = state.message ?? successMessage ?? "Done";
      if (undo) {
        toast.success(message, {
          action: {
            label: "Undo",
            onClick: () => {
              const formData = new FormData();
              for (const [key, value] of Object.entries(undo.fields)) formData.set(key, value);
              undo.action(undefined, formData).then((result) => {
                if (result.success) toast.success(result.message ?? undo.message ?? "Undone");
                else toast.error(result.message ?? "Couldn't undo");
              });
            },
          },
        });
      } else if (nextStep) {
        toast.success(message, {
          action: {
            label: nextStep.label,
            onClick: () => router.push(nextStep.href),
          },
        });
      } else {
        toast.success(message);
      }
    } else {
      toast.error(state.message ?? "Something went wrong");
    }
  }, [state, successMessage, undo, nextStep, router]);

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
