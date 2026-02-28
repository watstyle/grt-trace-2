import { useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CopyIconButton } from "../components/CopyIconButton";
import { EvalList } from "../components/EvalList";
import { EventLogList } from "../components/EventLogList";
import { GoIcon } from "../components/Icons";
import { JsonViewer } from "../components/JsonViewer";
import { MessagePreview } from "../components/MessagePreview";
import { Panel } from "../components/Panel";
import { TopBar } from "../components/TopBar";
import { type EntityRecord, getEntityRecord } from "../mock/entityViewData";
import { EntityType, ThreadEvent, getAllEventsForThread } from "../mock/threadViewData";
import { formatDateTime } from "../utils/format";
import { useSetQueryParams } from "../utils/useQueryState";

type LoadViewKey = "event-log" | "state" | "quotes" | "charges" | "tms-match" | "evals";
type NonLoadViewKey = "event-log" | "state" | "evals";
type EventEntityFilter = "all" | "load" | "quote" | "charge";
type RelatedEntityKind = "quote" | "charge";
type LifecycleGroupKey = "confirmed" | "requested" | "offered" | "rejected";

type RelatedEntitySummary = {
  id: string;
  lifecycle: ThreadEvent["lifecycle"];
  payload: Record<string, unknown>;
  observedAt: string;
};

const DEFAULT_ENTITY: { entityType: EntityType; entityId: string } = {
  entityType: "load",
  entityId: "ld_8219",
};

const VALID_ENTITY_TYPES: EntityType[] = ["load", "quote", "charge"];
const VALID_LOAD_VIEWS: LoadViewKey[] = ["event-log", "state", "quotes", "charges", "tms-match", "evals"];
const VALID_NON_LOAD_VIEWS: NonLoadViewKey[] = ["event-log", "state", "evals"];
const VALID_EVENT_FILTERS: EventEntityFilter[] = ["all", "load", "quote", "charge"];

const LIFECYCLE_GROUPS: { key: LifecycleGroupKey; label: string }[] = [
  { key: "confirmed", label: "Confirmed" },
  { key: "offered", label: "Offered" },
  { key: "requested", label: "Requested" },
  { key: "rejected", label: "Rejected / Withdrawn / Cancelled" },
];

const STATUS_BADGE_BASE = "inline-flex h-5 items-center rounded-md border px-2 text-[10px] font-semibold uppercase tracking-[0.06em] leading-none";

function getEntityTitle(entityType: EntityType): string {
  if (entityType === "load") {
    return "Load";
  }
  if (entityType === "quote") {
    return "Quote";
  }
  return "Charge";
}

function normalizeStatusLabel(status: unknown): string {
  if (typeof status !== "string" || status.trim().length === 0) {
    return "Unknown";
  }

  return status
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function lifecycleChipClasses(status: unknown): string {
  const normalized = typeof status === "string" ? status.toLowerCase() : "";
  if (normalized === "confirmed") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
  }
  if (normalized === "rejected" || normalized === "withdrawn" || normalized === "cancelled") {
    return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  }
  if (normalized === "offered" || normalized === "requested") {
    return "border-[#4d5a74] bg-[#1b2436] text-zinc-200";
  }
  return "border-[#3b4353] bg-[#141a24] text-zinc-300";
}

function parseLoadView(viewFromQuery: string | null, legacyTab: string | null): LoadViewKey {
  if (viewFromQuery && VALID_LOAD_VIEWS.includes(viewFromQuery as LoadViewKey)) {
    return viewFromQuery as LoadViewKey;
  }

  if (legacyTab === "state") {
    return "state";
  }
  if (legacyTab === "evals") {
    return "evals";
  }

  return "event-log";
}

function parseNonLoadView(viewFromQuery: string | null, legacyTab: string | null): NonLoadViewKey {
  if (viewFromQuery && VALID_NON_LOAD_VIEWS.includes(viewFromQuery as NonLoadViewKey)) {
    return viewFromQuery as NonLoadViewKey;
  }

  if (legacyTab === "state") {
    return "state";
  }
  if (legacyTab === "evals") {
    return "evals";
  }

  return "event-log";
}

function parseEventFilter(filterFromQuery: string | null): EventEntityFilter {
  if (filterFromQuery && VALID_EVENT_FILTERS.includes(filterFromQuery as EventEntityFilter)) {
    return filterFromQuery as EventEntityFilter;
  }
  return "all";
}

