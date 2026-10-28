"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useId, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useQuickSearchNav } from "../hooks/use-quick-search-nav";
import { QuickSearchResults } from "./quick-search-results";

// Ô tìm kiếm nhanh ở header (từ màn hình md). Ctrl/⌘+K đưa con trỏ vào ô. Tài khoản bị khóa đơn vị không dùng được.
export function QuickSearch() {
  const user = useAuthStore((state) => state.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const nav = useQuickSearchNav(() => {
    setOpen(false);
    inputRef.current?.blur();
  });

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  if (!user || user.unitLocked) return <div className="hidden md:block md:w-full md:max-w-[460px]" />;

  const showPanel = open && nav.term.trim().length > 0;

  return (
    <Popover.Root open={showPanel} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className="hidden h-10 w-full max-w-[460px] items-center gap-3 rounded-lg border border-border bg-surface-1 px-3 text-sm focus-within:border-primary focus-within:bg-white md:flex">
          <MagnifyingGlass aria-hidden className="h-5 w-5 shrink-0 text-muted" />
          <input
            aria-autocomplete="list"
            aria-controls={showPanel ? listboxId : undefined}
            aria-expanded={showPanel}
            aria-label="Tìm kiếm nhanh"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted"
            maxLength={100}
            onChange={(event) => {
              nav.setTerm(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                return;
              }
              nav.onKeyDown(event);
            }}
            placeholder="Tìm kiếm nhanh..."
            ref={inputRef}
            role="combobox"
            type="search"
            value={nav.term}
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-white px-1.5 py-0.5 text-[11px] text-muted lg:block">Ctrl K</kbd>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[460px] rounded-xl border border-border bg-white shadow-[var(--shadow-elevated)]"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (inputRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
          sideOffset={8}
        >
          <QuickSearchResults
            activeEntry={nav.activeEntry}
            failed={nav.search.isError}
            groups={nav.search.groups}
            listboxId={listboxId}
            loading={nav.search.pending}
            onPick={nav.open}
            term={nav.term}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

