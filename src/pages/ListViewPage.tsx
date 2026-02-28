import { useMemo } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  EvalFilter,
  LifecycleFilter,
  SidebarEntityRow,
  SidebarEvalRow,
  sidebarChargeRows,
  sidebarEvalRows,
  sidebarExceptionRows,
  sidebarLoadRows,
  sidebarQuoteRows,
  sidebarThreadRows,
} from "../mock/sidebarData";
import { formatDateTime } from "../utils/format";
import { GoIcon } from "../components/Icons";
import { TopBar } from "../components/TopBar";

type ListViewKey = "threads" | "loads" | "quotes" | "charges" | "evaluations" | "exceptions";

const VALID_VIEWS: ListViewKey[] = ["threads", "loads", "quotes", "charges", "evaluations", "exceptions"];
const LIFECYCLE_FILTERS: LifecycleFilter[] = ["ALL", "CONFIRMED", "OFFERED", "REQUESTED", "REJECTED"];
const EVAL_FILTERS: EvalFilter[] = ["ALL", "PASS", "FAIL", "UNKNOWN", "MAPPED", "MATCHED"];

function resultClasses(result: SidebarEvalRow["result"]): string {
  if (result === "FAIL") {
    return "border-rose-500/50 bg-rose-500/10 text-rose-300";
  }
  if (result === "UNKNOWN") {
    return "border-zinc-500/50 bg-zinc-500/10 text-zinc-300";
  }
  return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
}

function rowLinkForEntity(row: SidebarEntityRow): string {
  return `/entity/${row.entityType}/${row.id}?view=event-log`;
}

function viewTitle(view: ListViewKey): string {
  if (view === "threads") {
    return "Threads";
  }
  if (view === "loads") {
    return "Loads";
  }
  if (view === "quotes") {
    return "Quotes";
  }
  if (view === "charges") {
    return "Charges";
  }
  if (view === "evaluations") {
    return "Evaluations";
  }
  return "Exceptions";
}

