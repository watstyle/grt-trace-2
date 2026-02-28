import { EvalEvidenceItem } from "../mock/evalViewData";
import { EvidenceEventCard } from "./EvidenceEventCard";

type EvalEvidenceListProps = {
  items: EvalEvidenceItem[];
  selectedEventId?: string;
  onSelectEvent: (eventId: string) => void;
  onOpenJson: (eventId: string) => void;
};

export function EvalEvidenceList({ items, selectedEventId, onSelectEvent, onOpenJson }: EvalEvidenceListProps) {
  if (items.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-card border border-dashed border-borderSubtle bg-panelMuted p-4 text-[13px] text-zinc-400">
          No evidence events for this evaluation.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <EvidenceEventCard
          key={item.event.id}
          item={item}
          selected={item.event.id === selectedEventId}
          onSelect={onSelectEvent}
          onOpenJson={onOpenJson}
        />
      ))}
    </div>
  );
}
