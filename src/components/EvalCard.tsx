import { GoIcon } from "./Icons";
import { EvalRecord } from "../mock/entityViewData";

type EvalCardProps = {
  evaluation: EvalRecord;
  onOpen: (evalId: string) => void;
};

export function EvalCard({ evaluation, onOpen }: EvalCardProps) {
  return (
    <article className="rounded-card border border-borderSubtle bg-panelMuted p-3 shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-zinc-100">{evaluation.lineItem}</p>
          <p className="text-[11px] text-zinc-400">Eval: {evaluation.id}</p>
        </div>
        <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              evaluation.status === "PASS"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : evaluation.status === "FAIL"
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                  : "border-[#3b4353] bg-[#1b202b] text-zinc-300"
            }`}
          >
          {evaluation.status}
        </span>
      </div>

      <div className="space-y-1 text-[12px] text-zinc-300">
        <p>
          <span className="text-zinc-500">Check_type:</span> {evaluation.checkType}
        </p>
        <p>
          <span className="text-zinc-500">Expected Value:</span> {evaluation.expectedValue}
        </p>
        <p>
          <span className="text-zinc-500">Observed Value:</span> {evaluation.observedValue}
        </p>
        <p>
          <span className="text-zinc-500">Delta:</span> {evaluation.delta}
        </p>
        <p>
          <span className="text-zinc-500">Reason codes:</span> {evaluation.reasonCodes.join(", ")}
        </p>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => onOpen(evaluation.id)}
          className="inline-flex items-center rounded-full border border-[#343b48] bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 hover:border-[#4d5a74] hover:text-zinc-100"
        >
          View
          <GoIcon className="ml-1 h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
