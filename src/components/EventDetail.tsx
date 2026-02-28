import { CopyIconButton } from "./CopyIconButton";
import { ThreadEvent, formatTopLine } from "../mock/threadViewData";
import { Link } from "react-router-dom";
import { GoIcon } from "./Icons";

type EventDetailProps = {
  event: ThreadEvent;
  onClose: () => void;
};

export function EventDetail({ event, onClose }: EventDetailProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-borderSubtle bg-panel/95 px-4">
        <div className="min-w-0 pr-2">
          <h3 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">
            <span className="inline-flex items-center gap-2">
              Event: <span className="font-mono text-[12px] text-zinc-400">{event.id}</span>
              <CopyIconButton value={event.id} label="Event ID" />
              <Link
                className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2.5 py-1 text-[11px] font-normal text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                to={`/entity/${event.entityType}/${event.entityId}?eventId=${event.id}&tab=message`}
              >
                View Entity
                <GoIcon className="ml-1 h-3.5 w-3.5" />
              </Link>
            </span>
          </h3>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            aria-label="Close event detail"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
          >
            ×
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.045em] text-zinc-200">{formatTopLine(event)}</p>
        <pre className="rounded-card border border-borderSubtle bg-panelMuted p-4 font-mono text-[12px] leading-5 text-zinc-200 shadow-soft">
          {JSON.stringify(event, null, 2)}
        </pre>
      </div>
    </div>
  );
}
