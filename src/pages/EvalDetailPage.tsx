import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Panel as ResizablePanel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { CopyIconButton } from "../components/CopyIconButton";
import { EvalEvidenceList } from "../components/EvalEvidenceList";
import { EvalOverview } from "../components/EvalOverview";
import { GoIcon } from "../components/Icons";
import { MessagePanel } from "../components/MessagePanel";
import { Panel } from "../components/Panel";
import { TopBar } from "../components/TopBar";
import { evalsById, getEvalRecordById, getEventForEval, getEvidenceItemsForEval } from "../mock/evalViewData";
import { getAllEventsForThread } from "../mock/threadViewData";
import { useSetQueryParams } from "../utils/useQueryState";

const DEFAULT_EVAL_ID = Object.keys(evalsById)[0] ?? "eval_ld_2";

type FeedbackDecision = "agree" | "disagree" | null;

function formatCompactVariance(value: number): string {
  return `${value < 0 ? "▼" : "▲"} ${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function EvalDetailPage() {
  const { evalId: routeEvalId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const setQueryParams = useSetQueryParams();

  const [showEvidence, setShowEvidence] = useState(true);
  const [feedbackDecision, setFeedbackDecision] = useState<FeedbackDecision>(null);
  const [disagreeReason, setDisagreeReason] = useState("");
  const [disagreeNote, setDisagreeNote] = useState("");

  const evalId = routeEvalId ?? DEFAULT_EVAL_ID;
  const evaluation = getEvalRecordById(evalId);

  if (!evaluation) {
    return <Navigate to={`/eval/${DEFAULT_EVAL_ID}`} replace />;
  }

  const eventIdFromQuery = searchParams.get("eventId") ?? undefined;
  const jsonEventIdFromQuery = searchParams.get("jsonEventId") ?? undefined;

  const evidenceItems = getEvidenceItemsForEval(evaluation.id);
  const selectedEvidence = evidenceItems.find((item) => item.event.id === eventIdFromQuery) ?? evidenceItems[0];
  const jsonEvent = jsonEventIdFromQuery ? getEventForEval(evaluation.id, jsonEventIdFromQuery) : undefined;
  const loadId = useMemo(() => {
    if (evaluation.entityType === "load") {
      return evaluation.entityId;
    }

    const threadId = evidenceItems[0]?.event.messageRef.threadId;
    if (!threadId) {
      return undefined;
    }

    return getAllEventsForThread(threadId).find((event) => event.entityType === "load")?.entityId;
  }, [evaluation.entityId, evaluation.entityType, evidenceItems]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    if (selectedEvidence && eventIdFromQuery !== selectedEvidence.event.id) {
      nextParams.set("eventId", selectedEvidence.event.id);
      changed = true;
    }

    if (jsonEventIdFromQuery && !jsonEvent) {
      nextParams.delete("jsonEventId");
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [eventIdFromQuery, jsonEvent, jsonEventIdFromQuery, searchParams, selectedEvidence, setSearchParams]);

  const handleSelectEvidenceEvent = (eventId: string) => {
    setQueryParams({ eventId });
  };

  const handleOpenEventJson = (eventId: string) => {
    setQueryParams({ eventId, jsonEventId: eventId });
  };

  const handleCloseEventJson = () => {
    setQueryParams({ jsonEventId: null });
  };

  const topStatus = useMemo(() => {
    if (feedbackDecision === "agree") {
      return {
        label: "Review Status: Confirmed",
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      };
    }

    if (feedbackDecision === "disagree") {
      return {
        label: "Review Status: Rejected",
        className: "border-rose-500/40 bg-rose-500/10 text-rose-300",
      };
    }

    return {
      label: "Review Status: Pending",
      className: "border-zinc-600 bg-[#171b24] text-zinc-300",
    };
  }, [feedbackDecision]);

  const resolutionChipClass = "border-zinc-600 bg-[#171b24] text-zinc-300";

  return (
    <div className="dark h-screen bg-[#08090c] font-sans text-zinc-100 antialiased">
      <TopBar
        title={
          <span className="inline-flex items-center gap-2">
            <span>Evaluation: {evaluation.id}</span>
            <CopyIconButton value={evaluation.id} label="Evaluation ID" />
          </span>
        }
        inlineAction={loadId ? (
          <Link
            className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            to={`/entity/load/${loadId}`}
          >
            Load: {loadId}
            <GoIcon className="ml-1 h-3.5 w-3.5" />
          </Link>
        ) : null}
        rightContent={
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${topStatus.className}`}>
              {topStatus.label}
            </span>
            <button
              type="button"
              disabled
              className={`inline-flex cursor-default items-center rounded-full border px-2.5 py-1 text-[11px] ${resolutionChipClass}`}
            >
              Unresolved
            </button>
          </div>
        }
      />

      <main className="h-[calc(100vh-56px)]">
        <PanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={56} minSize={38}>
            <Panel
              title={evaluation.exception.title}
              stickyHeader
              className="h-full border-r border-borderSubtle"
              headerRight={
                <span className="mr-2 inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {formatCompactVariance(evaluation.varianceAmount)}
                </span>
              }
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="stable-scroll min-h-0 flex-1 overflow-y-scroll p-4 pb-6 pr-6">
                  <EvalOverview evaluation={evaluation} />

                  <section className="-mx-4 mt-5 overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
                    <header className="flex items-center justify-between border-b border-borderSubtle px-4 py-2.5">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Evidence</h4>
                      <button
                        type="button"
                        onClick={() => setShowEvidence((current) => !current)}
                        className="text-[11px] text-zinc-400 transition hover:text-zinc-200"
                      >
                        {showEvidence ? "See Less" : "See More"}
                      </button>
                    </header>

                    {showEvidence ? (
                      <div className="px-4 py-3">
                        <EvalEvidenceList
                          items={evidenceItems}
                          selectedEventId={selectedEvidence?.event.id}
                          onSelectEvent={handleSelectEvidenceEvent}
                          onOpenJson={handleOpenEventJson}
                        />
                      </div>
                    ) : null}
                  </section>
                </div>

                <section className="shrink-0 border-t border-zinc-600/60 bg-[#171d28] px-4 py-3 shadow-[0_-10px_24px_-18px_rgba(0,0,0,0.9)]">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-300">Feedback</h4>
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackDecision("agree");
                        setDisagreeReason("");
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                        feedbackDecision === "agree"
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                          : "border-zinc-700 bg-[#171b24] text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      Agree
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackDecision("disagree");
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                        feedbackDecision === "disagree"
                          ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                          : "border-zinc-700 bg-[#171b24] text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      Disagree
                    </button>
                  </div>

                  {feedbackDecision === "disagree" ? (
                    <div className="space-y-2">
                      <select
                        value={disagreeReason}
                        onChange={(event) => setDisagreeReason(event.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-[#10141c] px-2.5 py-2 text-[12px] text-zinc-200 outline-none focus:border-zinc-500"
                      >
                        <option value="">Select reason</option>
                        <option value="wrong_charge_code">Wrong charge code mapping</option>
                        <option value="incorrect_expected">Incorrect expected amount</option>
                        <option value="missing_context">Missing contextual evidence</option>
                        <option value="false_positive">False positive exception</option>
                      </select>

                      <textarea
                        value={disagreeNote}
                        onChange={(event) => setDisagreeNote(event.target.value)}
                        rows={3}
                        placeholder="Optional note"
                        className="w-full resize-none rounded-lg border border-zinc-700 bg-[#10141c] px-2.5 py-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
                      />
                    </div>
                  ) : null}
                </section>
              </div>
            </Panel>
          </ResizablePanel>

          <PanelResizeHandle className="relative w-px bg-borderSubtle" />

          <ResizablePanel defaultSize={44} minSize={28}>
            <Panel
              title="Message"
              stickyHeader
              className="h-full"
              headerRight={
                selectedEvidence ? (
                  <Link
                    to={`/thread/${selectedEvidence.event.messageRef.threadId}?messageId=${selectedEvidence.event.messageRef.messageId}&eventId=${selectedEvidence.event.id}`}
                    className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  >
                    View Thread
                    <GoIcon className="ml-1 h-3.5 w-3.5" />
                  </Link>
                ) : null
              }
            >
              <MessagePanel eventId={selectedEvidence?.event.id} />
            </Panel>
          </ResizablePanel>
        </PanelGroup>
      </main>

      {jsonEvent ? (
        <div className="fixed inset-0 z-[70]">
          <button type="button" aria-label="Close JSON overlay" onClick={handleCloseEventJson} className="absolute inset-0 bg-black/55" />
          <aside className="absolute inset-y-0 right-0 z-10 w-[min(820px,94vw)] border-l border-borderSubtle bg-[#0b0f15] shadow-2xl">
            <header className="flex h-14 items-center justify-between border-b border-borderSubtle bg-[#10141c] px-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 truncate text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">
                  <span>Event: <span className="font-mono text-[12px] text-zinc-400">{jsonEvent.id}</span></span>
                  <CopyIconButton value={jsonEvent.id} label="Event ID" />
                </p>
              </div>
              <button
                type="button"
                aria-label="Close event JSON"
                onClick={handleCloseEventJson}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                ×
              </button>
            </header>

            <div className="stable-scroll h-[calc(100vh-56px)] overflow-y-scroll p-4">
              <pre className="rounded-card border border-borderSubtle bg-panelMuted p-4 font-mono text-[12px] leading-5 text-zinc-200 shadow-soft">
                {JSON.stringify(jsonEvent, null, 2)}
              </pre>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
