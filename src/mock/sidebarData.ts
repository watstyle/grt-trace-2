import { EvalRecord, entityViewDataByKey } from "./entityViewData";
import { evalsById, getLoadIdForEval } from "./evalViewData";
import { EventLifecycle, EntityType, threadViewDataById } from "./threadViewData";

export type LifecycleFilter = "ALL" | "CONFIRMED" | "OFFERED" | "REQUESTED" | "REJECTED";
export type EvalFilter = "ALL" | "PASS" | "FAIL" | "UNKNOWN" | "MAPPED" | "MATCHED";

export type SidebarThreadRow = {
  id: string;
  subject: string;
  messageCount: number;
  updatedAt: string;
};

export type SidebarEntityRow = {
  id: string;
  entityType: EntityType;
  lifecycle: Exclude<LifecycleFilter, "ALL">;
  state: string;
  updatedAt: string;
  summary: string;
};

export type SidebarEvalRow = {
  id: string;
  title: string;
  result: "PASS" | "FAIL" | "UNKNOWN" | "MAPPED" | "MATCHED";
  entityType: EntityType;
  entityId: string;
  checkType: EvalRecord["checkType"];
  reasonCodes: string[];
};

export type SidebarExceptionRow = {
  id: string;
  exceptionType: string;
  loadId: string;
  account: string;
  deliveredOn: string;
  lastUpdatedOn: string;
  resolutionStatus: "Unresolved" | "Resolved";
  reviewStatus: "Pending Review";
  amount: number;
  entityType: EntityType;
  entityId: string;
  evalId: string;
};

function toDisplayDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const parts = value.split("/");
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1]}-${parts[2].slice(-2)}`;
    }
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(parsed);
}

function normalizeLifecycle(lifecycle: EventLifecycle | undefined, fallbackState: string): Exclude<LifecycleFilter, "ALL"> {
  if (lifecycle === "CONFIRM") {
    return "CONFIRMED";
  }
  if (lifecycle === "OFFER") {
    return "OFFERED";
  }
  if (lifecycle === "REQUEST") {
    return "REQUESTED";
  }
  if (lifecycle === "REJECT" || lifecycle === "WITHDRAW" || lifecycle === "CANCEL") {
    return "REJECTED";
  }

  const normalizedState = fallbackState.toLowerCase();
  if (normalizedState.includes("confirm") || normalizedState.includes("selected") || normalizedState.includes("active")) {
    return "CONFIRMED";
  }
  if (normalizedState.includes("offer")) {
    return "OFFERED";
  }
  if (normalizedState.includes("request") || normalizedState.includes("pending")) {
    return "REQUESTED";
  }
  return "REJECTED";
}

function inferEvalResult(evalRecord: EvalRecord): SidebarEvalRow["result"] {
  if (evalRecord.status === "FAIL") {
    return "FAIL";
  }
  if (evalRecord.status === "UNKNOWN") {
    return "UNKNOWN";
  }
  if (evalRecord.status === "MAPPED") {
    return "MAPPED";
  }
  if (evalRecord.status === "MATCHED") {
    return "MATCHED";
  }

  if (evalRecord.checkType.startsWith("MAP") || evalRecord.reasonCodes.some((code) => code.includes("MAPPED"))) {
    return "MAPPED";
  }
  if (evalRecord.checkType.startsWith("MATCH") || evalRecord.reasonCodes.some((code) => code.includes("MATCHED"))) {
    return "MATCHED";
  }
  return "PASS";
}

function getEntityRows(entityType: EntityType): SidebarEntityRow[] {
  return Object.values(entityViewDataByKey)
    .filter((record) => record.entityType === entityType)
    .map((record) => {
      const latestEvent = record.eventLog[record.eventLog.length - 1];
      const stateRaw = ((record.canonicalState.status ?? record.canonicalState.state ?? "unknown") as string).toString();
      const updatedAt = ((record.canonicalState.updatedAt ??
        record.canonicalState.lastUpdatedAt ??
        latestEvent?.observedAt ??
        "2026-02-17T00:00:00Z") as string).toString();
      const lane = (record.canonicalState.lane ?? {}) as { origin?: string; destination?: string };

      const summary =
        entityType === "load"
          ? `${lane.origin ?? "N/A"} -> ${lane.destination ?? "N/A"}`
          : entityType === "quote"
            ? `Total ${record.canonicalState.total ?? "N/A"}`
            : `Amount ${record.canonicalState.amount ?? "N/A"}`;

      return {
        id: record.entityId,
        entityType,
        lifecycle: normalizeLifecycle(latestEvent?.lifecycle, stateRaw),
        state: stateRaw,
        updatedAt,
        summary,
      } satisfies SidebarEntityRow;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export const sidebarThreadRows: SidebarThreadRow[] = Object.values(threadViewDataById)
  .map((thread) => ({
    id: thread.id,
    subject: thread.subject,
    messageCount: thread.messages.length,
    updatedAt: thread.messages[thread.messages.length - 1]?.sentAt ?? "2026-02-17T00:00:00Z",
  }))
  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export const sidebarLoadRows = getEntityRows("load");
export const sidebarQuoteRows = getEntityRows("quote");
export const sidebarChargeRows = getEntityRows("charge");

const evalMap = new Map<string, SidebarEvalRow>();
for (const record of Object.values(entityViewDataByKey)) {
  const allEvals = [
    ...record.evals,
    ...Object.values(record.eventSnapshots).flatMap((snapshot) => snapshot.evals),
  ];

  for (const evalRecord of allEvals) {
    if (evalMap.has(evalRecord.id)) {
      continue;
    }

    const evalView = evalsById[evalRecord.id];
    evalMap.set(evalRecord.id, {
      id: evalRecord.id,
      title: evalView?.title ?? evalRecord.lineItem,
      result: inferEvalResult(evalRecord),
      entityType: record.entityType,
      entityId: record.entityId,
      checkType: evalRecord.checkType,
      reasonCodes: evalRecord.reasonCodes,
    });
  }
}

export const sidebarEvalRows: SidebarEvalRow[] = Array.from(evalMap.values()).sort((a, b) => a.id.localeCompare(b.id));

export const sidebarExceptionRows: SidebarExceptionRow[] = sidebarEvalRows
  .filter((row) => row.result === "FAIL" || row.result === "UNKNOWN")
  .map((row, index) => {
    const evalView = evalsById[row.id];
    const loadId = getLoadIdForEval(row.id) ?? row.entityId;
    const sourceRecord = entityViewDataByKey[`${row.entityType}:${row.entityId}`];
    const updatedAt =
      ((sourceRecord?.canonicalState.updatedAt ??
        sourceRecord?.canonicalState.lastUpdatedAt ??
        sourceRecord?.eventLog[sourceRecord.eventLog.length - 1]?.observedAt ??
        "2026-02-17T00:00:00Z") as string);

    return {
      id: `ex_${index + 1}`,
      exceptionType: row.title,
      loadId,
      account: evalView?.orderDetails.accountName ?? "Customer Account",
      deliveredOn: toDisplayDate(evalView?.orderDetails.deliveryDate ?? "02/24/2026"),
      lastUpdatedOn: toDisplayDate(updatedAt),
      resolutionStatus: row.result === "FAIL" ? "Unresolved" : "Resolved",
      reviewStatus: "Pending Review",
      amount: evalView?.varianceAmount ?? 0,
      entityType: row.entityType,
      entityId: row.entityId,
      evalId: row.id,
    } satisfies SidebarExceptionRow;
  })
  .sort((a, b) => {
    const aTime = new Date(a.lastUpdatedOn).getTime();
    const bTime = new Date(b.lastUpdatedOn).getTime();
    return bTime - aTime;
  });
