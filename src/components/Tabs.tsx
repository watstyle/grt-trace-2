export type EntityTabKey = "message" | "state" | "evals";

type TabsProps = {
  value: EntityTabKey;
  onChange: (next: EntityTabKey) => void;
};

const TABS: { key: EntityTabKey; label: string }[] = [
  { key: "message", label: "Message" },
  { key: "state", label: "Entity State" },
  { key: "evals", label: "Evaluations" },
];

export function Tabs({ value, onChange }: TabsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle bg-[#121722] p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
            value === tab.key
              ? "bg-[#1c2433] text-zinc-100"
              : "text-zinc-400 hover:bg-[#171e2b] hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
