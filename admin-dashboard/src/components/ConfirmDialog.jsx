import React from "react";

const buttonClass = (variant) => {
  if (variant === "danger") {
    return "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50";
  }
  if (variant === "primary") {
    return "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50";
  }
  return "bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50";
};

export default function ConfirmDialog({
  open,
  title = "Confirm",
  description = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  if (!open) return null;

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => (busy ? null : onClose?.())} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">{title}</div>
            {description ? <div className="text-sm text-gray-600 mt-2">{description}</div> : null}
          </div>
          <div className="p-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 px-4 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className={`h-10 px-4 rounded-xl text-sm font-semibold ${buttonClass(variant)}`}
            >
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

