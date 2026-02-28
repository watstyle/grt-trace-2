import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import {
  AuditIcon,
  ChargesIcon,
  EntitiesIcon,
  EvaluationsIcon,
  ExceptionsIcon,
  LoadsIcon,
  QuotesIcon,
  ThreadsIcon,
} from "./Icons";

type SidebarViewKey = "threads" | "loads" | "quotes" | "charges" | "evaluations" | "exceptions";
type SidebarIcon = typeof ThreadsIcon;

const MENU_SECTIONS: { label?: string; sectionIcon?: SidebarIcon; items: { key: SidebarViewKey; label: string; icon: SidebarIcon }[] }[] = [
  { label: "Sources", items: [{ key: "threads", label: "Threads", icon: ThreadsIcon }] },
  {
    label: "Entities",
    sectionIcon: EntitiesIcon,
    items: [
      { key: "loads", label: "Loads", icon: LoadsIcon },
      { key: "quotes", label: "Quotes", icon: QuotesIcon },
      { key: "charges", label: "Charges", icon: ChargesIcon },
    ],
  },
  {
    label: "Audit",
    sectionIcon: AuditIcon,
    items: [
      { key: "evaluations", label: "Evaluations", icon: EvaluationsIcon },
      { key: "exceptions", label: "Exceptions", icon: ExceptionsIcon },
    ],
  },
];

function getActiveViewFromPath(pathname: string): SidebarViewKey | null {
  if (pathname.startsWith("/list/")) {
    const key = pathname.split("/")[2] as SidebarViewKey | undefined;
    if (key === "threads" || key === "loads" || key === "quotes" || key === "charges" || key === "evaluations" || key === "exceptions") {
      return key;
    }
  }
  if (pathname.startsWith("/thread/")) {
    return "threads";
  }
  if (pathname.startsWith("/entity/load/")) {
    return "loads";
  }
  if (pathname.startsWith("/entity/quote/")) {
    return "quotes";
  }
  if (pathname.startsWith("/entity/charge/")) {
    return "charges";
  }
  if (pathname.startsWith("/eval/")) {
    return "evaluations";
  }
  return null;
}

function MenuButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: SidebarIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition ${
        active ? "bg-[#1c2433] text-zinc-100" : "text-zinc-400 hover:bg-[#171c26] hover:text-zinc-200"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${active ? "text-zinc-200" : "text-zinc-500"}`} />
        <span>{label}</span>
      </span>
    </button>
  );
}

export function GlobalSidebar() {
  const { isOpen, onPanelEnter, onPanelLeave, closeNow } = useSidebar();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const activeView = useMemo(() => getActiveViewFromPath(location.pathname), [location.pathname]);

  const goToView = (view: SidebarViewKey) => {
    const query = search.trim();
    navigate(query.length > 0 ? `/list/${view}?q=${encodeURIComponent(query)}` : `/list/${view}`);
    closeNow();
  };

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 bottom-0 top-14 z-[60] bg-black/35 transition-opacity duration-150 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`fixed left-0 top-14 z-[70] h-[calc(100vh-56px)] w-[360px] border-r border-borderSubtle bg-panelMuted shadow-[0_20px_60px_rgba(0,0,0,0.55)] transition-transform duration-150 ${
          isOpen ? "pointer-events-auto translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
        onMouseEnter={onPanelEnter}
        onMouseLeave={onPanelLeave}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="border-b border-borderSubtle bg-panelMuted p-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                goToView(activeView ?? "threads");
              }
            }}
            placeholder="Search any ID"
            className="w-full rounded-lg border border-borderSubtle bg-[#10141c] px-3 py-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          </header>

          <section className="px-3 py-2.5">
          {MENU_SECTIONS.map((section, index) => (
            <div key={index} className={index > 0 ? "mt-3" : ""}>
              {section.label ? (
                <p className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  {section.sectionIcon ? <section.sectionIcon className="h-3 w-3 text-zinc-500" /> : null}
                  <span>{section.label}</span>
                </p>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <MenuButton
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    active={activeView === item.key}
                    onClick={() => goToView(item.key)}
                  />
                ))}
              </div>
            </div>
          ))}
          </section>
        </div>
      </aside>
    </>
  );
}
