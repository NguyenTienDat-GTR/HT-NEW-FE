"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiMutation, getApiErrorMessage } from "@/lib/api/client";
import { resourceKey } from "@/lib/api/query-keys";
import { normalizeSubdomain, validateSubdomain } from "../site-subdomain";

// Cấp / đổi / thu hồi subdomain (trang riêng) của giáo phận. Chỉ super-admin thấy (xem UnitDetail).
export function SiteSubdomainCard({ dioceseId, row }: { dioceseId: string; row: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const current = typeof row.siteSubdomain === "string" && row.siteSubdomain ? row.siteSubdomain : null;
  const siteUrl = typeof row.siteUrl === "string" ? row.siteUrl : null;
  const baseDomain = typeof row.siteBaseDomain === "string" && row.siteBaseDomain ? row.siteBaseDomain : null;
  const [value, setValue] = useState(current ?? "");
  const [touched, setTouched] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  const normalized = normalizeSubdomain(value);
  const error = touched ? validateSubdomain(value) : null;
  const unchanged = normalized === (current ?? "");

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: resourceKey() });
    await queryClient.invalidateQueries({ queryKey: ["resource-detail"] });
  }

  const grant = useMutation({
    mutationFn: () => apiMutation(`/dioceses/${encodeURIComponent(dioceseId)}/site-subdomain`, "PUT", { siteSubdomain: normalized }),
    onSuccess: async () => {
      toast.success(current ? "Đã đổi subdomain của giáo phận" : "Đã cấp subdomain cho giáo phận");
      setTouched(false);
      await refresh();
    },
    onError: (mutationError) => toast.error(getApiErrorMessage(mutationError)),
  });

  const revoke = useMutation({
    mutationFn: () => apiMutation(`/dioceses/${encodeURIComponent(dioceseId)}/site-subdomain`, "DELETE"),
    onSuccess: async () => {
      toast.success("Đã thu hồi subdomain của giáo phận");
      setConfirmingRevoke(false);
      setValue("");
      setTouched(false);
      await refresh();
    },
    onError: (mutationError) => toast.error(getApiErrorMessage(mutationError)),
  });

  const busy = grant.isPending || revoke.isPending;

  if (!baseDomain) {
    return (
      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe size={16} weight="bold" /> Trang riêng (subdomain)
        </h2>
        <p className="mt-2 text-sm text-muted">Hệ thống chưa cấu hình tên miền chính nên chưa cấp được subdomain.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Globe size={16} weight="bold" /> Trang riêng (subdomain)
      </h2>
      <p className="mt-1 text-xs leading-5 text-muted">
        Tài khoản thuộc giáo phận chỉ đăng nhập được ở trang này. Tài khoản của giáo phận khác sẽ bị từ chối.
      </p>

      <div className="mt-3 text-sm">
        {current && siteUrl ? (
          <span>
            Đang dùng:{" "}
            <a className="font-semibold text-primary underline-offset-2 hover:underline" href={siteUrl} rel="noreferrer" target="_blank">
              {siteUrl.replace("https://", "")}
            </a>
          </span>
        ) : (
          <span className="text-muted">Chưa cấp subdomain</span>
        )}
      </div>

      <form
        className="mt-3 flex flex-wrap items-start gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (validateSubdomain(value) === null && !unchanged) grant.mutate();
        }}
      >
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2">
            <Input
              aria-invalid={Boolean(error)}
              aria-label="Subdomain"
              disabled={busy}
              maxLength={63}
              onBlur={() => setTouched(true)}
              onChange={(event) => setValue(event.target.value)}
              placeholder="vd: phucuong"
              value={value}
            />
            <span className="shrink-0 text-sm text-muted">.{baseDomain}</span>
          </div>
          {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
        </div>
        <Button disabled={busy || unchanged || validateSubdomain(value) !== null} loading={grant.isPending} type="submit">
          {current ? "Đổi subdomain" : "Cấp subdomain"}
        </Button>
        {current ? (
          <Button disabled={busy} onClick={() => setConfirmingRevoke(true)} type="button" variant="outline">
            Thu hồi
          </Button>
        ) : null}
      </form>

      {confirmingRevoke && current ? (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm" role="alertdialog">
          <p className="text-foreground">
            Thu hồi <span className="font-semibold">{current}.{baseDomain}</span>? Trang này sẽ ngừng truy cập được trong vài chục giây, người dùng của giáo phận phải đăng nhập ở tên miền chính.
          </p>
          <div className="mt-2 flex gap-2">
            <Button loading={revoke.isPending} onClick={() => revoke.mutate()} type="button" variant="destructive">
              Xác nhận thu hồi
            </Button>
            <Button disabled={revoke.isPending} onClick={() => setConfirmingRevoke(false)} type="button" variant="ghost">
              Hủy
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
