import { ReactNode } from "react";

type PanelProps = {
  title?: ReactNode;
  stickyHeader?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, stickyHeader = false, headerRight, children, className = "" }: PanelProps) {
  return (
    <section className={`flex min-h-0 flex-col bg-panel ${className}`}>
      {title ? (
        <header
          className={`z-10 flex h-12 items-center justify-between border-b border-borderSubtle bg-panel/95 px-4 ${
            stickyHeader ? "sticky top-0" : ""
          }`}
        >
          <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-zinc-100">{title}</h2>
          {headerRight}
        </header>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
