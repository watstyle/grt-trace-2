import { EntityType, EventLifecycle, ThreadEvent, getAllEventsForThread, threadViewDataById } from "./threadViewData";

export type EvalStatus = "PASS" | "FAIL" | "UNKNOWN" | "MAPPED" | "MATCHED";

export type EvalRecord = {
  id: string;
  lineItem: string;
  checkType: "MAP-1" | "MATCH-1" | "LINE-2" | "TOTAL-1" | "RULE-7";
  expectedValue: string;
  observedValue: string;
  delta: string;
  status: EvalStatus;
  reasonCodes: string[];
  raw: Record<string, unknown>;
};

export type EventSnapshot = {
  metadata: Record<string, unknown>;
  canonicalState: Record<string, unknown>;
  evals: EvalRecord[];
};

export type EntityRecord = {
  entityType: EntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  canonicalState: Record<string, unknown>;
  eventLog: ThreadEvent[];
  evals: EvalRecord[];
  eventSnapshots: Record<string, EventSnapshot>;
};

type ThreadFlow = {
  threadId: string;
  loadId: string;
  quoteId: string;
  chargeId: string;
  events: ThreadEvent[];
  originCode: string;
  destinationCode: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
};

const CITY_STATE_BY_CODE: Record<string, { city: string; state: string }> = {
  DAL: { city: "Dallas", state: "TX" },
  PHX: { city: "Phoenix", state: "AZ" },
  ATL: { city: "Atlanta", state: "GA" },
  MIA: { city: "Miami", state: "FL" },
  SEA: { city: "Seattle", state: "WA" },
  SLC: { city: "Salt Lake City", state: "UT" },
  DEN: { city: "Denver", state: "CO" },
  LAS: { city: "Las Vegas", state: "NV" },
  CHI: { city: "Chicago", state: "IL" },
  BOS: { city: "Boston", state: "MA" },
  NASH: { city: "Nashville", state: "TN" },
  CLT: { city: "Charlotte", state: "NC" },
  LAX: { city: "Los Angeles", state: "CA" },
  PDX: { city: "Portland", state: "OR" },
  HOU: { city: "Houston", state: "TX" },
  OKC: { city: "Oklahoma City", state: "OK" },
  MSP: { city: "Minneapolis", state: "MN" },
  KCMO: { city: "Kansas City", state: "MO" },
  RNO: { city: "Reno", state: "NV" },
  SAC: { city: "Sacramento", state: "CA" },
};

