import { MouseEvent } from "react";
import { CopyIcon } from "./Icons";
import { dispatchToast } from "./ToastHost";

type CopyIconButtonProps = {
  value: string;
  label: string;
  className?: string;
};

export function CopyIconButton({ value, label, className = "" }: CopyIconButtonProps) {
  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      dispatchToast("Copied to clipboard");
    } catch {
      dispatchToast("Copy failed");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className={`inline-grid h-5 w-5 place-items-center rounded text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300 ${className}`}
    >
      <CopyIcon className="h-3.5 w-3.5" />
    </button>
  );
}
