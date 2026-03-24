"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "prompt-chain-theme";

function resolveSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(choice: ThemeChoice) {
  const nextTheme = choice === "system" ? resolveSystemTheme() : choice;
  document.documentElement.dataset.themeChoice = choice;
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
}

export default function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const storedChoice = localStorage.getItem(STORAGE_KEY);
    if (storedChoice === "light" || storedChoice === "dark" || storedChoice === "system") {
      return storedChoice;
    }

    return "system";
  });

  useEffect(() => {
    applyTheme(choice);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (choice === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [choice]);

  function updateChoice(nextChoice: ThemeChoice) {
    localStorage.setItem(STORAGE_KEY, nextChoice);
    setChoice(nextChoice);
    applyTheme(nextChoice);
  }

  return (
    <div className="inline-flex flex-wrap rounded-full border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-1">
      {(["light", "dark", "system"] as ThemeChoice[]).map((value) => {
        const isActive = choice === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => updateChoice(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              isActive
                ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
