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

type LaneSeed = {
  originCode: string;
  destinationCode: string;
  originCity: string;
  destinationCity: string;
  originState: string;
  destinationState: string;
};

const THREAD_COUNT = 10;

const LANE_SEEDS: LaneSeed[] = [
  {
    originCode: "DAL",
    destinationCode: "PHX",
    originCity: "Dallas",
    destinationCity: "Phoenix",
    originState: "TX",
    destinationState: "AZ",
  },
  {
    originCode: "ATL",
    destinationCode: "MIA",
    originCity: "Atlanta",
    destinationCity: "Miami",
    originState: "GA",
    destinationState: "FL",
  },
  {
    originCode: "SEA",
    destinationCode: "SLC",
    originCity: "Seattle",
    destinationCity: "Salt Lake City",
    originState: "WA",
    destinationState: "UT",
  },
  {
    originCode: "DEN",
    destinationCode: "LAS",
    originCity: "Denver",
    destinationCity: "Las Vegas",
    originState: "CO",
    destinationState: "NV",
  },
  {
    originCode: "CHI",
    destinationCode: "BOS",
    originCity: "Chicago",
    destinationCity: "Boston",
    originState: "IL",
    destinationState: "MA",
  },
  {
    originCode: "NASH",
    destinationCode: "CLT",
    originCity: "Nashville",
    destinationCity: "Charlotte",
    originState: "TN",
    destinationState: "NC",
  },
  {
    originCode: "LAX",
    destinationCode: "PDX",
    originCity: "Los Angeles",
    destinationCity: "Portland",
    originState: "CA",
    destinationState: "OR",
  },
  {
    originCode: "HOU",
    destinationCode: "OKC",
    originCity: "Houston",
    destinationCity: "Oklahoma City",
    originState: "TX",
    destinationState: "OK",
  },
  {
    originCode: "MSP",
    destinationCode: "KCMO",
    originCity: "Minneapolis",
    destinationCity: "Kansas City",
    originState: "MN",
    destinationState: "MO",
  },
  {
    originCode: "RNO",
    destinationCode: "SAC",
    originCity: "Reno",
    destinationCity: "Sacramento",
    originState: "NV",
    destinationState: "CA",
  },
];

const threadIds = Array.from({ length: THREAD_COUNT }, (_, index) => `t_${index + 1}`);

