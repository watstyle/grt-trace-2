import { ThreadEvent, formatTopLine } from "../mock/threadViewData";
import { formatObservedTime } from "../utils/format";

type EventLogCardProps = {
  event: ThreadEvent;
  selected: boolean;
  onSelect: (eventId: string) => void;
};

export function EventLogCard({ event, selected, onSelect }: EventLogCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      className={`w-full rounded-card border px-3 py-3 text-left shadow-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]/70 ${
        selected
          ? "border-[#60a5fa]/60 bg-[#182031]"
          : "border-borderSubtle bg-panelMuted hover:border-[#3b465d] hover:bg-[#171e2b]"
      }`}
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.045em] text-zinc-100">{formatTopLine(event)}</p>
      <p className="mt-1 text-[12px] text-zinc-400">Observed: {formatObservedTime(event.observedAt)}</p>
    </button>
  );
}
