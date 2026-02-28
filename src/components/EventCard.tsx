import { ThreadEvent, formatTopLine } from "../mock/threadViewData";
import { Link } from "react-router-dom";
import { CopyIconButton } from "./CopyIconButton";
import { ChevronDownIcon, GoIcon } from "./Icons";

type EventCardProps = {
  event: ThreadEvent;
  isExpanded: boolean;
  onToggle: (eventId: string) => void;
};

export function EventCard({ event, isExpanded, onToggle }: EventCardProps) {
  return (
    <article className="overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
      <button
        type="button"
        onClick={() => onToggle(event.id)}
        aria-label={isExpanded ? "Collapse event" : "Expand event"}
        className="flex h-10 w-full items-center justify-between border-b border-borderSubtle px-3 text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]/70"
      >
        <h3 className="truncate pr-2 text-[12px] font-semibold uppercase tracking-[0.045em] text-zinc-100">
          {formatTopLine(event)}
        </h3>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400">
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
        </span>
      </button>

      {isExpanded ? (
        <>
          <div className="p-3">
            <pre className="stable-scroll max-h-[320px] overflow-auto rounded-lg border border-borderSubtle bg-[#121722] p-3 font-mono text-[12px] leading-5 text-zinc-200">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
          <div className="flex h-10 items-center justify-between border-t border-borderSubtle px-3">
            <p className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400">
              <span>Event: {event.id}</span>
              <CopyIconButton value={event.id} label="Event ID" />
            </p>
            <Link
              className="inline-flex items-center rounded-full border border-[#343b48] bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-[#4d5a74] hover:text-zinc-100"
              to={`/entity/${event.entityType}/${event.entityId}?eventId=${event.id}&view=event-log`}
            >
              View Entity
              <GoIcon className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      ) : (
        <div className="flex h-10 items-center justify-between px-3">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400">
            <span>Event: {event.id}</span>
            <CopyIconButton value={event.id} label="Event ID" />
          </p>
          <Link
            className="inline-flex items-center rounded-full border border-[#343b48] bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-[#4d5a74] hover:text-zinc-100"
            to={`/entity/${event.entityType}/${event.entityId}?eventId=${event.id}&view=event-log`}
          >
            View Entity
            <GoIcon className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </article>
  );
}
