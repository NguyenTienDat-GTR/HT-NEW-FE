"use client";

import {
  AlignBottom,
  AlignCenterVertical,
  AlignTop,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsMerge,
  CaretDown,
  GridFour,
  ImageSquare,
  PaintBucket,
  Rows,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextItalic,
  TextUnderline,
  ArrowElbowDownLeft,
  Database,
  PaintBrush,
  MagnifyingGlass,
  Trash,
} from "@phosphor-icons/react";
import type { Cell } from "exceljs";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TemplateField } from "../api";
import { hintFor, sampleFor } from "../sample-data";
import { PAPERS, type CaseMode, type TokenMod } from "../sheet-model";

type FontStyle = NonNullable<Cell["font"]>;
type BorderMode = "all" | "outer" | "none" | "bottom";

const FONTS = ["Times New Roman", "Arial", "Calibri", "Tahoma", "Cambria", "Verdana", "Georgia", "Courier New"];
const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const DEFAULT_NAME = "Times New Roman";
const DEFAULT_SIZE = 12;

// Bảng màu giống Excel: hàng sắc độ xám + các màu cơ bản + các màu tiêu chuẩn.
const PALETTE: string[][] = [
  ["#FFFFFF", "#000000", "#E7E6E6", "#44546A", "#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"],
  ["#F2F2F2", "#7F7F7F", "#D0CECE", "#D6DCE4", "#D9E2F3", "#FBE5D6", "#EDEDED", "#FFF2CC", "#DEEBF7", "#E2F0D9"],
  ["#D9D9D9", "#595959", "#AEAAAA", "#ADB9CA", "#B4C7E7", "#F7CBAC", "#DBDBDB", "#FFE699", "#BDD7EE", "#C5E0B3"],
  ["#BFBFBF", "#404040", "#757171", "#8497B0", "#8FAADC", "#F4B183", "#C9C9C9", "#FFD966", "#9DC3E6", "#A9D18E"],
  ["#A6A6A6", "#262626", "#3A3838", "#323F4F", "#2F5597", "#C55A11", "#7B7B7B", "#BF9000", "#2E75B5", "#548235"],
];
const STANDARD = ["#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0"];

const argb = (color?: { argb?: string }) => (color?.argb && color.argb.length >= 6 ? `#${color.argb.slice(-6)}` : undefined);
const toArgb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;

