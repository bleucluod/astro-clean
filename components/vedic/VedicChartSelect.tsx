"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

/** Matches /chart's desktop select and mobile native-select structure. */
export function VedicChartSelect({
  ariaLabel, value, options, onChange, placeholder, disabled = false,
}: {
  ariaLabel: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    function pointer(event: PointerEvent) {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target))
        setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key); };
  }, [open]);

  return <div ref={ref} className={open ? "chart-select is-open" : "chart-select"}>
    <select className="chart-native-select" style={{ display: "none" }} dir="rtl"
      aria-label={ariaLabel} disabled={disabled} value={value}
      onChange={e => onChange(e.target.value)}>
      <option value="" disabled>{placeholder}</option>
      {options.map(option => <option key={option.value}
        value={option.value}>{option.label}</option>)}
    </select>
    <button type="button" className="chart-select-trigger" aria-label={ariaLabel}
      aria-haspopup="listbox" aria-expanded={open} disabled={disabled}
      onClick={() => setOpen(v => !v)}
      onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } }}>
      <span>{selected?.label ?? placeholder}</span>
      <span className="chart-select-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="chart-select-options" role="listbox" aria-label={ariaLabel}>
      {options.map(option => <button key={option.value} type="button"
        role="option" aria-selected={option.value === value}
        className={"chart-select-option" + (option.value === value ? " is-selected" : "")}
        onClick={() => { onChange(option.value); setOpen(false); }}>
        <span>{option.label}</span>
        {option.value === value && <span className="chart-select-option-check"
          aria-hidden="true">✓</span>}
      </button>)}
    </div>}
  </div>;
}
