"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import { flattenGroups, resultHref } from "../lib/result-link";
import type { QuickSearchEntry } from "../types";
import { useQuickSearch } from "./use-quick-search";

// Gom trạng thái ô nhập, kết quả và điều hướng bàn phím (↑ ↓ Enter) dùng chung cho ô ở header và hộp thoại mobile.
export function useQuickSearchNav(onNavigate: () => void) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const search = useQuickSearch(term);
  const entries = useMemo(() => flattenGroups(search.groups), [search.groups]);
  const activeEntry = entries[Math.min(activeIndex, Math.max(entries.length - 1, 0))];

  function open(entry: QuickSearchEntry) {
    onNavigate();
    setTerm("");
    router.push(resultHref(entry) as Route);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && entries.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % entries.length);
    } else if (event.key === "ArrowUp" && entries.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + entries.length) % entries.length);
    } else if (event.key === "Enter" && activeEntry) {
      event.preventDefault();
      open(activeEntry);
    }
  }

  return {
    term,
    setTerm: (value: string) => {
      setTerm(value);
      setActiveIndex(0);
    },
    search,
    entries,
    activeEntry,
    open,
    onKeyDown,
  };
}