function eventMatchesFilter(event: ThreadEvent, filter: EventEntityFilter): boolean {
  if (filter === "all") {
    return true;
  }
  return event.entityType === filter;
}

function groupForLifecycle(lifecycle: ThreadEvent["lifecycle"]): LifecycleGroupKey {
  if (lifecycle === "CONFIRM") {
    return "confirmed";
  }

  if (lifecycle === "REQUEST") {
    return "requested";
  }

  if (lifecycle === "OFFER") {
    return "offered";
  }

  return "rejected";
}

function formatLifecycleState(lifecycle: ThreadEvent["lifecycle"]): string {
  return lifecycle.charAt(0) + lifecycle.slice(1).toLowerCase();
}

function getRelatedEntitySummaries(events: ThreadEvent[], kind: RelatedEntityKind): RelatedEntitySummary[] {
  const ordered = [...events].sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
  const latestById = new Map<string, ThreadEvent>();

  for (const event of ordered) {
    if (event.entityType !== kind) {
      continue;
    }
    latestById.set(event.entityId, event);
  }

  return Array.from(latestById.values())
    .map((event) => ({
      id: event.entityId,
      lifecycle: event.lifecycle,
      payload: event.payload,
      observedAt: event.observedAt,
    }))
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
}

type RelatedEntityListProps = {
  kind: RelatedEntityKind;
  items: RelatedEntitySummary[];
};

const SAMPLE_QUOTE_SERVICE = "Quipment";

const SAMPLE_QUOTE_LINE_ITEMS = [
  { item: "LINEHAUL", basis: "FLAT", amount: 964.28, currency: "USD" },
  { item: "FUEL", basis: "PERCENT", amount: 122.1, currency: "USD" },
];

const SAMPLE_QUOTE_LANE = {
  origin: { city: "Dallas", state: "TX", code: "DAL" },
  destination: { city: "Phoenix", state: "AZ", code: "PHX" },
};

const SAMPLE_QUOTE_REFS = {
  load_uid: "LD-8219",
  cust_ship_id: "CS-22018",
  external_quote_ref: "Q-2464031F",
};

const SAMPLE_CHARGE_REFS = {
  load_uid: "LD-8219",
  invoice_id: "INV-003822",
  line_item_id: "LI-9982",
};

function getPayloadValue(payload: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      return payload[key];
    }
  }
  return undefined;
}

function getPayloadString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  const value = getPayloadValue(payload, keys);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function toDisplayString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }
  return fallback;
}

function getLaneCityState(payload: Record<string, unknown>): { city: string; state: string } {
  const lane = getPayloadValue(payload, ["lane"]);
  if (lane && typeof lane === "object") {
    const laneObj = lane as Record<string, unknown>;

    if (laneObj.origin && typeof laneObj.origin === "object") {
      const origin = laneObj.origin as Record<string, unknown>;
      const city = toDisplayString(origin.city, "Dallas");
      const state = toDisplayString(origin.state, "TX");
      return { city, state };
    }

    const city = toDisplayString(laneObj.city, "Dallas");
    const state = toDisplayString(laneObj.state, "TX");
    return { city, state };
  }

  return {
    city: toDisplayString(SAMPLE_QUOTE_LANE.origin.city, "Dallas"),
    state: toDisplayString(SAMPLE_QUOTE_LANE.origin.state, "TX"),
  };
}