// Nút công cụ: giữ focus ở ô đang chọn (onMouseDown preventDefault) giống Excel.
function Tool({ title, active, disabled, onClick, children, className }: { title: string; active?: boolean; disabled?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "grid h-7 min-w-7 place-items-center rounded px-1 text-foreground transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-primary-soft text-primary hover:bg-primary-soft",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center border-r border-border px-2 last:border-r-0">
      <div className="flex flex-1 flex-col justify-center gap-0.5">{children}</div>
      <span className="mt-0.5 text-[11px] text-muted">{label}</span>
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

// Menu thả xuống đơn giản; bấm ra ngoài hoặc chọn xong thì đóng.
function Menu({ trigger, children, title, width = 180, align = "left", hidden = false, label }: { trigger: ReactNode; children: (close: () => void) => ReactNode; title: string; width?: number; align?: "left" | "right"; hidden?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="relative" ref={box}>
      <button
        aria-expanded={open}
        aria-label={title}
        className={cn("flex h-7 items-center gap-0.5 rounded px-1 hover:bg-slate-200", open && "bg-slate-200")}
        onClick={() => setOpen((value) => !value)}
        onMouseDown={(event) => event.preventDefault()}
        title={title}
        type="button"
      >
        {trigger}
        {label ? <span className="text-xs font-semibold">{label}</span> : null}
        <CaretDown size={9} />
      </button>
      {open ? (
        <div className={cn("absolute top-full z-50 mt-1 rounded-lg border border-border bg-white p-2 shadow-xl", align === "right" ? "right-0" : "left-0", hidden && "pointer-events-none opacity-0")} style={{ width }}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function ColorMenu({ title, icon, color, onPick, noneLabel }: { title: string; icon: ReactNode; color?: string; onPick: (hex: string | null) => void; noneLabel: string }) {
  const swatch = (hex: string, close: () => void) => (
    <button
      aria-label={hex}
      className="h-5 w-5 rounded-sm border border-slate-300 hover:scale-110 hover:border-primary"
      key={hex}
      onClick={() => {
        onPick(hex);
        close();
      }}
      onMouseDown={(event) => event.preventDefault()}
      style={{ background: hex }}
      title={hex}
      type="button"
    />
  );
  return (
    <div className="flex items-center">
      <Menu
        title={title}
        trigger={
          <span className="relative grid h-6 w-6 place-items-center">
            {icon}
            <span className="absolute bottom-0 left-0.5 right-0.5 h-[3px] rounded-sm border border-slate-300" style={{ background: color ?? "transparent" }} />
          </span>
        }
        width={236}
      >
        {(close) => (
          <div className="space-y-2">
            <button className="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100" onClick={() => { onPick(null); close(); }} onMouseDown={(event) => event.preventDefault()} type="button">
              {noneLabel}
            </button>
            <div className="grid grid-cols-10 gap-1">{PALETTE.flat().map((hex) => swatch(hex, close))}</div>
            <p className="text-[11px] font-semibold text-muted">Màu tiêu chuẩn</p>
            <div className="grid grid-cols-10 gap-1">{STANDARD.map((hex) => swatch(hex, close))}</div>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-100">
              <input className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" onChange={(event) => onPick(event.target.value)} type="color" value={color ?? "#000000"} />
              Màu khác...
            </label>
          </div>
        )}
      </Menu>
    </div>
  );
}

// Chọn trường dữ liệu: bấm để chèn vào ô đang chọn (hoặc vị trí con trỏ khi đang sửa), hoặc kéo thả vào ô. Có ô tìm kiếm.
function FieldsMenu({ fields, onField }: { fields: TemplateField[]; onField: (key: string, mod?: TokenMod) => void }) {
  const [query, setQuery] = useState("");
  // Kiểu chữ áp cho trường khi chèn: giá trị khi xuất sẽ được đổi hoa / thường theo.
  const [mod, setMod] = useState<TokenMod | "">("");
  const [dragging, setDragging] = useState(false);
  const needle = query.trim().toLowerCase();
  const visible = fields.filter((field) => !needle || field.label.toLowerCase().includes(needle) || field.key.toLowerCase().includes(needle));
  const groups = [...new Set(visible.map((field) => field.group))];
  return (
    <Menu align="right" hidden={dragging} label="Chèn trường" title="Trường dữ liệu: bấm để chèn hoặc kéo thả vào ô" trigger={<Database size={16} />} width={560}>
      {(close) => (
        <div className="space-y-2">
          <label className="flex items-center gap-2 rounded border border-input px-2">
            <MagnifyingGlass className="text-muted" size={14} />
            <input autoFocus className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trường..." value={query} />
          </label>
          <div aria-label="Kiểu chữ khi chèn trường" className="flex flex-wrap items-center gap-1" role="radiogroup">
            <span className="mr-1 text-xs font-semibold text-foreground">Kiểu chữ khi chèn:</span>
            {(
              [
                ["", "Giữ nguyên"],
                ["upper", "IN HOA TOÀN BỘ"],
                ["title", "In Hoa Chữ Cái Đầu"],
                ["lower", "in thường"],
              ] as const
            ).map(([value, text]) => (
              <button
                aria-checked={mod === value}
                className={cn("h-7 rounded-md border px-2 text-xs font-semibold", mod === value ? "border-primary bg-primary-soft text-primary" : "border-border bg-white text-text-secondary hover:border-primary")}
                key={value || "none"}
                onClick={() => setMod(value)}
                onMouseDown={(event) => event.preventDefault()}
                role="radio"
                type="button"
              >
                {text}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-4 text-muted">
            Bấm để chèn vào ô đang chọn, hoặc kéo thả vào ô. Trường nền xanh (STT, Họ và tên...) đặt chung trên <strong>một dòng</strong> của bảng: dòng đó nhân lên theo số người.
          </p>
          <div className="grid max-h-[55vh] grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div className={group === "Bảng dữ liệu" ? "col-span-2" : undefined} key={group}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group}</p>
                <div className="flex flex-wrap gap-1">
                  {visible
                    .filter((field) => field.group === group)
                    .map((field) => (
                      <button
                        className={cn(
                          "cursor-grab rounded-md border px-2 py-1 text-left text-xs hover:border-primary hover:text-primary active:cursor-grabbing",
                          field.kind === "COLUMN" ? "border-primary/40 bg-primary-soft/60" : "border-border bg-surface-1",
                        )}
                        draggable
                        key={field.key}
                        onClick={() => {
                          onField(field.key, mod || undefined);
                          close();
                        }}
                        onDragEnd={() => setDragging(false)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", mod ? `${field.key}|${mod}` : field.key);
                          setTimeout(() => setDragging(true), 0);
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        title={`${field.label}\n{{${field.key}${mod ? `|${mod}` : ""}}}${hintFor(field.key) ? `\n${hintFor(field.key)}` : ""}${sampleFor(field.key, mod || undefined) ? `\nVí dụ: ${sampleFor(field.key, mod || undefined)}` : ""}`}
                        type="button"
                      >
                        {field.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
            {!groups.length ? <p className="col-span-2 py-4 text-center text-sm text-muted">Không có trường phù hợp</p> : null}
          </div>
        </div>
      )}
    </Menu>
  );
}

/**
 * Thanh công cụ "Trang chủ" giống Excel: các nhóm Hoàn tác, Phông chữ, Căn chỉnh, Chèn; mỗi nhóm có nhãn bên dưới.
 */
export function Toolbar({
  font,
  horizontal,
  vertical,
  wrap,
  fillColor,
  isMerged,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFont,
  onToggle,
  onAlign,
  onFill,
  onBorders,
  onMerge,
  onImage,
  onRemoveImage,
  fields,
  onField,
  onCase,
  onShift,
  onLineBreak,
  onPainter,
  painterActive,
  paperId,
  orientation,
  showBreaks,
  onPaper,
  onOrientation,
  onShowBreaks,
}: {
  font: FontStyle;
  horizontal?: string;
  vertical?: string;
  wrap: boolean;
  fillColor?: string;
  isMerged: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFont: (patch: Partial<FontStyle>) => void;
  onToggle: (key: "bold" | "italic" | "underline") => void;
  onAlign: (patch: Partial<NonNullable<Cell["alignment"]>>) => void;
  onFill: (hex: string | null) => void;
  onBorders: (mode: BorderMode) => void;
  onMerge: () => void;
  onImage: () => void;
  onRemoveImage?: () => void;
  fields: TemplateField[];
  onField: (key: string, mod?: TokenMod) => void;
  onCase: (mode: CaseMode) => void;
  onShift: (axis: "row" | "col", mode: "insert" | "delete") => void;
  onPainter: () => void;
  onLineBreak: () => void;
  painterActive: boolean;
  paperId: number;
  orientation: "portrait" | "landscape";
  showBreaks: boolean;
  onPaper: (id: number) => void;
  onOrientation: (value: "portrait" | "landscape") => void;
  onShowBreaks: (value: boolean) => void;
}) {
  const name = font.name ?? DEFAULT_NAME;
  const size = font.size ?? DEFAULT_SIZE;
  const bigger = SIZES.find((value) => value > size) ?? size;
  const smaller = [...SIZES].reverse().find((value) => value < size) ?? size;
  return (
    <div className="flex flex-wrap items-stretch rounded-lg border border-border bg-surface-1 py-1" role="toolbar" aria-label="Thanh công cụ">
      <Group label="Hoàn tác">
        <Row>
          <Tool disabled={!canUndo} onClick={onUndo} title="Hoàn tác (Ctrl+Z)">
            <ArrowCounterClockwise size={17} />
          </Tool>
          <Tool disabled={!canRedo} onClick={onRedo} title="Làm lại (Ctrl+Y)">
            <ArrowClockwise size={17} />
          </Tool>
        </Row>
      </Group>

      <Group label="Định dạng">
        <Row>
          <Tool active={painterActive} className="gap-1 px-1.5 text-xs font-semibold" onClick={onPainter} title="Sao chép định dạng của ô đang chọn rồi chọn vùng cần áp dụng">
            <span className="flex items-center gap-1">
              <PaintBrush size={16} /> Cọ
            </span>
          </Tool>
        </Row>
      </Group>

      <Group label="Phông chữ">
        <Row>
          <select aria-label="Phông chữ" className="h-7 w-36 rounded border border-input bg-white px-1 text-sm" onChange={(event) => onFont({ name: event.target.value })} value={name}>
            {[...new Set([name, ...FONTS])].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select aria-label="Cỡ chữ" className="h-7 w-14 rounded border border-input bg-white px-1 text-sm" onChange={(event) => onFont({ size: Number(event.target.value) })} value={size}>
            {[...new Set([size, ...SIZES])].sort((a, b) => a - b).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Tool onClick={() => onFont({ size: bigger })} title="Tăng cỡ chữ">
            <span className="text-[15px] font-bold leading-none">A<sup className="text-[9px]">▲</sup></span>
          </Tool>
          <Tool onClick={() => onFont({ size: smaller })} title="Giảm cỡ chữ">
            <span className="text-[12px] font-bold leading-none">A<sup className="text-[9px]">▼</sup></span>
          </Tool>
        </Row>
        <Row>
          <Tool active={Boolean(font.bold)} onClick={() => onToggle("bold")} title="In đậm (Ctrl+B)">
            <TextB size={16} weight="bold" />
          </Tool>
          <Tool active={Boolean(font.italic)} onClick={() => onToggle("italic")} title="In nghiêng (Ctrl+I)">
            <TextItalic size={16} />
          </Tool>
          <Tool active={Boolean(font.underline)} onClick={() => onToggle("underline")} title="Gạch chân (Ctrl+U)">
            <TextUnderline size={16} />
          </Tool>
          <Menu title="Đổi chữ hoa / thường (cả trường dữ liệu)" trigger={<span className="text-[13px] font-bold leading-none">Aa</span>} width={230}>
            {(close) => (
              <div className="flex flex-col">
                {(
                  [
                    ["upper", "IN HOA TOÀN BỘ"],
                    ["title", "In Hoa Chữ Cái Đầu"],
                    ["lower", "in thường"],
                    ["none", "Bỏ chuyển đổi của trường"],
                  ] as const
                ).map(([mode, text]) => (
                  <button
                    className="rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                    key={mode}
                    onClick={() => {
                      onCase(mode);
                      close();
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    type="button"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </Menu>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <Menu title="Viền" trigger={<GridFour size={16} />} width={170}>
            {(close) => (
              <div className="flex flex-col">
                {(
                  [
                    ["all", "Tất cả đường viền"],
                    ["outer", "Viền ngoài"],
                    ["bottom", "Viền dưới"],
                    ["none", "Không viền"],
                  ] as const
                ).map(([mode, text]) => (
                  <button
                    className="rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                    key={mode}
                    onClick={() => {
                      onBorders(mode);
                      close();
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    type="button"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </Menu>
          <ColorMenu color={fillColor} icon={<PaintBucket size={16} />} noneLabel="Không tô màu" onPick={onFill} title="Màu tô" />
          <ColorMenu
            color={argb(font.color) ?? "#000000"}
            icon={<span className="text-[15px] font-bold leading-none">A</span>}
            noneLabel="Tự động (đen)"
            onPick={(hex) => onFont({ color: hex ? { argb: toArgb(hex) } : { argb: "FF000000" } })}
            title="Màu chữ"
          />
        </Row>
      </Group>

      <Group label="Căn chỉnh">
        <Row>
          <Tool active={vertical === "top"} onClick={() => onAlign({ vertical: "top" })} title="Căn trên">
            <AlignTop size={16} />
          </Tool>
          <Tool active={vertical === "middle"} onClick={() => onAlign({ vertical: "middle" })} title="Căn giữa theo chiều dọc">
            <AlignCenterVertical size={16} />
          </Tool>
          <Tool active={!vertical || vertical === "bottom"} onClick={() => onAlign({ vertical: "bottom" })} title="Căn dưới">
            <AlignBottom size={16} />
          </Tool>
          <Tool active={wrap} className="gap-1 px-1.5 text-xs font-semibold" onClick={() => onAlign({ wrapText: !wrap })} title="Bọc chữ: tự xuống dòng theo độ rộng ô">
            <span className="flex items-center gap-1">
              <Rows size={16} /> Bọc chữ
            </span>
          </Tool>
          <Tool className="gap-1 px-1.5 text-xs font-semibold" onClick={onLineBreak} title="Ngắt dòng trong cùng một ô (Alt+Enter)">
            <span className="flex items-center gap-1">
              <ArrowElbowDownLeft size={16} /> Ngắt dòng
            </span>
          </Tool>
        </Row>
        <Row>
          <Tool active={!horizontal || horizontal === "left"} onClick={() => onAlign({ horizontal: "left" })} title="Canh trái">
            <TextAlignLeft size={16} />
          </Tool>
          <Tool active={horizontal === "center"} onClick={() => onAlign({ horizontal: "center" })} title="Canh giữa">
            <TextAlignCenter size={16} />
          </Tool>
          <Tool active={horizontal === "right"} onClick={() => onAlign({ horizontal: "right" })} title="Canh phải">
            <TextAlignRight size={16} />
          </Tool>
          <Tool active={isMerged} className="gap-1 px-1.5 text-xs font-semibold" onClick={onMerge} title="Gộp và căn giữa / bỏ gộp ô">
            <span className="flex items-center gap-1">
              <ArrowsMerge size={16} /> Gộp ô
            </span>
          </Tool>
        </Row>
      </Group>

      <Group label="Ô">
        <Row>
          <Menu label="Chèn" title="Chèn dòng / cột" trigger={<span className="text-xs">＋</span>} width={210}>
            {(close) => (
              <div className="flex flex-col">
                {(
                  [
                    ["row", "Chèn dòng phía trên"],
                    ["col", "Chèn cột bên trái"],
                  ] as const
                ).map(([axis, text]) => (
                  <button className="rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100" key={axis} onClick={() => { onShift(axis, "insert"); close(); }} onMouseDown={(event) => event.preventDefault()} type="button">
                    {text}
                  </button>
                ))}
              </div>
            )}
          </Menu>
        </Row>
        <Row>
          <Menu label="Xóa" title="Xóa dòng / cột" trigger={<Trash size={14} />} width={190}>
            {(close) => (
              <div className="flex flex-col">
                {(
                  [
                    ["row", "Xóa dòng đang chọn"],
                    ["col", "Xóa cột đang chọn"],
                  ] as const
                ).map(([axis, text]) => (
                  <button className="rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100" key={axis} onClick={() => { onShift(axis, "delete"); close(); }} onMouseDown={(event) => event.preventDefault()} type="button">
                    {text}
                  </button>
                ))}
              </div>
            )}
          </Menu>
        </Row>
      </Group>

      <Group label="Trang in">
        <Row>
          <select aria-label="Khổ giấy" className="h-7 w-20 rounded border border-input bg-white px-1 text-sm" onChange={(event) => onPaper(Number(event.target.value))} title="Khổ giấy" value={paperId}>
            {PAPERS.map((paper) => (
              <option key={paper.id} value={paper.id}>
                {paper.label}
              </option>
            ))}
          </select>
          <select aria-label="Hướng giấy" className="h-7 w-20 rounded border border-input bg-white px-1 text-sm" onChange={(event) => onOrientation(event.target.value as "portrait" | "landscape")} title="Hướng giấy" value={orientation}>
            <option value="portrait">Dọc</option>
            <option value="landscape">Ngang</option>
          </select>
        </Row>
        <Row>
          <label className="flex cursor-pointer items-center gap-1.5 px-1 text-xs font-semibold text-foreground" title="Hiện đường nét đứt xanh là mép trang in; nội dung nằm ngoài đường này sẽ bị tràn sang trang khác">
            <input checked={showBreaks} className="h-3.5 w-3.5 accent-primary" onChange={(event) => onShowBreaks(event.target.checked)} type="checkbox" />
            Đường ngắt trang
          </label>
        </Row>
      </Group>

      <Group label="Trường dữ liệu">
        <Row>
          <FieldsMenu fields={fields} onField={onField} />
        </Row>
      </Group>

      <Group label="Chèn">
        <Row>
          <Tool className="gap-1 px-1.5 text-xs font-semibold" onClick={onImage} title="Chèn ảnh (logo) tại ô đang chọn">
            <span className="flex items-center gap-1">
              <ImageSquare size={16} /> Chèn ảnh
            </span>
          </Tool>
        </Row>
        <Row>
          <Tool className="gap-1 px-1.5 text-xs text-danger" disabled={!onRemoveImage} onClick={onRemoveImage} title="Xóa ảnh đang chọn">
            <span className="flex items-center gap-1">
              <Trash size={16} /> Xóa ảnh
            </span>
          </Tool>
        </Row>
      </Group>
    </div>
  );
}
