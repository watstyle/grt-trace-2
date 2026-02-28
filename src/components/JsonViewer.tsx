type JsonViewerProps = {
  value: unknown;
  className?: string;
};

export function JsonViewer({ value, className = "" }: JsonViewerProps) {
  return (
    <div className={`h-full min-h-0 p-3 ${className}`}>
      <div className="h-full min-h-0 overflow-auto rounded-card border border-borderSubtle bg-panelMuted shadow-soft">
        <pre className="min-h-full p-3 font-mono text-[12px] leading-5 text-zinc-200">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}
