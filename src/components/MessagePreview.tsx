import { ThreadEvent, getMessageForEvent } from "../mock/threadViewData";
import { formatDateTime } from "../utils/format";

type MessagePreviewProps = {
  event?: ThreadEvent;
};

export function MessagePreview({ event }: MessagePreviewProps) {
  if (!event) {
    return <div className="p-4 text-[13px] text-zinc-400">Select an event to view its source message.</div>;
  }

  const message = getMessageForEvent(event);
  if (!message) {
    return <div className="p-4 text-[13px] text-zinc-400">No message reference is available for this event.</div>;
  }

  return (
    <div className="h-full min-h-0 overflow-auto p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">
          Message: <span className="font-mono text-[12px] text-zinc-400">{message.id}</span>
        </h3>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-400">
        <span>
          <span className="text-zinc-500">Sender:</span> {message.sender}
        </span>
        <span>
          <span className="text-zinc-500">Sent:</span> {formatDateTime(message.sentAt)}
        </span>
      </div>

      <pre className="whitespace-pre-wrap rounded-card border border-borderSubtle bg-panelMuted p-4 text-[13px] leading-6 text-zinc-200 shadow-soft">
        {message.body}
      </pre>
    </div>
  );
}
