import { EvalRecord, entityViewDataByKey } from "./entityViewData";
import { evalsById } from "./evalViewData";
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
  title: string;
  status: "OPEN" | "TRIAGED";
  entityType: EntityType;
  entityId: string;
  evalId: string;
};

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
  .map((row, index) => ({
    id: `ex_${index + 1}`,
    title: row.title,
    status: row.result === "FAIL" ? "OPEN" : "TRIAGED",
    entityType: row.entityType,
    entityId: row.entityId,
    evalId: row.id,
  }));
