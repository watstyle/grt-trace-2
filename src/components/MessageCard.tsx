import { ThreadMessage } from "../mock/threadViewData";

type MessageCardProps = {
  message: ThreadMessage;
  isSelected: boolean;
  onSelect: (messageId: string) => void;
};

function formatDateTime(sentAt: string): string {
  return new Date(sentAt).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageCard({ message, isSelected, onSelect }: MessageCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(message.id)}
      className={`w-full rounded-card border px-3 py-3 text-left shadow-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]/70 ${
        isSelected
          ? "border-[#60a5fa]/60 bg-[#182031]"
          : "border-borderSubtle bg-panelMuted hover:border-[#3b465d] hover:bg-[#171e2b]"
      }`}
    >
      <div className="mb-1 truncate text-[13px] font-medium tracking-[-0.01em] text-zinc-100">{message.sender}</div>
      <div className="mb-2 text-[12px] text-zinc-400">{formatDateTime(message.sentAt)}</div>
      <span className="inline-flex items-center rounded-full border border-[#343b48] bg-[#171b24] px-2 py-0.5 text-[11px] text-zinc-300">
        {message.events.length} events
      </span>
    </button>
  );
}