function money(value: number): string {
  return value.toFixed(2);
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function eventState(lifecycle: EventLifecycle): string {
  if (lifecycle === "REQUEST") {
    return "requested";
  }
  if (lifecycle === "OFFER") {
    return "offered";
  }
  if (lifecycle === "CONFIRM") {
    return "confirmed";
  }
  if (lifecycle === "WITHDRAW") {
    return "withdrawn";
  }
  if (lifecycle === "REJECT") {
    return "rejected";
  }
  return "cancelled";
}

function evalRecord(
  id: string,
  lineItem: string,
  checkType: EvalRecord["checkType"],
  expectedValue: string,
  observedValue: string,
  delta: string,
  status: EvalStatus,
  reasonCodes: string[],
  raw: Record<string, unknown>,
): EvalRecord {
  return {
    id,
    lineItem,
    checkType,
    expectedValue,
    observedValue,
    delta,
    status,
    reasonCodes,
    raw,
  };
}

function byObservedAtAscending(events: ThreadEvent[]): ThreadEvent[] {
  return [...events].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
}

function eventProof(event: ThreadEvent): string {
  if (typeof event.payload.proofText === "string" && event.payload.proofText.trim().length > 0) {
    return event.payload.proofText;
  }
  return `${event.entityType.toUpperCase()} ${event.lifecycle} event observed in ${event.messageRef.messageId}.`;
}

function getLifecycleStatus(event: ThreadEvent | undefined): string {
  if (!event) {
    return "unknown";
  }
  return eventState(event.lifecycle);
}

function mapLaneCodes(loadEvent: ThreadEvent): {
  originCode: string;
  destinationCode: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
} {
  const lane = (loadEvent.payload.lane ?? {}) as { origin?: unknown; destination?: unknown };
  const originCode = typeof lane.origin === "string" ? lane.origin : "UNK";
  const destinationCode = typeof lane.destination === "string" ? lane.destination : "UNK";

  const origin = CITY_STATE_BY_CODE[originCode] ?? { city: originCode, state: "NA" };
  const destination = CITY_STATE_BY_CODE[destinationCode] ?? { city: destinationCode, state: "NA" };

  return {
    originCode,
    destinationCode,
    originCity: origin.city,
    originState: origin.state,
    destinationCity: destination.city,
    destinationState: destination.state,
  };
}

const threadFlows: ThreadFlow[] = Object.values(threadViewDataById)
  .map((thread) => {
    const events = byObservedAtAscending(getAllEventsForThread(thread.id));
    const loadEvent = events.find((event) => event.entityType === "load");
    const quoteEvent = events.find((event) => event.entityType === "quote");
    const chargeEvent = events.find((event) => event.entityType === "charge");

    if (!loadEvent || !quoteEvent || !chargeEvent) {
      return undefined;
    }

    const lane = mapLaneCodes(loadEvent);

    return {
      threadId: thread.id,
      loadId: loadEvent.entityId,
      quoteId: quoteEvent.entityId,
      chargeId: chargeEvent.entityId,
      events,
      ...lane,
    } satisfies ThreadFlow;
  })
  .filter((flow): flow is ThreadFlow => Boolean(flow));

function getLoadRecord(flow: ThreadFlow, flowIndex: number): EntityRecord {
  const latestLoadEvent = [...flow.events].reverse().find((event) => event.entityType === "load");
  const latestQuoteEvent = [...flow.events].reverse().find((event) => event.entityType === "quote" && event.entityId === flow.quoteId);
  const latestChargeEvent = [...flow.events].reverse().find((event) => event.entityType === "charge" && event.entityId === flow.chargeId);

  const quoteOfferEvent = flow.events.find((event) => event.entityType === "quote" && event.entityId === flow.quoteId);
  const chargeOfferEvent = flow.events.find((event) => event.entityType === "charge" && event.entityId === flow.chargeId);

  const linehaul = toNumber(quoteOfferEvent?.payload.linehaul, 1700 + flowIndex * 65);
  const fuel = toNumber(chargeOfferEvent?.payload.amount, 200 + flowIndex * 12);
  const expectedTotal = linehaul + fuel;

  const failMatch = flowIndex % 2 === 1;
  const unknownDocs = flowIndex % 4 === 0;
  const observedTotal = failMatch ? expectedTotal + 75 : expectedTotal;
  const delta = observedTotal - expectedTotal;

  const metadata = {
    lane: [
      {
        stop: "pickup",
        location: `${flow.originCity}, ${flow.originState}`,
        code: flow.originCode,
      },
      {
        stop: "delivery",
        location: `${flow.destinationCity}, ${flow.destinationState}`,
        code: flow.destinationCode,
      },
    ],
    proof_text: eventProof(flow.events[0]),
    constraints: [
      "currency=USD",
      "proof_source=email",
      "lifecycle_tracking=enabled",
      `thread=${flow.threadId}`,
    ],
    references: {
      threadId: flow.threadId,
      quoteId: flow.quoteId,
      chargeId: flow.chargeId,
    },
  };

  const canonicalState = {
    loadId: flow.loadId,
    status: getLifecycleStatus(latestLoadEvent),
    lane: {
      origin: flow.originCode,
      destination: flow.destinationCode,
    },
    selectedQuoteId: flow.quoteId,
    chargeIds: [flow.chargeId],
    totalAmount: observedTotal,
    updatedAt: latestLoadEvent?.observedAt ?? flow.events[flow.events.length - 1]?.observedAt,
  };

  const evals: EvalRecord[] = [
    evalRecord(
      `eval_${flow.loadId}_map`,
      "fuel",
      "MAP-1",
      money(fuel),
      money(fuel),
      money(0),
      "MAPPED",
      ["CHARGE_CODE_MAPPED"],
      {
        sourceEventId: chargeOfferEvent?.id,
        evidenceEventIds: [chargeOfferEvent?.id].filter(Boolean),
      },
    ),
    evalRecord(
      `eval_${flow.loadId}_match`,
      "linehaul",
      "MATCH-1",
      money(expectedTotal),
      money(observedTotal),
      delta > 0 ? `+${money(delta)}` : money(delta),
      failMatch ? "FAIL" : "MATCHED",
      failMatch ? ["AMOUNT_OVERBILL"] : ["MATCHED_CHARGES"],
      {
        sourceEventId: latestLoadEvent?.id,
        evidenceEventIds: [quoteOfferEvent?.id, latestLoadEvent?.id].filter(Boolean),
      },
    ),
    evalRecord(
      `eval_${flow.loadId}_docs`,
      "pod_receipt",
      "RULE-7",
      money(1),
      money(unknownDocs ? 0 : 1),
      unknownDocs ? "N/A" : money(0),
      unknownDocs ? "UNKNOWN" : "PASS",
      unknownDocs ? ["AWAITING_RECEIPT"] : ["DOCS_COMPLETE"],
      {
        sourceEventId: latestQuoteEvent?.id ?? latestLoadEvent?.id,
        evidenceEventIds: [latestQuoteEvent?.id ?? latestLoadEvent?.id].filter(Boolean),
      },
    ),
  ];

  const eventSnapshots: Record<string, EventSnapshot> = {};
  for (const event of flow.events) {
    const snapshotFail = event.lifecycle === "REJECT" || event.lifecycle === "WITHDRAW" || event.lifecycle === "CANCEL";

    eventSnapshots[event.id] = {
      metadata: {
        ...metadata,
        proof_text: eventProof(event),
        selectedEventId: event.id,
      },
      canonicalState: {
        ...canonicalState,
        status: eventState(event.lifecycle),
        lastEventId: event.id,
        updatedAt: event.observedAt,
      },
      evals: [
        evalRecord(
          `eval_${flow.loadId}_${event.id}_snap`,
          event.entityType === "quote" ? "quote_total" : event.entityType === "charge" ? "charge_code" : "load_lifecycle",
          event.entityType === "charge" ? "MAP-1" : event.entityType === "quote" ? "MATCH-1" : "RULE-7",
          money(100),
          money(snapshotFail ? 125 : 100),
          snapshotFail ? "+25.00" : "0.00",
          snapshotFail ? "FAIL" : "PASS",
          snapshotFail ? ["STATE_MISMATCH"] : ["STATE_ALIGNED"],
          {
            sourceEventId: event.id,
            evidenceEventIds: [event.id],
          },
        ),
      ],
    };
  }

  return {
    entityType: "load",
    entityId: flow.loadId,
    metadata,
    canonicalState,
    eventLog: flow.events,
    evals,
    eventSnapshots,
  };
}

function getQuoteRecord(flow: ThreadFlow, flowIndex: number): EntityRecord {
  const quoteEvents = byObservedAtAscending(
    flow.events.filter((event) => event.entityType === "quote" && event.entityId === flow.quoteId),
  );

  const latestQuoteEvent = quoteEvents[quoteEvents.length - 1];
  const offeredQuoteEvent = quoteEvents.find((event) => event.lifecycle === "OFFER") ?? quoteEvents[0];
  const linehaul = toNumber(offeredQuoteEvent?.payload.linehaul, 1600 + flowIndex * 70);
  const fuel = toNumber(offeredQuoteEvent?.payload.fuelSurcharge, 180 + flowIndex * 10);
  const total = toNumber(offeredQuoteEvent?.payload.total, linehaul + fuel);

  const finalIsNegative =
    latestQuoteEvent?.lifecycle === "REJECT" || latestQuoteEvent?.lifecycle === "WITHDRAW" || latestQuoteEvent?.lifecycle === "CANCEL";

  const metadata = {
    lane: [
      {
        stop: "pickup",
        location: `${flow.originCity}, ${flow.originState}`,
        code: flow.originCode,
      },
      {
        stop: "delivery",
        location: `${flow.destinationCity}, ${flow.destinationState}`,
        code: flow.destinationCode,
      },
    ],
    proof_text: eventProof(latestQuoteEvent ?? offeredQuoteEvent),
    constraints: ["currency=USD", "quote_scope=per_load", `parent_load=${flow.loadId}`],
    references: {
      parentLoadId: flow.loadId,
      threadId: flow.threadId,
    },
  };

  const canonicalState = {
    quoteId: flow.quoteId,
    parentLoadId: flow.loadId,
    status: getLifecycleStatus(latestQuoteEvent),
    linehaul,
    fuelSurcharge: fuel,
    total,
    selectedByEventId: latestQuoteEvent?.id,
    updatedAt: latestQuoteEvent?.observedAt ?? offeredQuoteEvent?.observedAt,
  };

  const evals: EvalRecord[] = [
    evalRecord(
      `eval_${flow.quoteId}_total`,
      "quote_total",
      "MATCH-1",
      money(total),
      money(finalIsNegative ? total + 40 : total),
      finalIsNegative ? "+40.00" : "0.00",
      finalIsNegative ? "FAIL" : "MATCHED",
      finalIsNegative ? ["QUOTE_DEVIATION"] : ["MATCHED_CHARGES"],
      {
        sourceEventId: latestQuoteEvent?.id,
        evidenceEventIds: [offeredQuoteEvent?.id, latestQuoteEvent?.id].filter(Boolean),
      },
    ),
    evalRecord(
      `eval_${flow.quoteId}_state`,
      "quote_lifecycle",
      "RULE-7",
      money(1),
      money(finalIsNegative ? 0 : 1),
      finalIsNegative ? "N/A" : "0.00",
      finalIsNegative ? "UNKNOWN" : "PASS",
      finalIsNegative ? ["FINAL_STATE_NEGATIVE"] : ["FINAL_STATE_VALID"],
      {
        sourceEventId: latestQuoteEvent?.id,
        evidenceEventIds: [latestQuoteEvent?.id].filter(Boolean),
      },
    ),
  ];

  const eventSnapshots: Record<string, EventSnapshot> = {};
  for (const event of quoteEvents) {
    const negative = event.lifecycle === "REJECT" || event.lifecycle === "WITHDRAW" || event.lifecycle === "CANCEL";

    eventSnapshots[event.id] = {
      metadata: {
        ...metadata,
        proof_text: eventProof(event),
        selectedEventId: event.id,
      },
      canonicalState: {
        ...canonicalState,
        status: eventState(event.lifecycle),
        updatedAt: event.observedAt,
      },
      evals: [
        evalRecord(
          `eval_${flow.quoteId}_${event.id}_snap`,
          "quote_snapshot",
          "MATCH-1",
          money(total),
          money(negative ? total + 25 : total),
          negative ? "+25.00" : "0.00",
          negative ? "FAIL" : "PASS",
          negative ? ["SNAPSHOT_VARIANCE"] : ["SNAPSHOT_ALIGNED"],
          {
            sourceEventId: event.id,
            evidenceEventIds: [event.id],
          },
        ),
      ],
    };
  }

  return {
    entityType: "quote",
    entityId: flow.quoteId,
    metadata,
    canonicalState,
    eventLog: quoteEvents,
    evals,
    eventSnapshots,
  };
}

function getChargeRecord(flow: ThreadFlow, flowIndex: number): EntityRecord {
  const chargeEvents = byObservedAtAscending(
    flow.events.filter((event) => event.entityType === "charge" && event.entityId === flow.chargeId),
  );

  const latestChargeEvent = chargeEvents[chargeEvents.length - 1];
  const offeredChargeEvent = chargeEvents.find((event) => event.lifecycle === "OFFER") ?? chargeEvents[0];
  const amount = toNumber(offeredChargeEvent?.payload.amount, 175 + flowIndex * 9);

  const metadata = {
    lane: [
      {
        stop: "pickup",
        location: `${flow.originCity}, ${flow.originState}`,
        code: flow.originCode,
      },
      {
        stop: "delivery",
        location: `${flow.destinationCity}, ${flow.destinationState}`,
        code: flow.destinationCode,
      },
    ],
    proof_text: eventProof(latestChargeEvent ?? offeredChargeEvent),
    constraints: ["currency=USD", "charge_trace=enabled", `parent_load=${flow.loadId}`],
    references: {
      parentLoadId: flow.loadId,
      threadId: flow.threadId,
    },
  };

  const canonicalState = {
    chargeId: flow.chargeId,
    parentLoadId: flow.loadId,
    status: getLifecycleStatus(latestChargeEvent),
    chargeType:
      typeof offeredChargeEvent?.payload.chargeType === "string" ? offeredChargeEvent.payload.chargeType : "ACCESSORIAL",
    amount,
    updatedAt: latestChargeEvent?.observedAt ?? offeredChargeEvent?.observedAt,
  };

  const finalNegative =
    latestChargeEvent?.lifecycle === "REJECT" || latestChargeEvent?.lifecycle === "WITHDRAW" || latestChargeEvent?.lifecycle === "CANCEL";

  const evals: EvalRecord[] = [
    evalRecord(
      `eval_${flow.chargeId}_map`,
      "charge_mapping",
      "MAP-1",
      money(amount),
      money(amount),
      "0.00",
      "MAPPED",
      ["CHARGE_CODE_MAPPED"],
      {
        sourceEventId: offeredChargeEvent?.id,
        evidenceEventIds: [offeredChargeEvent?.id].filter(Boolean),
      },
    ),
    evalRecord(
      `eval_${flow.chargeId}_status`,
      "charge_lifecycle",
      "LINE-2",
      money(1),
      money(finalNegative ? 0 : 1),
      finalNegative ? "N/A" : "0.00",
      finalNegative ? "UNKNOWN" : "PASS",
      finalNegative ? ["CHARGE_WITHDRAWN"] : ["CHARGE_CONFIRMED"],
      {
        sourceEventId: latestChargeEvent?.id,
        evidenceEventIds: [latestChargeEvent?.id].filter(Boolean),
      },
    ),
  ];

  const eventSnapshots: Record<string, EventSnapshot> = {};
  for (const event of chargeEvents) {
    const negative = event.lifecycle === "REJECT" || event.lifecycle === "WITHDRAW" || event.lifecycle === "CANCEL";

    eventSnapshots[event.id] = {
      metadata: {
        ...metadata,
        proof_text: eventProof(event),
        selectedEventId: event.id,
      },
      canonicalState: {
        ...canonicalState,
        status: eventState(event.lifecycle),
        updatedAt: event.observedAt,
      },
      evals: [
        evalRecord(
          `eval_${flow.chargeId}_${event.id}_snap`,
          "charge_snapshot",
          "MAP-1",
          money(amount),
          money(negative ? 0 : amount),
          negative ? `-${money(amount)}` : "0.00",
          negative ? "FAIL" : "PASS",
          negative ? ["CHARGE_REMOVED"] : ["CHARGE_ACTIVE"],
          {
            sourceEventId: event.id,
            evidenceEventIds: [event.id],
          },
        ),
      ],
    };
  }

  return {
    entityType: "charge",
    entityId: flow.chargeId,
    metadata,
    canonicalState,
    eventLog: chargeEvents,
    evals,
    eventSnapshots,
  };
}

export const entityViewDataByKey: Record<string, EntityRecord> = threadFlows.reduce<Record<string, EntityRecord>>(
  (acc, flow, index) => {
    const loadRecord = getLoadRecord(flow, index);
    const quoteRecord = getQuoteRecord(flow, index);
    const chargeRecord = getChargeRecord(flow, index);

    acc[`load:${flow.loadId}`] = loadRecord;
    acc[`quote:${flow.quoteId}`] = quoteRecord;
    acc[`charge:${flow.chargeId}`] = chargeRecord;

    return acc;
  },
  {},
);

export function getEntityRecord(entityType: EntityType, entityId: string): EntityRecord | undefined {
  return entityViewDataByKey[`${entityType}:${entityId}`];
}

export function getEntityTopLabel(entityType: EntityType): string {
  if (entityType === "load") {
    return "Proto_load_uid";
  }
  if (entityType === "quote") {
    return "Quote_uid";
  }
  return "Charge_uid";
}

export function getEvalById(record: EntityRecord, evalId: string): EvalRecord | undefined {
  return record.evals.find((entry) => entry.id === evalId);
}

export function getEventById(record: EntityRecord, eventId: string): ThreadEvent | undefined {
  return record.eventLog.find((event) => event.id === eventId);
}
