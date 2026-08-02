export type ActionResult = { success: boolean; message?: string };

/**
 * Adapts an existing (formData) => Promise<void> server action — which
 * signals failure by throwing — into the (prevState, formData) =>
 * Promise<ActionResult> shape useActionState expects, without rewriting the
 * action's body. Thrown Errors become { success: false, message }; a normal
 * return becomes { success: true }. Used with <ActionForm> to show a toast
 * instead of a silent reload or an uncaught-error crash page.
 */
export function withActionResult<Args extends unknown[]>(
  fn: (...args: Args) => Promise<ActionResult | void>,
  defaultSuccessMessage?: string
) {
  return async (_prevState: ActionResult | undefined, ...args: Args): Promise<ActionResult> => {
    try {
      const result = await fn(...args);
      if (result && typeof result === "object") return result;
      return { success: true, message: defaultSuccessMessage };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Something went wrong" };
    }
  };
}
