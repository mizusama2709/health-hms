"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * sonner's theme="system" reads the OS prefers-color-scheme media query —
 * but this app's dark/light toggle (theme-toggle.tsx) is independent of the
 * OS setting, stored in localStorage and applied as a `.dark` class on
 * <html>. theme="system" meant toasts could render in the wrong palette
 * any time the OS preference didn't match the user's in-app choice. This
 * tracks the actual `.dark` class instead, including live toggles (no
 * reload) via a MutationObserver.
 */
export function AppToaster() {
  // Matches the default the inline anti-flash script in layout.tsx applies
  // (dark unless localStorage says otherwise), so no light-mode flash on
  // the very first paint before the effect below runs.
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return <Toaster theme={theme} richColors position="top-right" />;
}
