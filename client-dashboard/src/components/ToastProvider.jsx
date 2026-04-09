/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { X } from "lucide-react";

const FLASH_KEY = "__gc_flash_toast_v1";

const ToastContext = React.createContext({
  toast: () => {},
});

const idForToast = () => {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeToast = (input) => {
  if (typeof input === "string") {
    return { message: input, variant: "info" };
  }
  const obj = input && typeof input === "object" ? input : {};
  return {
    title: obj.title ? String(obj.title) : "",
    message: obj.message ? String(obj.message) : "",
    variant: obj.variant === "success" || obj.variant === "error" || obj.variant === "warning" ? obj.variant : "info",
    durationMs: Number.isFinite(obj.durationMs) ? Math.max(800, Number(obj.durationMs)) : 2800,
  };
};

const classesForVariant = (variant) => {
  if (variant === "success") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (variant === "error") return "border-red-200 bg-red-50 text-red-900";
  if (variant === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-gray-200 bg-white text-gray-900";
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (input) => {
      const t0 = normalizeToast(input);
      if (!t0.title && !t0.message) return;

      const id = idForToast();
      const t = { id, ...t0 };
      setToasts((prev) => {
        const next = [...prev, t];
        return next.slice(-4);
      });

      window.setTimeout(() => dismiss(id), t.durationMs);
    },
    [dismiss]
  );

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      const parsed = JSON.parse(raw);
      toast(parsed);
    } catch {
      // ignore
    }
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border shadow-lg px-4 py-3 flex items-start gap-3 ${classesForVariant(
              t.variant
            )}`}
            role="status"
            aria-live="polite"
          >
            <div className="min-w-0 flex-1">
              {t.title ? <div className="text-sm font-semibold truncate">{t.title}</div> : null}
              {t.message ? <div className="text-sm text-current/80 mt-0.5 break-words">{t.message}</div> : null}
            </div>
            <button
              type="button"
              className="h-8 w-8 -mr-1 -mt-1 rounded-xl grid place-items-center hover:bg-black/5"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => React.useContext(ToastContext);

export const flashToast = (input) => {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(normalizeToast(input)));
  } catch {
    // ignore
  }
};
