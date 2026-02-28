import { CopyIconButton } from "./CopyIconButton";
import { EvalEvidenceItem } from "../mock/evalViewData";
import { formatDateTime } from "../utils/format";

type EvidenceEventCardProps = {
  item: EvalEvidenceItem;
  selected: boolean;
  onSelect: (eventId: string) => void;
  onOpenJson: (eventId: string) => void;
};

export function EvidenceEventCard({ item, selected, onSelect, onOpenJson }: EvidenceEventCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.event.id)}
      className={`w-full rounded-card border px-3 py-3 text-left shadow-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]/70 ${
        selected
          ? "border-[#60a5fa]/60 bg-[#182031]"
          : "border-borderSubtle bg-panelMuted hover:border-[#3b465d] hover:bg-[#171e2b]"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-zinc-100">
            {item.activityLabel} by {item.actorLabel} &lt;{item.message.sender}&gt;
          </p>
          <p className="mt-0.5 text-[12px] text-zinc-400">{formatDateTime(item.message.sentAt)}</p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenJson(item.event.id);
          }}
          className="shrink-0 rounded-full border border-[#343b48] bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-[#4d5a74] hover:text-zinc-100"
        >
          Event JSON
        </button>
      </div>

      <blockquote className="mb-3 rounded-lg border-l-2 border-[#4d5a74] bg-white/[0.05] px-3 py-2 text-[12px] leading-5 text-zinc-200">
        "{item.proofText}"
      </blockquote>

      <div className="space-y-1 text-[12px] text-zinc-400">
        <p className="flex items-center gap-2 truncate">
          <span className="text-zinc-500">Subject:</span> {item.message.subject}
          <CopyIconButton value={item.message.subject} label="Subject" className="shrink-0" />
        </p>
        <p>
          <span className="text-zinc-500">Event:</span> {item.event.id}
        </p>
      </div>
    </button>
  );
}
