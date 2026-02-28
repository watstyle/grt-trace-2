import { ReactNode } from "react";
import { TopBar } from "./TopBar";

type ThreePanelLayoutProps = {
  topTitle: ReactNode;
  topSubtitle?: string;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  rightWidthClass?: string;
};

export function ThreePanelLayout({
  topTitle,
  topSubtitle,
  left,
  center,
  right,
  rightWidthClass = "grid-cols-[320px_minmax(0,1fr)_440px]",
}: ThreePanelLayoutProps) {
  return (
    <div className="dark h-screen bg-[#08090c] font-sans text-zinc-100 antialiased">
      <TopBar title={topTitle} subtitle={topSubtitle} />
      <main className={`grid h-[calc(100vh-56px)] ${rightWidthClass}`}>
        {left}
        {center}
        {right}
      </main>
    </div>
  );
}
