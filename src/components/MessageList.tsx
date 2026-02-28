import { ThreadMessage } from "../mock/threadViewData";
import { MessageCard } from "./MessageCard";

type MessageListProps = {
  messages: ThreadMessage[];
  selectedMessageId: string;
  onSelectMessage: (messageId: string) => void;
};

export function MessageList({ messages, selectedMessageId, onSelectMessage }: MessageListProps) {
  return (
    <div className="h-full overflow-y-auto px-3 py-3">
      <div className="space-y-3">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            isSelected={selectedMessageId === message.id}
            onSelect={onSelectMessage}
          />
        ))}
      </div>
    </div>
  );
}
