import { ThreadEvent } from "../mock/threadViewData";
import { EventLogCard } from "./EventLogCard";

type EventLogListProps = {
  events: ThreadEvent[];
  selectedEventId?: string;
  onSelect: (eventId: string) => void;
};

export function EventLogList({ events, selectedEventId, onSelect }: EventLogListProps) {
  if (events.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-card border border-dashed border-borderSubtle bg-panelMuted p-4 text-[13px] text-zinc-400">
          No events available for this entity.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="space-y-3">
        {events.map((event) => (
          <EventLogCard key={event.id} event={event} selected={event.id === selectedEventId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
