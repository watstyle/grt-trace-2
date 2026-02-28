import { EvalRecord, entityViewDataByKey } from "./entityViewData";
import {
  EntityType,
  EventLifecycle,
  ThreadEvent,
  ThreadMessage,
  getAllEvents,
  getAllEventsForThread,
  getMessageById,
} from "./threadViewData";

export type EvalOrderDetails = {
  orderId: string;
  custShipId: string;
  accountName: string;
  billToCode: string;
  origin: { city: string; state: string; code: string };
  destination: { city: string; state: string; code: string };
  tenderDate: string;
  pickupDate: string;
  deliveryDate: string;
};

export type EvalLineItem = {
  chargeCode: string;
  billed: number;
  expected: number;
  variance: number;
};

export type EvalViewRecord = {
  id: string;
  title: string;
  varianceAmount: number;
  currency: "USD";
  entityType: EntityType;
  entityId: string;
  orderDetails: EvalOrderDetails;
  exception: { title: string };
  lineItems: EvalLineItem[];
  evidenceEventIds: string[];
};

export type EvalEvidenceItem = {
  event: ThreadEvent;
  message: ThreadMessage;
  activityLabel: string;
  actorLabel: "Shipper" | "Carrier";
  proofText: string;
};

const lifecycleLabelMap: Record<EventLifecycle, string> = {
  REQUEST: "Requested",
  CONFIRM: "Confirmed",
  OFFER: "Offered",
  CANCEL: "Canceled",
  WITHDRAW: "Withdrawn",
  REJECT: "Rejected",
};

const REAL_EXCEPTION_TITLES = [
  "Missing Stopoff Charge",
  "Layover Charge Mismatch",
  "All-in Mismatch",
  "Missing Linehaul",
] as const;

function stableTitleFromId(evalId: string): (typeof REAL_EXCEPTION_TITLES)[number] {
  let hash = 0;
  for (let i = 0; i < evalId.length; i += 1) {
    hash = (hash * 31 + evalId.charCodeAt(i)) >>> 0;
  }
  return REAL_EXCEPTION_TITLES[hash % REAL_EXCEPTION_TITLES.length];
}

function getExceptionTitle(evalRecord: EvalRecord): string {
  const key = `${evalRecord.lineItem} ${evalRecord.checkType} ${evalRecord.reasonCodes.join(" ")}`.toLowerCase();

  if (key.includes("stopoff")) {
    return "Missing Stopoff Charge";
  }
  if (key.includes("layover")) {
    return "Layover Charge Mismatch";
  }
  if (key.includes("linehaul")) {
    return "Missing Linehaul";
  }
  if (
    key.includes("total") ||
    key.includes("all-in") ||
    key.includes("all in") ||
    key.includes("quote_total")
  ) {
    return "All-in Mismatch";
  }

  return stableTitleFromId(evalRecord.id);
}

