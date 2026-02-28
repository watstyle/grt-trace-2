import { useEffect, useState } from "react";

type ToastDetail = {
  message: string;
};

type ToastState = {
  id: number;
  message: string;
};

const TOAST_EVENT = "app:toast";

export function dispatchToast(message: string) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message } }));
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastDetail>;
      const message = customEvent.detail?.message;
      if (!message) {
        return;
      }

      setToast({ id: Date.now(), message });
    };

    window.addEventListener(TOAST_EVENT, handleToast as EventListener);
    return () => window.removeEventListener(TOAST_EVENT, handleToast as EventListener);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[140]">
      <div key={toast.id} className="copy-toast rounded-lg border border-[#343b48] bg-[#121722] px-3 py-2 text-[12px] text-zinc-100 shadow-xl">
        {toast.message}
      </div>
    </div>
  );
}
