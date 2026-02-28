import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { EventList } from "../components/EventList";
import { CopyIconButton } from "../components/CopyIconButton";
import { MessageDetail } from "../components/MessageDetail";
import { MessageList } from "../components/MessageList";
import { Panel } from "../components/Panel";
import { ThreePanelLayout } from "../components/ThreePanelLayout";
import { getMessagesForThread, getThreadById } from "../mock/threadViewData";

const DEFAULT_THREAD_ID = "t_1";

export function ThreadViewPage() {
  const { threadId: routeThreadId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedThreadId = routeThreadId ?? DEFAULT_THREAD_ID;
  const thread = getThreadById(requestedThreadId) ?? getThreadById(DEFAULT_THREAD_ID);

  if (!thread) {
    return <div className="p-6 text-zinc-200">No thread data loaded.</div>;
  }

  if (!getThreadById(requestedThreadId)) {
    return <Navigate to={`/thread/${DEFAULT_THREAD_ID}`} replace />;
  }

  const messages = getMessagesForThread(thread.id);
  const messageIdFromQuery = searchParams.get("messageId") ?? undefined;
  const eventIdFromQuery = searchParams.get("eventId") ?? undefined;

  const selectedMessage =
    messages.find((message) => message.id === messageIdFromQuery) ?? messages[0];
  const selectedEvent =
    selectedMessage?.events.find((event) => event.id === eventIdFromQuery) ?? null;

  useEffect(() => {
    if (!selectedMessage) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    if (messageIdFromQuery !== selectedMessage.id) {
      nextParams.set("messageId", selectedMessage.id);
      changed = true;
    }

    if (eventIdFromQuery && !selectedEvent) {
      nextParams.delete("eventId");
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [eventIdFromQuery, messageIdFromQuery, searchParams, selectedEvent, selectedMessage, setSearchParams]);

  const handleSelectMessage = (messageId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("messageId", messageId);
    nextParams.delete("eventId");
    setSearchParams(nextParams, { replace: true });
  };

  const handleToggleEvent = (eventId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (eventIdFromQuery === eventId) {
      nextParams.delete("eventId");
    } else {
      nextParams.set("eventId", eventId);
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <ThreePanelLayout
      topTitle={
        <span className="inline-flex items-center gap-2">
          <span>Thread: {thread.id}</span>
          <CopyIconButton value={thread.id} label="Thread ID" />
        </span>
      }
      rightWidthClass="grid-cols-[320px_minmax(0,1fr)_420px]"
      left={
        <Panel title="Messages" stickyHeader className="border-r border-borderSubtle">
          <MessageList
            messages={messages}
            selectedMessageId={selectedMessage?.id ?? ""}
            onSelectMessage={handleSelectMessage}
          />
        </Panel>
      }
      center={
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              Message: <span className="font-mono text-[12px] text-zinc-400">{selectedMessage?.id ?? "-"}</span>
              {selectedMessage ? <CopyIconButton value={selectedMessage.id} label="Message ID" /> : null}
            </span>
          }
          stickyHeader
          className="border-r border-borderSubtle"
        >
          {selectedMessage ? (
            <MessageDetail message={selectedMessage} />
          ) : (
            <div className="p-4 text-sm text-zinc-400">No message selected.</div>
          )}
        </Panel>
      }
      right={
        <Panel title="Events" stickyHeader>
          <EventList
            events={selectedMessage?.events ?? []}
            expandedEventId={selectedEvent?.id}
            onToggleEvent={handleToggleEvent}
          />
        </Panel>
      }
    />
  );
}