export function ListViewPage() {
  const { view: viewParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const view = VALID_VIEWS.includes(viewParam as ListViewKey) ? (viewParam as ListViewKey) : undefined;

  if (!view) {
    return <Navigate to="/list/threads" replace />;
  }

  const search = searchParams.get("q") ?? "";
  const lifecycleFilter = (searchParams.get("lifecycle") as LifecycleFilter | null) ?? "ALL";
  const evalFilter = (searchParams.get("eval") as EvalFilter | null) ?? "ALL";

  const normalizedLifecycle = LIFECYCLE_FILTERS.includes(lifecycleFilter) ? lifecycleFilter : "ALL";
  const normalizedEval = EVAL_FILTERS.includes(evalFilter) ? evalFilter : "ALL";

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return sidebarThreadRows;
    }
    return sidebarThreadRows.filter((row) => row.id.toLowerCase().includes(q) || row.subject.toLowerCase().includes(q));
  }, [search]);

  const filteredEntities = useMemo(() => {
    const rows = view === "loads" ? sidebarLoadRows : view === "quotes" ? sidebarQuoteRows : sidebarChargeRows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        q.length === 0 ||
        row.id.toLowerCase().includes(q) ||
        row.state.toLowerCase().includes(q) ||
        row.summary.toLowerCase().includes(q);
      const matchesLifecycle = normalizedLifecycle === "ALL" || row.lifecycle === normalizedLifecycle;
      return matchesSearch && matchesLifecycle;
    });
  }, [normalizedLifecycle, search, view]);

  const filteredEvals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sidebarEvalRows.filter((row) => {
      const matchesSearch =
        q.length === 0 ||
        row.id.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.entityId.toLowerCase().includes(q) ||
        row.reasonCodes.join(",").toLowerCase().includes(q);
      const matchesFilter = normalizedEval === "ALL" || row.result === normalizedEval;
      return matchesSearch && matchesFilter;
    });
  }, [normalizedEval, search]);

  const filteredExceptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sidebarExceptionRows.filter((row) => {
      if (!q) {
        return true;
      }
      return (
        row.id.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.entityId.toLowerCase().includes(q) ||
        row.evalId.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const setQuery = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="dark h-screen bg-[#08090c] font-sans text-zinc-100 antialiased">
      <TopBar title={viewTitle(view)} showBackButton={false} />

      <main className="h-[calc(100vh-56px)] px-4 py-4">
        <section className="mb-3 rounded-card border border-borderSubtle bg-panelMuted p-3 shadow-soft">
          <input
            value={search}
            onChange={(event) => setQuery({ q: event.target.value })}
            placeholder={`Search ${viewTitle(view).toLowerCase()}...`}
            className="w-full rounded-lg border border-borderSubtle bg-[#10141c] px-3 py-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          {(view === "loads" || view === "quotes" || view === "charges") ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-borderSubtle bg-[#10141c] p-1">
              {LIFECYCLE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQuery({ lifecycle: filter })}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    normalizedLifecycle === filter
                      ? "bg-[#1c2433] text-zinc-100"
                      : "text-zinc-400 hover:bg-[#171c26] hover:text-zinc-200"
                  }`}
                >
                  {filter === "ALL" ? "All" : filter}
                </button>
              ))}
            </div>
          ) : null}
          {view === "evaluations" ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-borderSubtle bg-[#10141c] p-1">
              {EVAL_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQuery({ eval: filter })}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    normalizedEval === filter
                      ? "bg-[#1c2433] text-zinc-100"
                      : "text-zinc-400 hover:bg-[#171c26] hover:text-zinc-200"
                  }`}
                >
                  {filter === "ALL" ? "All" : filter}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {view === "threads" ? (
          <div className="overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
            <div className="overflow-auto">
              <table className="min-w-full table-fixed">
                <thead className="sticky top-0 z-[1] bg-[#121722]">
                  <tr className="border-b border-borderSubtle">
                    <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Thread</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Subject</th>
                    <th className="w-[90px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Msgs</th>
                    <th className="w-[150px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Updated</th>
                    <th className="w-[60px] px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredThreads.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/thread/${row.id}`)}
                      className="cursor-pointer border-b border-borderSubtle/70 text-[12px] text-zinc-300 transition hover:bg-[#171e2b]"
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">{row.id}</td>
                      <td className="truncate px-3 py-2 text-zinc-200" title={row.subject}>{row.subject}</td>
                      <td className="px-3 py-2 text-zinc-300">{row.messageCount}</td>
                      <td className="px-3 py-2 text-[11px] text-zinc-400">{formatDateTime(row.updatedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/thread/${row.id}`)}
                          className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                        >
                          <GoIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {(view === "loads" || view === "quotes" || view === "charges") ? (
          <div className="overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
            <div className="overflow-auto">
              <table className="min-w-full table-fixed">
                <thead className="sticky top-0 z-[1] bg-[#121722]">
                  <tr className="border-b border-borderSubtle">
                    <th className="w-[140px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                      {view === "loads" ? "Load ID" : view === "quotes" ? "Quote ID" : "Charge ID"}
                    </th>
                    <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Lifecycle</th>
                    <th className="w-[140px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">State</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Summary</th>
                    <th className="w-[150px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Updated</th>
                    <th className="w-[60px] px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.map((row) => (
                    <tr
                      key={`${row.entityType}:${row.id}`}
                      onClick={() => navigate(rowLinkForEntity(row))}
                      className="cursor-pointer border-b border-borderSubtle/70 text-[12px] text-zinc-300 transition hover:bg-[#171e2b]"
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">{row.id}</td>
                      <td className="px-3 py-2 text-zinc-300">{row.lifecycle}</td>
                      <td className="truncate px-3 py-2 text-zinc-300" title={row.state}>{row.state}</td>
                      <td className="truncate px-3 py-2 text-zinc-200" title={row.summary}>{row.summary}</td>
                      <td className="px-3 py-2 text-[11px] text-zinc-400">{formatDateTime(row.updatedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(rowLinkForEntity(row))}
                          className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                        >
                          <GoIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {view === "evaluations" ? (
          <div className="overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
            <div className="overflow-auto">
              <table className="min-w-full table-fixed">
                <thead className="sticky top-0 z-[1] bg-[#121722]">
                  <tr className="border-b border-borderSubtle">
                    <th className="w-[140px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Eval ID</th>
                    <th className="w-[110px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Result</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Title</th>
                    <th className="w-[180px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Entity</th>
                    <th className="w-[60px] px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvals.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/eval/${row.id}`)}
                      className="cursor-pointer border-b border-borderSubtle/70 text-[12px] text-zinc-300 transition hover:bg-[#171e2b]"
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">{row.id}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${resultClasses(row.result)}`}>
                          {row.result}
                        </span>
                      </td>
                      <td className="truncate px-3 py-2 text-zinc-200" title={row.title}>{row.title}</td>
                      <td className="truncate px-3 py-2 text-[11px] text-zinc-400" title={`${row.entityType}:${row.entityId}`}>
                        {row.entityType}:{row.entityId}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/eval/${row.id}`)}
                          className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                        >
                          <GoIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {view === "exceptions" ? (
          <div className="overflow-hidden rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
            <div className="overflow-auto">
              <table className="min-w-full table-fixed">
                <thead className="sticky top-0 z-[1] bg-[#121722]">
                  <tr className="border-b border-borderSubtle">
                    <th className="w-[120px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Exception</th>
                    <th className="w-[100px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Title</th>
                    <th className="w-[140px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Entity</th>
                    <th className="w-[60px] px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExceptions.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/eval/${row.evalId}`)}
                      className="cursor-pointer border-b border-borderSubtle/70 text-[12px] text-zinc-300 transition hover:bg-[#171e2b]"
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">{row.id}</td>
                      <td className="px-3 py-2 text-zinc-300">{row.status}</td>
                      <td className="truncate px-3 py-2 text-zinc-200" title={row.title}>{row.title}</td>
                      <td className="truncate px-3 py-2 text-[11px] text-zinc-400" title={`${row.entityType}:${row.entityId}`}>
                        {row.entityType}:{row.entityId}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/eval/${row.evalId}`)}
                          className="inline-flex items-center rounded-full border border-zinc-700 bg-[#171b24] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                        >
                          <GoIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
