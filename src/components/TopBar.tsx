import { ReactNode } from "react";
import { useNavigationStack } from "../utils/useNavigationStack";
import { MenuIcon } from "./Icons";
import { useSidebar } from "./SidebarContext";

type TopBarProps = {
  title: ReactNode;
  subtitle?: string;
  inlineAction?: ReactNode;
  rightContent?: ReactNode;
  showBackButton?: boolean;
  sticky?: boolean;
};

export function TopBar({ title, subtitle, inlineAction, rightContent, showBackButton = true, sticky = false }: TopBarProps) {
  const { canGoBack, goBack } = useNavigationStack();
  const { isOpen, onTriggerEnter, onTriggerLeave, onBackArrowEnter } = useSidebar();

  return (
    <header
      className={`${sticky ? "sticky top-0 z-50" : "relative"} h-14 shrink-0 border-b border-borderSubtle backdrop-blur-sm ${
        isOpen ? "bg-[#08090c]" : "bg-[#0b0d11]/95"
      }`}
    >
      {isOpen ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/35" /> : null}
      <div className="flex h-full items-center px-4">
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label="Expand sidebar"
            title="Expand"
            onMouseEnter={onTriggerEnter}
            onMouseLeave={onTriggerLeave}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <MenuIcon className="h-4 w-4" />
          </button>
          <div className="mx-2">
            <span className="text-zinc-700">|</span>
          </div>
          {showBackButton ? (
            <div onMouseEnter={onBackArrowEnter} className="inline-flex mr-2">
              <button
                type="button"
                aria-label="Go back"
                onClick={goBack}
                disabled={!canGoBack}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[13px] text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
              >
                ←
              </button>
            </div>
          ) : null}
        </div>

        <div className={`flex min-w-0 flex-1 items-center justify-between ${showBackButton ? "pl-0" : "pl-2"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-[15px] font-semibold leading-none tracking-[-0.01em] text-zinc-100">{title}</h1>
            {subtitle ? <span className="truncate font-mono text-[12px] leading-none text-zinc-500">{subtitle}</span> : null}
            {inlineAction ? <div className="flex shrink-0 items-center">{inlineAction}</div> : null}
          </div>
          {rightContent ? <div className="ml-3 flex shrink-0 items-center">{rightContent}</div> : null}
        </div>
      </div>
    </header>
  );
}
