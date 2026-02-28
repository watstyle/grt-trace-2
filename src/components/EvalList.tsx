import { useMemo, useState } from "react";
import { EvalRecord, EvalStatus } from "../mock/entityViewData";
import { CopyIconButton } from "./CopyIconButton";
import { GoIcon } from "./Icons";

type EvalListProps = {
  evaluations: EvalRecord[];
  onOpenEval: (evalId: string) => void;
  onViewJson?: (evalId: string) => void;
  activeJsonEvalId?: string;
};

type EvalFilter = "ALL" | "PASS" | "FAIL" | "UNKNOWN" | "MAPPED" | "MATCHED";

const FILTERS: { key: EvalFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PASS", label: "Pass" },
  { key: "FAIL", label: "Fail" },
  { key: "UNKNOWN", label: "Unknown" },
  { key: "MAPPED", label: "Mapped" },
  { key: "MATCHED", label: "Matched" },
];

const STANDARD_CHARGE_LABELS = ["Linehaul", "Fuel", "Lumper", "Layover", "Stopoff"] as const;

function isMapped(evaluation: EvalRecord): boolean {
  return (
    evaluation.status === "MAPPED" ||
    evaluation.checkType.startsWith("MAP") ||
    evaluation.reasonCodes.some((code) => code.includes("MAPPED"))
  );
}

function isMatched(evaluation: EvalRecord): boolean {
  return (
    evaluation.status === "MATCHED" ||
    evaluation.checkType.startsWith("MATCH") ||
    evaluation.reasonCodes.some((code) => code.includes("MATCHED"))
  );
}

function matchesFilter(evaluation: EvalRecord, filter: EvalFilter): boolean {
  if (filter === "ALL") {
    return true;
  }
  if (filter === "MAPPED") {
    return isMapped(evaluation);
  }
  if (filter === "MATCHED") {
    return isMatched(evaluation);
  }
  return evaluation.status === filter;
}

function statusClasses(status: EvalStatus): string {
  if (status === "FAIL") {
    return "border-rose-500/50 bg-rose-500/10 text-rose-300";
  }
  if (status === "UNKNOWN") {
    return "border-zinc-500/50 bg-zinc-500/10 text-zinc-300";
  }
  return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
}

function truncateEvalId(value: string, max = 16): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

function normalizeLineItem(lineItem: string, checkType: EvalRecord["checkType"], rowIndex: number): string {
  const lower = lineItem.toLowerCase();
  if (lower.includes("linehaul")) {
    return "Linehaul";
  }
  if (lower.includes("fuel") || lower.includes("fsc")) {
    return "Fuel";
  }
  if (lower.includes("lumper")) {
    return "Lumper";
  }
  if (lower.includes("layover")) {
    return "Layover";
  }
  if (lower.includes("stopoff") || lower.includes("stop")) {
    return "Stopoff";
  }
  if (checkType === "MATCH-1") {
    return "Linehaul";
  }
  if (checkType === "MAP-1") {
    return "Fuel";
  }
  return STANDARD_CHARGE_LABELS[rowIndex % STANDARD_CHARGE_LABELS.length];
}

function toCurrencyAmount(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value.trim().replace(/,/g, "");
  const maybeWrappedNegative = normalized.startsWith("(") && normalized.endsWith(")");
  const stripped = normalized.replace(/[()$]/g, "");

  if (!/^[+-]?\d+(\.\d+)?$/.test(stripped)) {
    return null;
  }

  const parsed = Number(stripped);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return maybeWrappedNegative ? -Math.abs(parsed) : parsed;
}

function formatCurrency(value: string | number): string {
  const amount = toCurrencyAmount(value);
  const resolved = amount ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(resolved);
}

export function EvalList({ evaluations, onOpenEval, onViewJson, activeJsonEvalId }: EvalListProps) {
  const [filter, setFilter] = useState<EvalFilter>("ALL");

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((evaluation) => matchesFilter(evaluation, filter));
  }, [evaluations, filter]);

  if (evaluations.length === 0) {
    return <div className="p-4 text-[13px] text-zinc-400">No evaluations available.</div>;
  }

  return (
    <div className="h-full min-h-0 overflow-auto p-3 pr-4">
      <div className="mb-3 inline-flex items-center gap-1 rounded-lg border border-borderSubtle bg-[#10141c] p-1">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
              filter === option.key
                ? "bg-[#1c2433] text-zinc-100"
                : "text-zinc-400 hover:bg-[#171c26] hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
        <div className="overflow-auto">
          <table className="min-w-full table-fixed">
            <thead className="sticky top-0 z-[1] bg-[#121722]">
              <tr className="border-b border-borderSubtle">
                <th className="w-[112px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Eval
                </th>
                <th className="w-[140px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Line Item
                </th>
                <th className="w-[84px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Check
                </th>
                <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Expected
                </th>
                <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Observed
                </th>
                <th className="w-[88px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Delta
                </th>
                <th className="w-[96px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Result
                </th>
                <th className="w-[132px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Reasons
                </th>
                <th className="w-[90px] px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.map((evaluation, index) => (
                <tr
                  key={evaluation.id}
                  className={`border-b border-borderSubtle/70 text-[12px] text-zinc-300 transition hover:bg-[#171e2b] ${
                    activeJsonEvalId === evaluation.id ? "bg-[#182031]" : ""
                  }`}
                >
                  <td className="px-3 py-2 align-top">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-zinc-400" title={evaluation.id}>
                        {truncateEvalId(evaluation.id)}
                      </span>
                      <CopyIconButton value={evaluation.id} label="Eval ID" />
                    </div>
                  </td>
                  <td className="truncate px-3 py-2 align-top text-zinc-100" title={evaluation.lineItem}>
                    {normalizeLineItem(evaluation.lineItem, evaluation.checkType, index)}
                  </td>
                  <td className="px-3 py-2 align-top text-zinc-300">{evaluation.checkType}</td>
                  <td className="truncate px-3 py-2 align-top" title={evaluation.expectedValue}>
                    {formatCurrency(evaluation.expectedValue)}
                  </td>
                  <td className="truncate px-3 py-2 align-top" title={evaluation.observedValue}>
                    {formatCurrency(evaluation.observedValue)}
                  </td>
                  <td className="px-3 py-2 align-top text-zinc-300">{formatCurrency(evaluation.delta)}</td>
                  <td className="px-3 py-2 align-top">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(evaluation.status)}`}>
                      {evaluation.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {isMapped(evaluation) || isMatched(evaluation) ? (
                      <div className="flex items-center gap-1">
                        {isMapped(evaluation) ? (
                          <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            MAPPED
                          </span>
                        ) : null}
                        {isMatched(evaluation) ? (
                          <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            MATCHED
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="truncate px-3 py-2 align-top text-zinc-400" title={evaluation.reasonCodes.join(", ")}>
                    {evaluation.reasonCodes.join(", ")}
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <div className="inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                      {onViewJson ? (
                        <button
                          type="button"
                          onClick={() => onViewJson(evaluation.id)}
                          className="inline-flex whitespace-nowrap rounded-full border border-zinc-700 bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                        >
                          View JSON
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onOpenEval(evaluation.id)}
                        className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                      >
                        View
                        <GoIcon className="ml-1 h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEvaluations.length === 0 ? (
          <div className="border-t border-borderSubtle px-3 py-4 text-[12px] text-zinc-400">No evaluations for this filter.</div>
        ) : null}
      </div>
    </div>
  );
}
