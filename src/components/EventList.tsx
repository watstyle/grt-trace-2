import { ThreadEvent } from "../mock/threadViewData";
import { EventCard } from "./EventCard";

type EventListProps = {
  events: ThreadEvent[];
  expandedEventId?: string;
  onToggleEvent: (eventId: string) => void;
};

export function EventList({ events, expandedEventId, onToggleEvent }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-card border border-dashed border-borderSubtle bg-panelMuted p-4 text-[13px] text-zinc-400">
          No events emitted for this message.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="space-y-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isExpanded={expandedEventId === event.id}
            onToggle={onToggleEvent}
          />
        ))}
      </div>
    </div>
  );
}
