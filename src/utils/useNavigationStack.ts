import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";

type NavEntry = {
  key: string;
  path: string;
};

type NavState = {
  entries: NavEntry[];
  index: number;
};

const STORAGE_KEY = "trace_nav_stack_v1";
const MAX_ENTRIES = 200;

function readStoredState(): NavState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as NavState;
    if (!Array.isArray(parsed.entries) || typeof parsed.index !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clampIndex(value: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(value, length - 1));
}

export function useNavigationStack() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  const currentEntry = useMemo<NavEntry>(
    () => ({
      key: location.key,
      path: location.pathname,
    }),
    [location.key, location.pathname],
  );

  const [state, setState] = useState<NavState>(() => {
    const stored = readStoredState();
    if (!stored || stored.entries.length === 0) {
      return { entries: [currentEntry], index: 0 };
    }

    const storedIndex = stored.entries.findIndex((entry) => entry.key === currentEntry.key);
    if (storedIndex >= 0) {
      return {
        entries: stored.entries,
        index: storedIndex,
      };
    }

    const entries = [...stored.entries, currentEntry].slice(-MAX_ENTRIES);
    return {
      entries,
      index: entries.length - 1,
    };
  });

  useEffect(() => {
    setState((prev) => {
      const keyIndex = prev.entries.findIndex((entry) => entry.key === currentEntry.key);
      const currentIndexEntry = prev.entries[clampIndex(prev.index, prev.entries.length)];
      const sameViewAsCurrentIndex = currentIndexEntry?.path === currentEntry.path;

      if (navigationType === "POP") {
        if (keyIndex >= 0) {
          if (prev.index === keyIndex) {
            return prev;
          }
          return { ...prev, index: keyIndex };
        }

        if (sameViewAsCurrentIndex) {
          return prev;
        }

        const entries = [...prev.entries, currentEntry].slice(-MAX_ENTRIES);
        return { entries, index: entries.length - 1 };
      }

      if (navigationType === "REPLACE") {
        const entries = [...prev.entries];
        if (entries.length === 0) {
          entries.push(currentEntry);
          return { entries, index: 0 };
        }

        const targetIndex = clampIndex(prev.index, entries.length);
        const existing = entries[targetIndex];
        if (existing?.key === currentEntry.key && existing.path === currentEntry.path) {
          return prev;
        }

        entries[targetIndex] = currentEntry;
        return { entries, index: targetIndex };
      }

      // PUSH
      if (sameViewAsCurrentIndex) {
        return prev;
      }

      const entries = prev.entries.slice(0, prev.index + 1);
      const last = entries[entries.length - 1];
      if (last && last.key === currentEntry.key && last.path === currentEntry.path) {
        return prev;
      }

      const nextEntries = [...entries, currentEntry].slice(-MAX_ENTRIES);
      return { entries: nextEntries, index: nextEntries.length - 1 };
    });
  }, [currentEntry, navigationType]);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const canGoBack = state.index > 0;
  const canGoForward = state.index < state.entries.length - 1;

  return {
    canGoBack,
    canGoForward,
    goBack: () => {
      if (canGoBack) {
        navigate(-1);
      }
    },
    goForward: () => {
      if (canGoForward) {
        navigate(1);
      }
    },
  };
}