function renderJsonCell(value: unknown) {
  return (
    <pre className="max-h-24 overflow-auto rounded-md bg-white/[0.03] px-2 py-1.5 font-mono text-[10px] leading-4 text-zinc-300 stable-scroll">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function inferParentLoadId(record: EntityRecord): string | undefined {
  const fromState = getPayloadString(record.canonicalState as Record<string, unknown>, ["parentLoadId", "loadId", "loadRef"]);
  if (fromState && fromState.toLowerCase().startsWith("ld_")) {
    return fromState.toLowerCase();
  }

  const threadId = record.eventLog[0]?.messageRef.threadId;
  if (!threadId) {
    return undefined;
  }

  const loadEvent = getAllEventsForThread(threadId).find((event) => event.entityType === "load");
  return loadEvent?.entityId;
}

function RelatedEntityList({ kind, items }: RelatedEntityListProps) {
  const navigate = useNavigate();
  const grouped = useMemo(() => {
    return {
      confirmed: items.filter((item) => groupForLifecycle(item.lifecycle) === "confirmed"),
      requested: items.filter((item) => groupForLifecycle(item.lifecycle) === "requested"),
      offered: items.filter((item) => groupForLifecycle(item.lifecycle) === "offered"),
      rejected: items.filter((item) => groupForLifecycle(item.lifecycle) === "rejected"),
    } satisfies Record<LifecycleGroupKey, RelatedEntitySummary[]>;
  }, [items]);

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <div className="space-y-5">
        {LIFECYCLE_GROUPS.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              {group.label}
            </h3>
            {grouped[group.key].length === 0 ? (
              <div className="rounded-card border border-dashed border-borderSubtle bg-panelMuted p-3 text-[12px] text-zinc-500">
                No {kind}s in this section.
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
                <div className="overflow-auto">
                  {kind === "quote" ? (
                    <table className="min-w-full table-fixed">
                      <thead className="sticky top-0 z-[1] bg-[#121722]">
                        <tr className="border-b border-borderSubtle">
                          <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Quote ID
                          </th>
                          <th className="w-[96px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Lifecycle
                          </th>
                          <th className="w-[154px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Service Offering
                          </th>
                          <th className="w-[180px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Line Items
                          </th>
                          <th className="w-[96px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Total
                          </th>
                          <th className="w-[132px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            City
                          </th>
                          <th className="w-[84px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            State
                          </th>
                          <th className="w-[154px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Reference IDs
                          </th>
                          <th className="w-[124px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Observed
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[group.key].map((item) => {
                          const serviceOffering = toDisplayString(
                            getPayloadValue(item.payload, ["service_offering", "serviceOffering"]),
                            SAMPLE_QUOTE_SERVICE,
                          );
                          const lineItems =
                            getPayloadValue(item.payload, ["line_items", "lineItems", "items"]) ?? SAMPLE_QUOTE_LINE_ITEMS;
                          const totalAmount = toDisplayString(
                            getPayloadValue(item.payload, ["total_amount", "total", "amount"]),
                            "964.28",
                          );
                          const lane = getLaneCityState(item.payload);
                          const referenceIds =
                            getPayloadValue(item.payload, ["reference ids", "referenceIds", "references"]) ?? SAMPLE_QUOTE_REFS;

                          return (
                            <tr
                              key={item.id}
                              onClick={() => navigate(`/entity/quote/${item.id}`)}
                              className="cursor-pointer border-b border-borderSubtle/70 text-[12px] text-zinc-300 transition hover:bg-[#171e2b]"
                            >
                              <td className="px-3 py-2 align-top font-mono text-[11px] text-zinc-300">{item.id}</td>
                              <td className="px-3 py-2 align-top text-zinc-300">{formatLifecycleState(item.lifecycle)}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{serviceOffering}</td>
                              <td className="px-3 py-2 align-top">{renderJsonCell(lineItems)}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{totalAmount}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{lane.city}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{lane.state}</td>
                              <td className="px-3 py-2 align-top">{renderJsonCell(referenceIds)}</td>
                              <td className="px-3 py-2 align-top text-[11px] text-zinc-400">{formatDateTime(item.observedAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="min-w-full table-fixed">
                      <thead className="sticky top-0 z-[1] bg-[#121722]">
                        <tr className="border-b border-borderSubtle">
                          <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Charge ID
                          </th>
                          <th className="w-[96px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Lifecycle
                          </th>
                          <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Service Offering
                          </th>
                          <th className="w-[180px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Line Items
                          </th>
                          <th className="w-[92px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Total
                          </th>
                          <th className="w-[132px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            City
                          </th>
                          <th className="w-[84px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            State
                          </th>
                          <th className="w-[170px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Reference IDs
                          </th>
                          <th className="w-[124px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            Observed
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[group.key].map((item) => {
                          const serviceOffering = toDisplayString(
                            getPayloadValue(item.payload, ["service_offering", "serviceOffering", "chargeType", "charge_code", "chargeCode", "targetChargeType"]),
                            "Accessorial",
                          );
                          const lineItems =
                            getPayloadValue(item.payload, ["line_items", "lineItems", "items"]) ?? [
                              {
                                item: toDisplayString(
                                  getPayloadValue(item.payload, ["chargeType", "charge_code", "chargeCode", "targetChargeType"]),
                                  "LAYOVER",
                                ),
                                basis: "FLAT",
                                amount: toDisplayString(getPayloadValue(item.payload, ["amount", "previousAmount"]), "0"),
                                currency: "USD",
                              },
                            ];
                          const totalAmount = toDisplayString(
                            getPayloadValue(item.payload, ["total_amount", "total", "amount", "previousAmount"]),
                            "0",
                          );
                          const lane = getLaneCityState(item.payload);
                          const referenceIds =
                            getPayloadValue(item.payload, ["reference ids", "referenceIds", "references", "audit"]) ??
                            SAMPLE_CHARGE_REFS;

                          return (
                            <tr
                              key={item.id}
                              onClick={() => navigate(`/entity/charge/${item.id}`)}
                              className="cursor-pointer border-b border-borderSubtle/70 text-[12px] text-zinc-300 transition hover:bg-[#171e2b]"
                            >
                              <td className="px-3 py-2 align-top font-mono text-[11px] text-zinc-300">{item.id}</td>
                              <td className="px-3 py-2 align-top text-zinc-300">{formatLifecycleState(item.lifecycle)}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{serviceOffering}</td>
                              <td className="px-3 py-2 align-top">{renderJsonCell(lineItems)}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{totalAmount}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{lane.city}</td>
                              <td className="px-3 py-2 align-top text-zinc-100">{lane.state}</td>
                              <td className="px-3 py-2 align-top">{renderJsonCell(referenceIds)}</td>
                              <td className="px-3 py-2 align-top text-[11px] text-zinc-400">{formatDateTime(item.observedAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

type LoadEntityDetailViewProps = {
  entityId: string;
  record: EntityRecord;
};

function LoadEntityDetailView({ entityId, record }: LoadEntityDetailViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const setQueryParams = useSetQueryParams();
  const navigate = useNavigate();

  const eventIdFromQuery = searchParams.get("eventId") ?? undefined;
  const evalJsonIdFromQuery = searchParams.get("evalJsonId") ?? undefined;
  const loadView = parseLoadView(searchParams.get("view"), searchParams.get("tab"));
  const eventFilter = parseEventFilter(searchParams.get("eventFilter"));

  const filteredEvents = useMemo(
    () => record.eventLog.filter((event) => eventMatchesFilter(event, eventFilter)),
    [eventFilter, record.eventLog],
  );

  const selectedEvent = filteredEvents.find((event) => event.id === eventIdFromQuery) ?? filteredEvents[0];

  const selectedSnapshot = selectedEvent
    ? record.eventSnapshots[selectedEvent.id] ?? {
        metadata: record.metadata,
        canonicalState: record.canonicalState,
        evals: record.evals,
      }
    : {
        metadata: record.metadata,
        canonicalState: record.canonicalState,
        evals: record.evals,
      };

  const evalJson = evalJsonIdFromQuery
    ? selectedSnapshot.evals.find((evaluation) => evaluation.id === evalJsonIdFromQuery)
    : undefined;

  const quoteSummaries = useMemo(() => getRelatedEntitySummaries(record.eventLog, "quote"), [record.eventLog]);
  const chargeSummaries = useMemo(() => getRelatedEntitySummaries(record.eventLog, "charge"), [record.eventLog]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    const currentViewFromQuery = searchParams.get("view");
    if (!currentViewFromQuery || !VALID_LOAD_VIEWS.includes(currentViewFromQuery as LoadViewKey)) {
      nextParams.set("view", "event-log");
      changed = true;
    }

    const currentFilterFromQuery = searchParams.get("eventFilter");
    if (!currentFilterFromQuery || !VALID_EVENT_FILTERS.includes(currentFilterFromQuery as EventEntityFilter)) {
      nextParams.set("eventFilter", "all");
      changed = true;
    }

    if (searchParams.get("tab")) {
      nextParams.delete("tab");
      changed = true;
    }

    if (selectedEvent && eventIdFromQuery !== selectedEvent.id) {
      nextParams.set("eventId", selectedEvent.id);
      changed = true;
    }

    if (!selectedEvent && eventIdFromQuery) {
      nextParams.delete("eventId");
      changed = true;
    }

    if (evalJsonIdFromQuery && !evalJson) {
      nextParams.delete("evalJsonId");
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [evalJson, evalJsonIdFromQuery, eventIdFromQuery, searchParams, selectedEvent, setSearchParams]);

  const handleChangeLoadView = (view: LoadViewKey) => {
    setQueryParams({ view, evalJsonId: null });
  };

  const handleChangeEventFilter = (filter: EventEntityFilter) => {
    const first = record.eventLog.find((event) => eventMatchesFilter(event, filter));
    setQueryParams({ eventFilter: filter, eventId: first?.id ?? null });
  };

  const handleSelectEvent = (eventId: string) => {
    setQueryParams({ eventId });
  };

  const handleOpenEval = (evalId: string) => {
    navigate(`/eval/${evalId}`);
  };

  const handleOpenEvalJson = (evalId: string) => {
    setQueryParams({ view: "evals", evalJsonId: evalId });
  };

  const handleCloseEvalJson = () => {
    setQueryParams({ evalJsonId: null });
  };

  const loadTabs: { key: LoadViewKey; label: string }[] = [
    { key: "event-log", label: "Event Log" },
    { key: "state", label: "Entity State" },
    { key: "quotes", label: `Quotes (${quoteSummaries.length})` },
    { key: "charges", label: `Charges (${chargeSummaries.length})` },
    { key: "tms-match", label: "TMS Match" },
    { key: "evals", label: "Evaluations" },
  ];

  const tmsMatchJson = useMemo(
    () => ({
      matchId: `tm_${entityId}`,
      status: "partial_match",
      comparedAt: selectedEvent?.observedAt ?? record.canonicalState.updatedAt,
      source: {
        entityId,
        selectedEventId: selectedEvent?.id ?? null,
      },
      tms: {
        loadNumber: "TMS-40177",
        quoteId:
          typeof record.canonicalState.selectedQuoteId === "string"
            ? record.canonicalState.selectedQuoteId
            : quoteSummaries[0]?.id ?? null,
        chargeIds:
          Array.isArray(record.canonicalState.chargeIds) && record.canonicalState.chargeIds.length > 0
            ? (record.canonicalState.chargeIds as string[])
            : chargeSummaries.slice(0, 2).map((entry) => entry.id),
        amount:
          typeof record.canonicalState.totalAmount === "number"
            ? record.canonicalState.totalAmount
            : typeof record.canonicalState.total === "number"
              ? record.canonicalState.total
              : 0,
        currency: "USD",
      },
      extracted: {
        quoteId: record.canonicalState.selectedQuoteId ?? null,
        chargeIds: record.canonicalState.chargeIds ?? [],
        lane: record.canonicalState.lane ?? null,
      },
      diffs: [
        { field: "lane.destination", expected: "PHX", observed: "PHX", result: "match" },
        { field: "total_amount", expected: 2060, observed: 2088, result: "mismatch" },
      ],
    }),
    [
      chargeSummaries,
      entityId,
      quoteSummaries,
      record.canonicalState.chargeIds,
      record.canonicalState.lane,
      record.canonicalState.selectedQuoteId,
      record.canonicalState.total,
      record.canonicalState.totalAmount,
      record.canonicalState.updatedAt,
      selectedEvent?.id,
      selectedEvent?.observedAt,
    ],
  );
  const lifecycleStatus = normalizeStatusLabel(record.canonicalState.status);

  return (
    <div className="dark h-screen bg-[#08090c] font-sans text-zinc-100 antialiased">
      <TopBar
        title={
          <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap">
            <span>Load: {entityId}</span>
            <CopyIconButton value={entityId} label="Load ID" />
            <span className={`${STATUS_BADGE_BASE} ${lifecycleChipClasses(record.canonicalState.status)}`}>
              {lifecycleStatus}
            </span>
          </span>
        }
      />

      <section className="flex h-12 items-end border-b border-borderSubtle bg-[#0f1115] px-4">
        <nav className="flex items-center gap-4">
          {loadTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleChangeLoadView(tab.key)}
              className={`h-11 border-b-2 px-1 text-[13px] font-medium tracking-[-0.01em] transition ${
                loadView === tab.key
                  ? "border-zinc-200 text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      <main className="h-[calc(100vh-56px-48px)]">
        {loadView === "event-log" ? (
          <div className="grid h-full grid-cols-[320px_600px_minmax(0,1fr)]">
            <section className="flex min-h-0 flex-col border-r border-borderSubtle bg-panel">
              <header className="z-10 flex h-12 items-center border-b border-borderSubtle bg-panel/95 px-4">
                <div className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle bg-[#121722] p-1">
                  {VALID_EVENT_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => handleChangeEventFilter(filter)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize transition ${
                        eventFilter === filter
                          ? "bg-[#1c2433] text-zinc-100"
                          : "text-zinc-400 hover:bg-[#171e2b] hover:text-zinc-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </header>
              <div className="min-h-0 flex-1">
              <EventLogList
                events={filteredEvents}
                selectedEventId={selectedEvent?.id}
                onSelect={handleSelectEvent}
              />
              </div>
            </section>

            <Panel
              title={
                <span className="inline-flex items-center gap-2">
                  Event: <span className="font-mono text-[12px] text-zinc-400">{selectedEvent?.id ?? "-"}</span>
                  {selectedEvent ? <CopyIconButton value={selectedEvent.id} label="Event ID" /> : null}
                </span>
              }
              stickyHeader
              className="border-r border-borderSubtle"
            >
              {selectedEvent ? (
                <JsonViewer value={selectedEvent} />
              ) : (
                <div className="p-4 text-[13px] text-zinc-400">No events for this filter.</div>
              )}
            </Panel>

            <Panel
              title={
                <span className="inline-flex items-center gap-2">
                  Message: <span className="font-mono text-[12px] text-zinc-400">{selectedEvent?.messageRef.messageId ?? "-"}</span>
                  {selectedEvent ? <CopyIconButton value={selectedEvent.messageRef.messageId} label="Message ID" /> : null}
                </span>
              }
              stickyHeader
              headerRight={
                selectedEvent ? (
                  <Link
                    to={`/thread/${selectedEvent.messageRef.threadId}?messageId=${selectedEvent.messageRef.messageId}&eventId=${selectedEvent.id}`}
                    className="inline-flex items-center rounded-full border border-[#343b48] bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-[#4d5a74] hover:text-zinc-100"
                  >
                    View Thread
                    <GoIcon className="ml-1 h-3.5 w-3.5" />
                  </Link>
                ) : null
              }
            >
              <MessagePreview event={selectedEvent} />
            </Panel>
          </div>
        ) : null}

        {loadView === "state" ? (
          <Panel className="h-full">
            <JsonViewer value={selectedSnapshot.canonicalState} />
          </Panel>
        ) : null}

        {loadView === "quotes" ? (
          <Panel className="h-full">
            <RelatedEntityList kind="quote" items={quoteSummaries} />
          </Panel>
        ) : null}

        {loadView === "charges" ? (
          <Panel className="h-full">
            <RelatedEntityList kind="charge" items={chargeSummaries} />
          </Panel>
        ) : null}

        {loadView === "tms-match" ? (
          <Panel className="h-full">
            <JsonViewer value={tmsMatchJson} />
          </Panel>
        ) : null}

        {loadView === "evals" ? (
          <Panel className="h-full">
            <EvalList
              evaluations={selectedSnapshot.evals}
              onOpenEval={handleOpenEval}
              onViewJson={handleOpenEvalJson}
              activeJsonEvalId={evalJson?.id}
            />
          </Panel>
        ) : null}
      </main>

      {evalJson ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Close evaluation JSON overlay"
            onClick={handleCloseEvalJson}
            className="absolute inset-0 bg-black/55"
          />
          <aside className="absolute inset-y-0 right-0 z-10 w-[min(820px,94vw)] border-l border-borderSubtle bg-[#0f1115] shadow-2xl">
            <header className="flex h-14 items-center justify-between border-b border-borderSubtle bg-[#121722] px-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 truncate text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">
                  <span>Evaluation: <span className="font-mono text-[12px] text-zinc-400">{evalJson.id}</span></span>
                  <CopyIconButton value={evalJson.id} label="Evaluation ID" />
                </p>
              </div>
              <button
                type="button"
                aria-label="Close evaluation JSON"
                onClick={handleCloseEvalJson}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#343b48] text-zinc-300 transition hover:border-[#4d5a74] hover:bg-[#171e2b]"
              >
                ×
              </button>
            </header>

            <div className="stable-scroll h-[calc(100vh-56px)] overflow-y-scroll p-4">
              <pre className="rounded-card border border-borderSubtle bg-panelMuted p-4 font-mono text-[12px] leading-5 text-zinc-200 shadow-soft">
                {JSON.stringify(evalJson, null, 2)}
              </pre>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

type StandardEntityDetailViewProps = {
  entityType: EntityType;
  entityId: string;
  record: EntityRecord;
};

function StandardEntityDetailView({ entityType, entityId, record }: StandardEntityDetailViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const setQueryParams = useSetQueryParams();
  const navigate = useNavigate();

  const nonLoadView = parseNonLoadView(searchParams.get("view"), searchParams.get("tab"));
  const evalJsonIdFromQuery = searchParams.get("evalJsonId") ?? undefined;
  const eventIdFromQuery = searchParams.get("eventId") ?? undefined;
  const selectedEvent = record.eventLog.find((event) => event.id === eventIdFromQuery) ?? record.eventLog[0];

  const selectedSnapshot = selectedEvent
    ? record.eventSnapshots[selectedEvent.id] ?? {
        metadata: record.metadata,
        canonicalState: record.canonicalState,
        evals: record.evals,
      }
    : {
        metadata: record.metadata,
        canonicalState: record.canonicalState,
        evals: record.evals,
      };

  const evalJson = evalJsonIdFromQuery
    ? selectedSnapshot.evals.find((evaluation) => evaluation.id === evalJsonIdFromQuery)
    : undefined;
  const parentLoadId = inferParentLoadId(record);
  const lifecycleStatus = normalizeStatusLabel(record.canonicalState.status);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    const currentViewFromQuery = searchParams.get("view");
    if (!currentViewFromQuery || !VALID_NON_LOAD_VIEWS.includes(currentViewFromQuery as NonLoadViewKey)) {
      nextParams.set("view", "event-log");
      changed = true;
    }

    if (searchParams.get("tab")) {
      nextParams.delete("tab");
      changed = true;
    }

    if (selectedEvent && eventIdFromQuery !== selectedEvent.id) {
      nextParams.set("eventId", selectedEvent.id);
      changed = true;
    }

    if (!selectedEvent && eventIdFromQuery) {
      nextParams.delete("eventId");
      changed = true;
    }

    if (evalJsonIdFromQuery && !evalJson) {
      nextParams.delete("evalJsonId");
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [evalJson, evalJsonIdFromQuery, eventIdFromQuery, searchParams, selectedEvent, setSearchParams]);

  const handleSelectEvent = (eventId: string) => {
    setQueryParams({ eventId });
  };

  const handleChangeNonLoadView = (view: NonLoadViewKey) => {
    setQueryParams({ view, evalJsonId: null });
  };

  const handleOpenEval = (evalId: string) => {
    navigate(`/eval/${evalId}`);
  };

  const handleOpenEvalJson = (evalId: string) => {
    setQueryParams({ view: "evals", evalJsonId: evalId });
  };

  const handleCloseEvalJson = () => {
    setQueryParams({ evalJsonId: null });
  };

  const nonLoadTabs: { key: NonLoadViewKey; label: string }[] = [
    { key: "event-log", label: "Event Log" },
    { key: "state", label: "Entity State" },
    { key: "evals", label: "Evaluations" },
  ];

  return (
    <>
      <div className="dark h-screen bg-[#08090c] font-sans text-zinc-100 antialiased">
        <TopBar
          title={
            <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap">
              <span>{getEntityTitle(entityType)}: {entityId}</span>
              <CopyIconButton value={entityId} label={`${getEntityTitle(entityType)} ID`} />
              <span className={`${STATUS_BADGE_BASE} ${lifecycleChipClasses(record.canonicalState.status)}`}>
                {lifecycleStatus}
              </span>
            </span>
          }
          rightContent={
            parentLoadId ? (
              <Link
                to={`/entity/load/${parentLoadId}`}
                className="inline-flex h-6 items-center rounded-full border border-[#343b48] bg-[#171b24] px-2.5 text-[11px] leading-none text-zinc-300 transition hover:border-[#4d5a74] hover:text-zinc-100"
              >
                Load: {parentLoadId}
                <GoIcon className="ml-1 h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        />

        <section className="flex h-12 items-end border-b border-borderSubtle bg-[#0f1115] px-4">
          <nav className="flex items-center gap-4">
            {nonLoadTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleChangeNonLoadView(tab.key)}
                className={`h-11 border-b-2 px-1 text-[13px] font-medium tracking-[-0.01em] transition ${
                  nonLoadView === tab.key
                    ? "border-zinc-200 text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </section>

        <main className="h-[calc(100vh-56px-48px)]">
          {nonLoadView === "event-log" ? (
            <div className="grid h-full grid-cols-[320px_600px_minmax(0,1fr)]">
              <Panel title="Event Log" stickyHeader className="border-r border-borderSubtle">
                <EventLogList
                  events={record.eventLog}
                  selectedEventId={selectedEvent?.id}
                  onSelect={handleSelectEvent}
                />
              </Panel>

              <Panel
                title={
                  <span className="inline-flex items-center gap-2">
                    Event: <span className="font-mono text-[12px] text-zinc-400">{selectedEvent?.id ?? "-"}</span>
                    {selectedEvent ? <CopyIconButton value={selectedEvent.id} label="Event ID" /> : null}
                  </span>
                }
                stickyHeader
                className="border-r border-borderSubtle"
              >
                {selectedEvent ? (
                  <JsonViewer value={selectedEvent} />
                ) : (
                  <div className="p-4 text-[13px] text-zinc-400">No events available.</div>
                )}
              </Panel>

              <Panel
                title={
                  <span className="inline-flex items-center gap-2">
                    Message: <span className="font-mono text-[12px] text-zinc-400">{selectedEvent?.messageRef.messageId ?? "-"}</span>
                    {selectedEvent ? <CopyIconButton value={selectedEvent.messageRef.messageId} label="Message ID" /> : null}
                  </span>
                }
                stickyHeader
                headerRight={
                  selectedEvent ? (
                    <Link
                      to={`/thread/${selectedEvent.messageRef.threadId}?messageId=${selectedEvent.messageRef.messageId}&eventId=${selectedEvent.id}`}
                      className="inline-flex items-center rounded-full border border-[#343b48] bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-[#4d5a74] hover:text-zinc-100"
                    >
                      View Thread
                      <GoIcon className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  ) : null
                }
              >
                <MessagePreview event={selectedEvent} />
              </Panel>
            </div>
          ) : null}

          {nonLoadView === "state" ? (
            <Panel className="h-full">
              <JsonViewer value={selectedSnapshot.canonicalState} />
            </Panel>
          ) : null}

          {nonLoadView === "evals" ? (
            <Panel className="h-full">
              <EvalList
                evaluations={selectedSnapshot.evals}
                onOpenEval={handleOpenEval}
                onViewJson={handleOpenEvalJson}
                activeJsonEvalId={evalJson?.id}
              />
            </Panel>
          ) : null}
        </main>
      </div>

      {evalJson ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Close evaluation JSON overlay"
            onClick={handleCloseEvalJson}
            className="absolute inset-0 bg-black/55"
          />
          <aside className="absolute inset-y-0 right-0 z-10 w-[min(820px,94vw)] border-l border-borderSubtle bg-[#0f1115] shadow-2xl">
            <header className="flex h-14 items-center justify-between border-b border-borderSubtle bg-[#121722] px-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 truncate text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">
                  <span>Evaluation: <span className="font-mono text-[12px] text-zinc-400">{evalJson.id}</span></span>
                  <CopyIconButton value={evalJson.id} label="Evaluation ID" />
                </p>
              </div>
              <button
                type="button"
                aria-label="Close evaluation JSON"
                onClick={handleCloseEvalJson}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#343b48] text-zinc-300 transition hover:border-[#4d5a74] hover:bg-[#171e2b]"
              >
                ×
              </button>
            </header>

            <div className="stable-scroll h-[calc(100vh-56px)] overflow-y-scroll p-4">
              <pre className="rounded-card border border-borderSubtle bg-panelMuted p-4 font-mono text-[12px] leading-5 text-zinc-200 shadow-soft">
                {JSON.stringify(evalJson, null, 2)}
              </pre>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function EntityDetailPage() {
  const { entityType: routeEntityType, entityId } = useParams();

  const entityType = VALID_ENTITY_TYPES.includes(routeEntityType as EntityType)
    ? (routeEntityType as EntityType)
    : undefined;

  if (!entityType || !entityId) {
    return <Navigate to={`/entity/${DEFAULT_ENTITY.entityType}/${DEFAULT_ENTITY.entityId}`} replace />;
  }

  const record = getEntityRecord(entityType, entityId);
  if (!record) {
    return <Navigate to={`/entity/${DEFAULT_ENTITY.entityType}/${DEFAULT_ENTITY.entityId}`} replace />;
  }

  if (entityType === "load") {
    return <LoadEntityDetailView entityId={entityId} record={record} />;
  }

  return <StandardEntityDetailView entityType={entityType} entityId={entityId} record={record} />;
}
