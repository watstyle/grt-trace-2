import { EvalRecord } from "../mock/entityViewData";

type EvalDetailProps = {
  evaluation: EvalRecord;
  onClose: () => void;
};

export function EvalDetail({ evaluation, onClose }: EvalDetailProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-borderSubtle bg-panel/95 px-4">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">
          Eval: <span className="font-mono text-[12px] text-zinc-400">{evaluation.id}</span>
        </h3>
        <button
          type="button"
          aria-label="Close eval detail"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <pre className="rounded-card border border-borderSubtle bg-panelMuted p-4 font-mono text-[12px] leading-5 text-zinc-200 shadow-soft">
          {JSON.stringify(evaluation.raw, null, 2)}
        </pre>
      </div>
    </div>
  );
}
