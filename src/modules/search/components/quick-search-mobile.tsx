"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Tip } from "@/components/ui/tip";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useQuickSearchNav } from "../hooks/use-quick-search-nav";
import { QuickSearchResults } from "./quick-search-results";

// Dưới màn hình md ô tìm kiếm thu thành nút kính lúp ở header, mở hộp thoại tìm kiếm.
export function QuickSearchMobile() {
  const user = useAuthStore((state) => state.user);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const nav = useQuickSearchNav(() => setOpen(false));
  if (!user || user.unitLocked) return null;

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Tip label="Tìm kiếm nhanh">
        <Dialog.Trigger asChild>
          <button
            aria-label="Tìm kiếm nhanh"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:hidden"
            type="button"
          >
            <MagnifyingGlass size={22} />
          </button>
        </Dialog.Trigger>
      </Tip>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed inset-x-4 top-4 z-[61] flex max-h-[calc(100dvh-32px)] flex-col rounded-xl bg-white shadow-xl focus:outline-none">
          <Dialog.Title className="sr-only">Tìm kiếm nhanh</Dialog.Title>
          <Dialog.Description className="sr-only">Tìm huynh trưởng, đơn vị, khóa huấn luyện hoặc chứng chỉ.</Dialog.Description>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <MagnifyingGlass aria-hidden className="h-5 w-5 shrink-0 text-muted" />
            <input
              aria-controls={listboxId}
              aria-label="Tìm kiếm nhanh"
              autoComplete="off"
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
              maxLength={100}
              onChange={(event) => nav.setTerm(event.target.value)}
              onKeyDown={nav.onKeyDown}
              placeholder="Tìm kiếm nhanh..."
              role="combobox"
              aria-expanded
              type="search"
              value={nav.term}
            />
            <Dialog.Close asChild>
              <button aria-label="Đóng" className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-text-secondary hover:bg-surface-hover" type="button">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto">
            <QuickSearchResults
              activeEntry={nav.activeEntry}
              failed={nav.search.isError}
              groups={nav.search.groups}
              listboxId={listboxId}
              loading={nav.search.pending}
              onPick={nav.open}
              term={nav.term}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
