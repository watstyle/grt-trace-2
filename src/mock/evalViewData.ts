import { EvalRecord, entityViewDataByKey } from "./entityViewData";
import {
  EntityType,
  EventLifecycle,
  ThreadEvent,
  ThreadMessage,
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

const proofTextByEventId: Record<string, string> = {
  ev_101: "Please create load LD-8219 for lane DAL -> PHX.",
  ev_102: "We can offer primary linehaul at 1850 USD and include fuel surcharge estimate.",
  ev_103: "Please confirm if accessorials should be split by line item.",
  ev_104: "Please set requested pickup appointment for 10:00 local and lock quote q_31 as primary.",
  ev_105: "Original accessorial estimate withdrawn.",
  ev_106: "Replacing with revised fuel amount and adding lumper reserve pending POD.",
  ev_107: "Please reject any lumper pre-bill.",
  ev_108: "Quote q_31 is active and charge c_10 is linked as fuel line item.",
};

const baseOrderDetails: EvalOrderDetails = {
  orderId: "4GH7618",
  custShipId: "SH998271",
  accountName: "Customer ABC Industries",
  billToCode: "FG678",
  origin: { city: "Dallas", state: "TX", code: "GH813" },
  destination: { city: "Houston", state: "TX", code: "JK814" },
  tenderDate: "01/26/2026",
  pickupDate: "01/28/2026",
  deliveryDate: "01/29/2026",
};

const allThreadEvents = getAllEventsForThread("t_1");

export const eventsById: Record<string, ThreadEvent> = allThreadEvents.reduce<Record<string, ThreadEvent>>(
  (acc, event) => {
    acc[event.id] = event;
    return acc;
  },
  {},
);

export const evalsById: Record<string, EvalViewRecord> = {
  eval_ld_2: {
    id: "eval_ld_2",
    title: "Layover Charge Variance",
    varianceAmount: -750,
    currency: "USD",
    entityType: "load",
    entityId: "ld_8219",
    orderDetails: baseOrderDetails,
    exception: { title: "Layover Charge Variance" },
    lineItems: [{ chargeCode: "LAYOVER", billed: 0, expected: 750, variance: -750 }],
    evidenceEventIds: ["ev_101", "ev_104", "ev_106", "ev_107", "ev_108"],
  },
};

function toTitle(value: string): string {
  return value
    .split(/[_\s-]+/g)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
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
    ...entityEventIds.slice(0, 3),
  ]).slice(0, 6);
}

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

  return {
    id: evalRecord.id,
    title: toTitle(evalRecord.lineItem),
    varianceAmount: variance,
    currency: "USD",
    entityType,
    entityId,
    orderDetails: {
      ...baseOrderDetails,
      orderId: entityType === "load" ? entityId.toUpperCase() : baseOrderDetails.orderId,
    },
    exception: { title: toTitle(evalRecord.lineItem) },
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

function getActivityLabel(event: ThreadEvent): string {
  const entity = event.entity.charAt(0) + event.entity.slice(1).toLowerCase();
  const lifecycle = lifecycleLabelMap[event.lifecycle];
  return `${entity} ${lifecycle}`;
}

function getActorLabel(event: ThreadEvent): "Shipper" | "Carrier" {
  return event.actor === "SHIPPER" ? "Shipper" : "Carrier";
}

function getProofText(event: ThreadEvent, message: ThreadMessage): string {
  const mapped = proofTextByEventId[event.id];
  if (mapped) {
    return mapped;
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