function iso(dayInFeb: number, hour: number, minute: number, second = 0): string {
  return new Date(Date.UTC(2026, 1, dayInFeb, hour, minute, second)).toISOString();
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function buildThread(index: number): ThreadRecord {
  const threadNumber = index + 1;
  const threadId = threadIds[index];
  const lane = LANE_SEEDS[index % LANE_SEEDS.length];
  const loadId = threadNumber === 1 ? "ld_8219" : `ld_${8218 + threadNumber}`;
  const quoteId = `q_${30 + threadNumber}`;
  const chargeId = `c_${9 + threadNumber}`;

  const messageBase = index * 6;
  const messageIds = Array.from({ length: 6 }, (_, msgIndex) => `m_${messageBase + msgIndex + 1}`);

  const eventBase = 101 + index * 6;
  const eventIds = Array.from({ length: 6 }, (_, eventIndex) => `ev_${eventBase + eventIndex}`);

  const quoteFinalLifecycle: EventLifecycle =
    threadNumber % 5 === 0 ? "REJECT" : threadNumber % 4 === 0 ? "WITHDRAW" : "CONFIRM";
  const chargeLifecycle: EventLifecycle =
    threadNumber % 3 === 0 ? "WITHDRAW" : threadNumber % 2 === 0 ? "CONFIRM" : "OFFER";

  const linehaul = 1600 + threadNumber * 55;
  const fuel = 170 + threadNumber * 12;
  const expectedTotal = linehaul + fuel;

  const day = 17 + index;

  const eventsByMessage: Record<string, ThreadEvent[]> = {
    [messageIds[0]]: [
      {
        id: eventIds[0],
        actor: "SHIPPER",
        entity: "LOAD",
        entityType: "load",
        entityId: loadId,
        lifecycle: "REQUEST",
        action: "SET",
        observedAt: iso(day, 9, 4, 12),
        messageRef: { threadId, messageId: messageIds[0] },
        payload: {
          loadRef: loadId.toUpperCase(),
          lane: { origin: lane.originCode, destination: lane.destinationCode },
          serviceLevel: threadNumber % 2 === 0 ? "expedited" : "standard",
          equipment: threadNumber % 2 === 0 ? "reefer" : "53ft_dry_van",
          requestedPickup: iso(day + 2, 14, 0),
          proofText: `Please request ${loadId.toUpperCase()} for ${lane.originCode} to ${lane.destinationCode}.`,
        },
      },
    ],
    [messageIds[1]]: [
      {
        id: eventIds[1],
        actor: "CARRIER",
        entity: "QUOTE",
        entityType: "quote",
        entityId: quoteId,
        lifecycle: "OFFER",
        action: "ADD",
        observedAt: iso(day, 9, 29, 5),
        messageRef: { threadId, messageId: messageIds[1] },
        payload: {
          quoteId,
          linehaul,
          fuelSurcharge: fuel,
          total: expectedTotal,
          service_offering: threadNumber % 2 === 0 ? "Dedicated" : "Quipment",
          line_items: [
            { code: "LINEHAUL", amount: linehaul, currency: "USD" },
            { code: "FUEL", amount: fuel, currency: "USD" },
          ],
          lane: {
            origin: { city: lane.originCity, state: lane.originState, code: lane.originCode },
            destination: { city: lane.destinationCity, state: lane.destinationState, code: lane.destinationCode },
          },
          references: {
            cust_ship_id: `CS-${7000 + threadNumber}`,
            quote_ref: `QREF-${300 + threadNumber}`,
          },
          proofText: `Carrier offered quote ${quoteId} totaling ${formatCurrency(expectedTotal)} USD.`,
        },
      },
      {
        id: eventIds[2],
        actor: "CARRIER",
        entity: "CHARGE",
        entityType: "charge",
        entityId: chargeId,
        lifecycle: "OFFER",
        action: "ADD",
        observedAt: iso(day, 9, 29, 23),
        messageRef: { threadId, messageId: messageIds[1] },
        payload: {
          chargeId,
          chargeType: threadNumber % 2 === 0 ? "FUEL" : "LAYOVER",
          amount: fuel,
          service_offering: threadNumber % 2 === 0 ? "Dedicated" : "Quipment",
          line_items: [{ code: threadNumber % 2 === 0 ? "FUEL" : "LAYOVER", amount: fuel, currency: "USD" }],
          lane: {
            origin: { city: lane.originCity, state: lane.originState, code: lane.originCode },
          },
          references: {
            invoice_id: `INV-${10000 + threadNumber}`,
            line_item_id: `LI-${80000 + threadNumber}`,
          },
          proofText: `Charge ${chargeId} was offered for ${formatCurrency(fuel)} USD.`,
        },
      },
    ],
    [messageIds[2]]: [
      {
        id: eventIds[3],
        actor: "SHIPPER",
        entity: "LOAD",
        entityType: "load",
        entityId: loadId,
        lifecycle: "CONFIRM",
        action: "SET",
        observedAt: iso(day, 10, 2, 17),
        messageRef: { threadId, messageId: messageIds[2] },
        payload: {
          selectedQuoteId: quoteId,
          activeChargeIds: [chargeId],
          appointment: {
            pickupAt: iso(day + 2, 16, 0),
            timezone: "America/Chicago",
          },
          proofText: `Shipper confirmed ${quoteId} for ${loadId}.`,
        },
      },
    ],
    [messageIds[3]]: [
      {
        id: eventIds[4],
        actor: chargeLifecycle === "WITHDRAW" ? "CARRIER" : "SHIPPER",
        entity: "CHARGE",
        entityType: "charge",
        entityId: chargeId,
        lifecycle: chargeLifecycle,
        action: "SET",
        observedAt: iso(day, 10, 31, 28),
        messageRef: { threadId, messageId: messageIds[3] },
        payload: {
          chargeId,
          status: chargeLifecycle.toLowerCase(),
          amount: chargeLifecycle === "WITHDRAW" ? 0 : fuel,
          reason: chargeLifecycle === "WITHDRAW" ? "carrier_reprice" : "confirmed_by_policy",
          proofText:
            chargeLifecycle === "WITHDRAW"
              ? `Carrier withdrew ${chargeId} pending revised documentation.`
              : `Shipper confirmed charge ${chargeId} as acceptable.`,
        },
      },
    ],
    [messageIds[4]]: [
      {
        id: eventIds[5],
        actor: quoteFinalLifecycle === "WITHDRAW" ? "CARRIER" : "SHIPPER",
        entity: "QUOTE",
        entityType: "quote",
        entityId: quoteId,
        lifecycle: quoteFinalLifecycle,
        action: "SET",
        observedAt: iso(day, 11, 0, 41),
        messageRef: { threadId, messageId: messageIds[4] },
        payload: {
          quoteId,
          status: quoteFinalLifecycle.toLowerCase(),
          total: expectedTotal,
          reason:
            quoteFinalLifecycle === "REJECT"
              ? "rate_above_budget"
              : quoteFinalLifecycle === "WITHDRAW"
                ? "carrier_capacity_shift"
                : "selected_primary",
          proofText:
            quoteFinalLifecycle === "REJECT"
              ? `Shipper rejected ${quoteId} due to budget constraints.`
              : quoteFinalLifecycle === "WITHDRAW"
                ? `Carrier withdrew quote ${quoteId} after capacity change.`
                : `Quote ${quoteId} confirmed as primary.`,
        },
      },
    ],
    [messageIds[5]]: [],
  };

  const messages: ThreadMessage[] = [
    {
      id: messageIds[0],
      sender: `ops${threadNumber}@shipperco.com`,
      subject: `Load Request ${loadId.toUpperCase()} (${lane.originCode} -> ${lane.destinationCode})`,
      sentAt: iso(day, 9, 4),
      body: `Team,\n\nPlease request ${loadId.toUpperCase()} from ${lane.originCity}, ${lane.originState} to ${lane.destinationCity}, ${lane.destinationState}.\nKeep standard appointment policy and confirm with carrier.`,
      events: eventsByMessage[messageIds[0]],
    },
    {
      id: messageIds[1],
      sender: `pricing${threadNumber}@carrierfleet.com`,
      subject: `Quote + Accessorials for ${loadId.toUpperCase()}`,
      sentAt: iso(day, 9, 28),
      body: `Carrier pricing attached.\nQuote ${quoteId} includes linehaul and fuel estimate.\nCharge ${chargeId} added for traceability.`,
      events: eventsByMessage[messageIds[1]],
    },
    {
      id: messageIds[2],
      sender: `planner${threadNumber}@shipperco.com`,
      subject: `Confirmed quote for ${loadId.toUpperCase()}`,
      sentAt: iso(day, 10, 2),
      body: `Confirming quote ${quoteId} and linking charge ${chargeId}.\nPickup appointment should be locked to local facility window.`,
      events: eventsByMessage[messageIds[2]],
    },
    {
      id: messageIds[3],
      sender: `billing${threadNumber}@carrierfleet.com`,
      subject: `Charge update for ${loadId.toUpperCase()}`,
      sentAt: iso(day, 10, 31),
      body:
        chargeLifecycle === "WITHDRAW"
          ? `Withdrawing ${chargeId} while we rerun the rate model.`
          : `Confirming ${chargeId}; this line item is aligned to shipper policy.`,
      events: eventsByMessage[messageIds[3]],
    },
    {
      id: messageIds[4],
      sender: `controls${threadNumber}@shipperco.com`,
      subject: `Quote decision for ${quoteId}`,
      sentAt: iso(day, 11, 0),
      body:
        quoteFinalLifecycle === "REJECT"
          ? `Rejecting ${quoteId}; total exceeded budget tolerance.`
          : quoteFinalLifecycle === "WITHDRAW"
            ? `Carrier has withdrawn ${quoteId}. Please proceed with fallback lane options.`
            : `Approving ${quoteId} as the final quote for execution.`,
      events: eventsByMessage[messageIds[4]],
    },
    {
      id: messageIds[5],
      sender: `noreply${threadNumber}@carrierfleet.com`,
      subject: `Acknowledged ${loadId.toUpperCase()}`,
      sentAt: iso(day, 11, 42),
      body: "Acknowledged. No additional events emitted in this message.",
      events: eventsByMessage[messageIds[5]],
    },
  ];

  return {
    id: threadId,
    subject: `Trace for ${loadId.toUpperCase()} (${lane.originCode} -> ${lane.destinationCode})`,
    messages,
  };
}

export const threadViewDataById: Record<string, ThreadRecord> = threadIds.reduce<Record<string, ThreadRecord>>(
  (acc, _, index) => {
    const thread = buildThread(index);
    acc[thread.id] = thread;
    return acc;
  },
  {},
);

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

export function getAllEvents(): ThreadEvent[] {
  return Object.values(threadViewDataById)
    .flatMap((thread) => getAllEventsForThread(thread.id))
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
