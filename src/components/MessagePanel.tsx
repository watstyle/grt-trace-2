import { getMessageForEvidenceEvent } from "../mock/evalViewData";
import { formatDateTime } from "../utils/format";

type MessagePanelProps = {
  eventId?: string;
};

export function MessagePanel({ eventId }: MessagePanelProps) {
  if (!eventId) {
    return (
      <div className="p-4 text-[13px] text-zinc-400">Select an evidence event to view the source message.</div>
    );
  }

  const messageRef = getMessageForEvidenceEvent(eventId);
  if (!messageRef) {
    return <div className="p-4 text-[13px] text-zinc-400">No source message is available for this event.</div>;
  }

  const { message } = messageRef;

  return (
    <div className="h-full min-h-0 overflow-y-scroll p-4 [scrollbar-gutter:stable]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">
          Message: <span className="font-mono text-[12px] text-zinc-400">{message.id}</span>
        </h3>
      </div>

      <div className="mb-2 text-[13px] font-medium tracking-[-0.01em] text-zinc-200">{message.subject}</div>

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
