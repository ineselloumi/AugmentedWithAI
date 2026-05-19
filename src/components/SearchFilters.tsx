"use client";

interface SearchFiltersProps {
  hasChatGPT: boolean;
  hasClaude: boolean;
  freeOnly: boolean;
  onChange: (key: "hasChatGPT" | "hasClaude" | "freeOnly", value: boolean) => void;
  disabled: boolean;
}

export default function SearchFilters({ hasChatGPT, hasClaude, freeOnly, onChange, disabled }: SearchFiltersProps) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Focus your search</p>
      <div className="flex flex-col gap-2">
        <Checkbox
          id="chatgpt"
          label="I have a ChatGPT subscription"
          checked={hasChatGPT}
          onChange={(v) => onChange("hasChatGPT", v)}
          disabled={disabled}
        />
        <Checkbox
          id="claude"
          label="I have a Claude subscription"
          checked={hasClaude}
          onChange={(v) => onChange("hasClaude", v)}
          disabled={disabled}
        />
        <Checkbox
          id="free-only"
          label="Only show me tools with a free trial or plan"
          checked={freeOnly}
          onChange={(v) => onChange("freeOnly", v)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Checkbox({ id, label, checked, onChange, disabled }: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2.5 cursor-pointer group ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? "bg-green-500 border-green-500"
          : "bg-transparent border-neutral-600 group-hover:border-neutral-400"
      }`}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,6 5,9 10,3" />
          </svg>
        )}
      </div>
      <span className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors select-none">{label}</span>
    </label>
  );
}