function parseDelta(value: string): number {
  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAmount(value: string): number {
  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEvidenceIds(ids: string[]): string[] {
  const deduped = Array.from(new Set(ids));
  return deduped.filter((id) => Boolean(eventsById[id]));
}

function getEvidenceIdsFromEval(evalRecord: EvalRecord, fallbackEventId: string | undefined, entityEventIds: string[]): string[] {
  const evidenceFromRaw = Array.isArray((evalRecord.raw as { evidenceEventIds?: unknown }).evidenceEventIds)
    ? ((evalRecord.raw as { evidenceEventIds: unknown[] }).evidenceEventIds.filter(
        (value): value is string => typeof value === "string",
      ) as string[])
    : [];

  const sourceFromRaw =
    typeof (evalRecord.raw as { sourceEventId?: unknown }).sourceEventId === "string"
      ? ((evalRecord.raw as { sourceEventId: string }).sourceEventId as string)
      : undefined;

  return normalizeEvidenceIds([
    ...evidenceFromRaw,
    ...(sourceFromRaw ? [sourceFromRaw] : []),
    ...(fallbackEventId ? [fallbackEventId] : []),
    ...entityEventIds.slice(0, 4),
  ]).slice(0, 8);
}

function parseLaneFromEvent(event: ThreadEvent | undefined): {
  origin: { city: string; state: string; code: string };
  destination: { city: string; state: string; code: string };
} {
  const fallback = {
    origin: { city: "Dallas", state: "TX", code: "DAL" },
    destination: { city: "Phoenix", state: "AZ", code: "PHX" },
  };

  if (!event) {
    return fallback;
  }

  const lane = event.payload.lane;
  if (!lane || typeof lane !== "object") {
    return fallback;
  }

  const laneObj = lane as Record<string, unknown>;

  const parsePoint = (
    value: unknown,
    fallbackPoint: { city: string; state: string; code: string },
  ): { city: string; state: string; code: string } => {
    if (typeof value === "string") {
      return { ...fallbackPoint, code: value };
    }

    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      return {
        city: typeof obj.city === "string" ? obj.city : fallbackPoint.city,
        state: typeof obj.state === "string" ? obj.state : fallbackPoint.state,
        code: typeof obj.code === "string" ? obj.code : fallbackPoint.code,
      };
    }

    return fallbackPoint;
  };

  return {
    origin: parsePoint(laneObj.origin, fallback.origin),
    destination: parsePoint(laneObj.destination, fallback.destination),
  };
}

function getOrderDetails(entityType: EntityType, entityId: string, evidenceEventIds: string[]): EvalOrderDetails {
  const laneSeed = evidenceEventIds.map((id) => eventsById[id]).find(Boolean);
  const lane = parseLaneFromEvent(laneSeed);

  const numericId = entityId.replace(/\D/g, "").slice(-4) || "0001";
  const daySeed = Number(numericId) % 9;
  const day = `${(20 + daySeed).toString().padStart(2, "0")}`;

  const orderId = entityType === "load" ? entityId.toUpperCase() : `LD_${numericId}`;

  return {
    orderId,
    custShipId: `CS-${7000 + Number(numericId)}`,
    accountName: `Customer ${String.fromCharCode(65 + (Number(numericId) % 6))} Logistics`,
    billToCode: `BT-${600 + (Number(numericId) % 150)}`,
    origin: lane.origin,
    destination: lane.destination,
    tenderDate: `02/${day}/2026`,
    pickupDate: `02/${(Number(day) + 1).toString().padStart(2, "0")}/2026`,
    deliveryDate: `02/${(Number(day) + 2).toString().padStart(2, "0")}/2026`,
  };
}

const allThreadEvents = getAllEvents();

export const eventsById: Record<string, ThreadEvent> = allThreadEvents.reduce<Record<string, ThreadEvent>>(
  (acc, event) => {
    acc[event.id] = event;
    return acc;
  },
  {},
);

function buildEvalRecord(
  evalRecord: EvalRecord,
  entityType: EntityType,
  entityId: string,
  fallbackEventId: string | undefined,
  entityEventIds: string[],
): EvalViewRecord {
  const evidenceEventIds = getEvidenceIdsFromEval(evalRecord, fallbackEventId, entityEventIds);
  const billed = parseAmount(evalRecord.observedValue);
  const expected = parseAmount(evalRecord.expectedValue);
  const variance = parseDelta(evalRecord.delta);
  const exceptionTitle = getExceptionTitle(evalRecord);

  return {
    id: evalRecord.id,
    title: exceptionTitle,
    varianceAmount: variance,
    currency: "USD",
    entityType,
    entityId,
    orderDetails: getOrderDetails(entityType, entityId, evidenceEventIds),
    exception: { title: exceptionTitle },
    lineItems: [
      {
        chargeCode: evalRecord.lineItem.toUpperCase(),
        billed,
        expected,
        variance,
      },
    ],
    evidenceEventIds,
  };
}

export const evalsById: Record<string, EvalViewRecord> = {};

for (const entityRecord of Object.values(entityViewDataByKey)) {
  const entityEventIds = entityRecord.eventLog.map((event) => event.id);

  for (const evaluation of entityRecord.evals) {
    if (!evalsById[evaluation.id]) {
      evalsById[evaluation.id] = buildEvalRecord(
        evaluation,
        entityRecord.entityType,
        entityRecord.entityId,
        entityEventIds[entityEventIds.length - 1],
        entityEventIds,
      );
    }
  }

  for (const [eventId, snapshot] of Object.entries(entityRecord.eventSnapshots)) {
    for (const evaluation of snapshot.evals) {
      if (!evalsById[evaluation.id]) {
        evalsById[evaluation.id] = buildEvalRecord(
          evaluation,
          entityRecord.entityType,
          entityRecord.entityId,
          eventId,
          entityEventIds,
        );
      }
    }
  }
}

if (!evalsById["eval_ld_2"]) {
  const firstLoadRecord = Object.values(entityViewDataByKey).find((record) => record.entityType === "load");
  if (firstLoadRecord) {
    const fallbackEvidence = firstLoadRecord.eventLog.slice(0, 5).map((event) => event.id);
    evalsById["eval_ld_2"] = {
      id: "eval_ld_2",
      title: "Layover Charge Mismatch",
      varianceAmount: -750,
      currency: "USD",
      entityType: "load",
      entityId: firstLoadRecord.entityId,
      orderDetails: getOrderDetails("load", firstLoadRecord.entityId, fallbackEvidence),
      exception: { title: "Layover Charge Mismatch" },
      lineItems: [{ chargeCode: "LAYOVER", billed: 0, expected: 750, variance: -750 }],
      evidenceEventIds: fallbackEvidence,
    };
  }
}

function getActivityLabel(event: ThreadEvent): string {
  const entity = event.entity.charAt(0) + event.entity.slice(1).toLowerCase();
  const lifecycle = lifecycleLabelMap[event.lifecycle];
  return `${entity} ${lifecycle}`;
}

function getActorLabel(event: ThreadEvent): "Shipper" | "Carrier" {
  return event.actor === "SHIPPER" ? "Shipper" : "Carrier";
}

function getProofText(event: ThreadEvent, message: ThreadMessage): string {
  if (typeof event.payload.proofText === "string" && event.payload.proofText.trim().length > 0) {
    return event.payload.proofText;
  }

  const firstLine = message.body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLine ?? "No proof text found in source message.";
}

export function getEvalRecordById(evalId: string): EvalViewRecord | undefined {
  return evalsById[evalId];
}

export function getEvidenceEventsForEval(evalId: string): ThreadEvent[] {
  const evaluation = getEvalRecordById(evalId);
  if (!evaluation) {
    return [];
  }

  return evaluation.evidenceEventIds
    .map((eventId) => eventsById[eventId])
    .filter((event): event is ThreadEvent => Boolean(event))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
}

export function getEvidenceItemsForEval(evalId: string): EvalEvidenceItem[] {
  return getEvidenceEventsForEval(evalId)
    .map((event) => {
      const message = getMessageById(event.messageRef.threadId, event.messageRef.messageId);
      if (!message) {
        return undefined;
      }

      return {
        event,
        message,
        activityLabel: getActivityLabel(event),
        actorLabel: getActorLabel(event),
        proofText: getProofText(event, message),
      } satisfies EvalEvidenceItem;
    })
    .filter((entry): entry is EvalEvidenceItem => Boolean(entry));
}

export function getEventForEval(evalId: string, eventId: string): ThreadEvent | undefined {
  return getEvidenceEventsForEval(evalId).find((event) => event.id === eventId);
}

export function getMessageForEvidenceEvent(eventId: string):
  | { event: ThreadEvent; message: ThreadMessage }
  | undefined {
  const event = eventsById[eventId];
  if (!event) {
    return undefined;
  }

  const message = getMessageById(event.messageRef.threadId, event.messageRef.messageId);
  if (!message) {
    return undefined;
  }

  return { event, message };
}

export function getLoadIdForEval(evalId: string): string | undefined {
  const evaluation = evalsById[evalId];
  if (!evaluation) {
    return undefined;
  }

  if (evaluation.entityType === "load") {
    return evaluation.entityId;
  }

  const firstEvidence = evaluation.evidenceEventIds[0] ? eventsById[evaluation.evidenceEventIds[0]] : undefined;
  const threadId = firstEvidence?.messageRef.threadId;
  if (!threadId) {
    return undefined;
  }

  return getAllEventsForThread(threadId).find((event) => event.entityType === "load")?.entityId;
}
