import { ThreadMessage } from "../mock/threadViewData";

type MessageDetailProps = {
  message: ThreadMessage;
};

function formatDateTime(sentAt: string): string {
  return new Date(sentAt).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageDetail({ message }: MessageDetailProps) {
  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="mb-3 text-[14px] font-semibold tracking-[-0.01em] text-zinc-100">{message.subject}</h3>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-zinc-400">
        <span>
          <span className="text-zinc-500">Sender:</span> {message.sender}
        </span>
        <span>
          <span className="text-zinc-500">Sent:</span> {formatDateTime(message.sentAt)}
        </span>
      </div>

      <article className="rounded-card border border-borderSubtle bg-panelMuted p-4 shadow-soft">
        <pre className="whitespace-pre-wrap text-[13px] leading-6 text-zinc-200">{message.body}</pre>
      </article>
    </div>
  );
}
