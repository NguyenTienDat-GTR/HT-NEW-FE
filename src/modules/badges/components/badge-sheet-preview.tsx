"use client";

import { useMemo } from "react";
import { gridOfForm, type BadgeForm } from "../badge-design";
import { cardPosition, formatMm, mirrorColumnsFor, paperMm } from "../badge-sheet";

// Hình minh họa khổ giấy với các thẻ xếp sẵn: cho biết một trang in được bao nhiêu thẻ và mặt sau (nếu có) khớp thế nào khi lật tờ.
export function BadgeSheetPreview({ form, flipEdge = "LONG", side = "front" }: { form: BadgeForm; flipEdge?: "LONG" | "SHORT"; side?: "front" | "back" }) {
  const grid = useMemo(() => gridOfForm(form), [form]);
  const [paperW, paperH] = paperMm(form.paperSize, form.paperOrientation);
  const maxWidth = 190;
  const scale = Math.min(maxWidth / paperW, 240 / paperH);

  if (!grid) {
    return (
      <div className="rounded-lg border border-dashed border-danger/40 bg-danger/5 p-3 text-center text-xs text-danger" role="alert">
        Thẻ không xếp vừa khổ giấy
      </div>
    );
  }

  const mirrorColumns = side === "back" && mirrorColumnsFor(paperW, paperH, flipEdge);
  const mirrorRows = side === "back" && !mirrorColumns;
  return (
    <figure className="space-y-1.5">
      <svg
        aria-label={`Khổ ${form.paperSize} xếp ${grid.perPage} thẻ`}
        className="mx-auto rounded border border-border bg-white shadow-sm"
        height={paperH * scale}
        role="img"
        viewBox={`0 0 ${paperW} ${paperH}`}
        width={paperW * scale}
      >
        <rect fill="#fff" height={paperH} width={paperW} />
        {Array.from({ length: grid.perPage }, (_, index) => {
          const [x, y] = cardPosition(grid, index, mirrorColumns, mirrorRows);
          return (
            <g key={index}>
              <rect fill={side === "back" ? "#e2e8f0" : "#dbeafe"} height={grid.cardHeightMm} stroke="#64748b" strokeWidth={0.4} width={grid.cardWidthMm} x={x} y={y} />
              <text fill="#334155" fontSize={Math.min(grid.cardHeightMm / 3, 12)} textAnchor="middle" x={x + grid.cardWidthMm / 2} y={y + grid.cardHeightMm / 2 + 3}>
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-center text-xs text-text-secondary">
        <span className="font-semibold text-foreground">{grid.perPage} thẻ / trang</span> ({grid.columns} cột × {grid.rows} hàng) · giấy {formatMm(paperW)} × {formatMm(paperH)} mm
      </figcaption>
    </figure>
  );
}
