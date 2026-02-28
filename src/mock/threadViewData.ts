export type EntityType = "load" | "quote" | "charge";

export type EventActor = "SHIPPER" | "CARRIER";
export type EventEntity = "LOAD" | "QUOTE" | "CHARGE";
export type EventLifecycle = "REQUEST" | "CONFIRM" | "OFFER" | "CANCEL" | "WITHDRAW" | "REJECT";
export type EventAction = "SET" | "ADD";

export type MessageRef = {
  threadId: string;
  messageId: string;
};

export type ThreadEvent = {
  id: string;
  actor: EventActor;
  entity: EventEntity;
  entityType: EntityType;
  entityId: string;
  lifecycle: EventLifecycle;
  action: EventAction;
  observedAt: string;
  messageRef: MessageRef;
  payload: Record<string, unknown>;
};

export type ThreadMessage = {
  id: string;
  sender: string;
  subject: string;
  sentAt: string;
  body: string;
  events: ThreadEvent[];
};

export type ThreadRecord = {
  id: string;
  subject: string;
  messages: ThreadMessage[];
};

export const threadViewDataById: Record<string, ThreadRecord> = {
  t_1: {
    id: "t_1",
    subject: "Load LD-8219 intake and rating",
    messages: [
      {
        id: "m_1",
        sender: "intake@shipper.com",
        subject: "New load request: LD-8219",
        sentAt: "2026-02-17T09:04:00Z",
        body: `Good morning team,\n\nPlease create load LD-8219 for lane DAL -> PHX.\nTarget pickup window: 2/20 09:00-11:00 local.\n\nThanks.`,
        events: [
          {
            id: "ev_101",
            actor: "SHIPPER",
            entity: "LOAD",
            entityType: "load",
            entityId: "ld_8219",
            lifecycle: "REQUEST",
            action: "SET",
            observedAt: "2026-02-17T09:04:14Z",
            messageRef: { threadId: "t_1", messageId: "m_1" },
            payload: {
              loadRef: "LD-8219",
              lane: { origin: "DAL", destination: "PHX" },
              pickupWindow: {
                start: "2026-02-20T15:00:00Z",
                end: "2026-02-20T17:00:00Z",
              },
              equipment: "53ft_dry_van",
              weightLbs: 21600,
            },
          },
        ],
      },
      {
        id: "m_2",
        sender: "pricing@carrierhub.io",
        subject: "Quote + accessorial structure for LD-8219",
        sentAt: "2026-02-17T09:36:00Z",
        body: `We can offer primary linehaul at 1850 USD and include fuel surcharge estimate.\n\nPlease confirm if accessorials should be split by line item.`,
        events: [
          {
            id: "ev_102",
            actor: "CARRIER",
            entity: "QUOTE",
            entityType: "quote",
            entityId: "q_31",
            lifecycle: "OFFER",
            action: "ADD",
            observedAt: "2026-02-17T09:36:18Z",
            messageRef: { threadId: "t_1", messageId: "m_2" },
            payload: {
              quoteId: "q_31",
              currency: "USD",
              linehaul: 1850,
              fuelSurcharge: 210,
              total: 2060,
              notes: ["subject_to_detention_policy"],
            },
          },
          {
            id: "ev_103",
            actor: "CARRIER",
            entity: "CHARGE",
            entityType: "charge",
            entityId: "c_09",
            lifecycle: "OFFER",
            action: "ADD",
            observedAt: "2026-02-17T09:36:26Z",
            messageRef: { threadId: "t_1", messageId: "m_2" },
            payload: {
              chargeId: "c_09",
              chargeType: "fuel_surcharge",
              amount: 210,
              source: "index_rate_card",
            },
          },
        ],
      },
      {
        id: "m_3",
        sender: "ops@shipper.com",
        subject: "Confirmed: q_31 selected, pickup appointment set",
        sentAt: "2026-02-17T10:12:00Z",
        body: `Confirmed on our side.\n\nPlease set requested pickup appointment for 10:00 local and lock quote q_31 as primary.`,
        events: [
          {
            id: "ev_104",
            actor: "SHIPPER",
            entity: "LOAD",
            entityType: "load",
            entityId: "ld_8219",
            lifecycle: "CONFIRM",
            action: "SET",
            observedAt: "2026-02-17T10:12:42Z",
            messageRef: { threadId: "t_1", messageId: "m_3" },
            payload: {
              loadRef: "LD-8219",
              appointment: {
                pickupAt: "2026-02-20T16:00:00Z",
                timezone: "America/Chicago",
              },
              selectedQuoteId: "q_31",
            },
          },
        ],
      },
      {
        id: "m_4",
        sender: "automation@carrierhub.io",
        subject: "System notice: revised fuel charge and reserve",
        sentAt: "2026-02-17T10:41:00Z",
        body: `System notice:\n\nOriginal accessorial estimate withdrawn. Replacing with revised fuel amount and adding lumper reserve pending POD.`,
        events: [
          {
            id: "ev_105",
            actor: "CARRIER",
            entity: "CHARGE",
            entityType: "charge",
            entityId: "c_09",
            lifecycle: "WITHDRAW",
            action: "SET",
            observedAt: "2026-02-17T10:41:17Z",
            messageRef: { threadId: "t_1", messageId: "m_4" },
            payload: {
              chargeId: "c_09",
              previousAmount: 210,
              reason: "index_recalc",
              status: "withdrawn",
            },
          },
          {
            id: "ev_106",
            actor: "CARRIER",
            entity: "CHARGE",
            entityType: "charge",
            entityId: "c_10",
            lifecycle: "OFFER",
            action: "ADD",
            observedAt: "2026-02-17T10:41:23Z",
            messageRef: { threadId: "t_1", messageId: "m_4" },
            payload: {
              chargeId: "c_10",
              chargeType: "fuel_surcharge",
              amount: 238,
              confidence: 0.91,
              audit: {
                modelVersion: "rate-v4.2",
                generatedAt: "2026-02-17T10:40:31Z",
              },
            },
          },
        ],
      },
      {
        id: "m_5",
        sender: "billing@shipper.com",
        subject: "Policy update: reject lumper pre-bill",
        sentAt: "2026-02-17T11:05:00Z",
        body: `Please reject any lumper pre-bill. We only reimburse upon actual receipt.`,
        events: [
          {
            id: "ev_107",
            actor: "SHIPPER",
            entity: "CHARGE",
            entityType: "charge",
            entityId: "c_10",
            lifecycle: "REJECT",
            action: "SET",
            observedAt: "2026-02-17T11:05:14Z",
            messageRef: { threadId: "t_1", messageId: "m_5" },
            payload: {
              targetChargeType: "lumper",
              policy: "receipt_required",
              status: "rejected_prebill",
            },
          },
        ],
      },
      {
        id: "m_6",
        sender: "noreply@carrierhub.io",
        subject: "Acknowledged",
        sentAt: "2026-02-17T11:32:00Z",
        body: `Acknowledged. No additional events emitted for this message.`,
        events: [],
      },
      {
        id: "m_7",
        sender: "dispatch@carrierhub.io",
        subject: "Final bundle re-sent for LD-8219",
        sentAt: "2026-02-17T12:08:00Z",
        body: `Re-sent final bundle for LD-8219.\n\nQuote q_31 is active and charge c_10 is linked as fuel line item.`,
        events: [
          {
            id: "ev_108",
            actor: "CARRIER",
            entity: "LOAD",
            entityType: "load",
            entityId: "ld_8219",
            lifecycle: "CONFIRM",
            action: "SET",
            observedAt: "2026-02-17T12:08:22Z",
            messageRef: { threadId: "t_1", messageId: "m_7" },
            payload: {
              loadRef: "LD-8219",
              quoteId: "q_31",
              chargeIds: ["c_10"],
              dispatchStatus: "ready",
            },
          },
        ],
      },
    ],
  },
};

export function getThreadById(threadId: string): ThreadRecord | undefined {
  return threadViewDataById[threadId];
}

export function getMessagesForThread(threadId: string): ThreadMessage[] {
  const thread = getThreadById(threadId);
  if (!thread) {
    return [];
  }

  return [...thread.messages].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function getMessageById(threadId: string, messageId: string): ThreadMessage | undefined {
  return getMessagesForThread(threadId).find((message) => message.id === messageId);
}

export function getAllEventsForThread(threadId: string): ThreadEvent[] {
  return getMessagesForThread(threadId)
    .flatMap((message) => message.events)
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
}

export function getEventById(threadId: string, eventId: string): ThreadEvent | undefined {
  return getAllEventsForThread(threadId).find((event) => event.id === eventId);
}

export function getMessageForEvent(event: ThreadEvent): ThreadMessage | undefined {
  return getMessageById(event.messageRef.threadId, event.messageRef.messageId);
}

export function formatTopLine(event: Pick<ThreadEvent, "actor" | "entity" | "lifecycle" | "action">): string {
  return `${event.actor} - ${event.entity} - ${event.lifecycle} - ${event.action}`;
}
