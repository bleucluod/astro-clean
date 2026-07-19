"use client";

import { useEffect, useId, useState } from "react";
import styles from "@/app/sky/sky.module.css";

type CitySuggestion = {
  id: string;
  faName: string;
  provinceFaName: string;
};

export function SkyCityPicker({ initialCity }: { initialCity: CitySuggestion }) {
  const listboxId = useId();
  const [displayValue, setDisplayValue] = useState(initialCity.faName);
  const [submittedValue, setSubmittedValue] = useState(initialCity.id);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const query = displayValue.trim();
    if (!isOpen || query.length < 2 || submittedValue === initialCity.id && query === initialCity.faName) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/sky/cities?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { cities?: CitySuggestion[] };
        setSuggestions(payload.cities ?? []);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [displayValue, initialCity.faName, initialCity.id, isOpen, submittedValue]);

  function chooseCity(city: CitySuggestion) {
    setDisplayValue(city.faName);
    setSubmittedValue(city.id);
    setSuggestions([]);
    setActiveIndex(-1);
    setIsOpen(false);
  }

  return (
    <label className={styles.cityPicker}>
      <span>شهر</span>
      <input type="hidden" name="city" value={submittedValue} />
      <input
        value={displayValue}
        placeholder="مثلاً تهران"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          setDisplayValue(event.target.value);
          setSubmittedValue(event.target.value);
          if (event.target.value.trim().length < 2) setSuggestions([]);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (!suggestions.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            chooseCity(suggestions[activeIndex]);
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
      />
      {isOpen && suggestions.length > 0 ? (
        <ul id={listboxId} role="listbox" className={styles.citySuggestions}>
          {suggestions.map((city, index) => (
            <li
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              key={city.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseCity(city)}
            >
              <strong>{city.faName}</strong>
              <span>{city.provinceFaName}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}
