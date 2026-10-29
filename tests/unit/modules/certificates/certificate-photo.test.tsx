import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CertificateCanvas, DEFAULT_PHOTO_SIZE, normalizeItem, type LayoutItem } from "@/modules/certificates/components/certificate-design";

afterEach(cleanup);

const base: LayoutItem = { type: "PHOTO", x: 0.2, y: 0.3, fontSize: 0.04, color: "#000", align: "center", fontFamily: "sans", bold: false, italic: false, underline: false };

describe("normalizeItem (PHOTO)", () => {
  it("keeps the type and gives a default size", () => {
    expect(normalizeItem({ ...base })).toMatchObject({ type: "PHOTO", size: DEFAULT_PHOTO_SIZE });
  });

  it("clamps the size to the allowed range", () => {
    expect(normalizeItem({ ...base, size: 5 }).size).toBe(0.9);
    expect(normalizeItem({ ...base, size: 0.001 }).size).toBe(0.05);
  });
});

describe("CertificateCanvas (PHOTO)", () => {
  function renderCanvas(layout: LayoutItem[], preview: boolean) {
    render(
      <CertificateCanvas
        aspect={1.4}
        backgroundImage=""
        editable={false}
        fieldLabel={(key) => key ?? ""}
        layout={layout}
        onMove={() => undefined}
        onSelect={() => undefined}
        preview={preview}
        sampleValue={() => ""}
        selectedIndex={null}
      />,
    );
  }

  it("shows a placeholder in the designer", () => {
    renderCanvas([base], false);
    expect(screen.getByLabelText("Ảnh huynh trưởng (xem trước)")).toBeInTheDocument();
  });

  it("shows the real signed photo when the preview provides one", () => {
    renderCanvas([{ ...base, image: "/api/media/a/medium?exp=1&sig=x" }], true);
    expect(screen.getByAltText("Ảnh huynh trưởng")).toHaveAttribute("src", "/backend/api/media/a/medium?exp=1&sig=x");
  });
});

describe("photoAspect", () => {
  it("resolves 4x6, 3x4 and free ratios", async () => {
    const { photoAspect } = await import("@/modules/certificates/components/certificate-design");
    expect(photoAspect({})).toBeCloseTo(2 / 3);
    expect(photoAspect({ photoRatio: "4x6" })).toBeCloseTo(2 / 3);
    expect(photoAspect({ photoRatio: "3x4" })).toBeCloseTo(0.75);
    expect(photoAspect({ photoRatio: "free", size: 0.4, photoWidth: 0.2 })).toBeCloseTo(0.5);
    expect(photoAspect({ photoRatio: "free", size: 0.4, photoWidth: 50 })).toBe(3);
    // Bản xem trước chứng nhận dùng tỉ lệ do backend tính.
    expect(photoAspect({ photoRatio: "4x6", aspect: 0.75 })).toBeCloseTo(0.75);
  });
});

describe("normalizeItem keeps the photo ratio", () => {
  it("defaults to 4x6 and drops the free width for fixed ratios", () => {
    expect(normalizeItem({ ...base })).toMatchObject({ photoRatio: "4x6", photoWidth: undefined });
    expect(normalizeItem({ ...base, photoRatio: "3x4", photoWidth: 0.3 })).toMatchObject({ photoRatio: "3x4", photoWidth: undefined });
    expect(normalizeItem({ ...base, photoRatio: "free", photoWidth: 0.3 })).toMatchObject({ photoRatio: "free", photoWidth: 0.3 });
  });
});

describe("PhotoInspector", () => {
  it("switches to the free ratio keeping the current width, and edits dimensions", async () => {
    const { PhotoInspector } = await import("@/modules/certificates/components/photo-inspector");
    const { fireEvent } = await import("@testing-library/react");
    const changes: Array<[unknown, string]> = [];
    render(<PhotoInspector disabled={false} item={{ ...base, size: 0.3, photoRatio: "4x6" }} onChange={(patch, key) => changes.push([patch, key])} unit="giấy" />);

    expect(screen.queryByLabelText(/Chiều rộng ảnh/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Khổ ảnh"), { target: { value: "3x4" } });
    expect(changes.at(-1)).toEqual([{ photoRatio: "3x4", photoWidth: undefined }, "photoRatio"]);
    fireEvent.change(screen.getByLabelText("Khổ ảnh"), { target: { value: "free" } });
    expect(changes.at(-1)).toEqual([{ photoRatio: "free", photoWidth: 0.2 }, "photoRatio"]);
    fireEvent.change(screen.getByLabelText("Chiều cao ảnh (% chiều cao giấy)"), { target: { value: "99" } });
    expect(changes.at(-1)).toEqual([{ size: 0.9 }, "photoSize"]);
  });

  it("offers a width field only in free mode", async () => {
    const { PhotoInspector } = await import("@/modules/certificates/components/photo-inspector");
    const { fireEvent } = await import("@testing-library/react");
    const changes: Array<[unknown, string]> = [];
    render(<PhotoInspector disabled={false} item={{ ...base, size: 0.4, photoRatio: "free", photoWidth: 0.2 }} onChange={(patch, key) => changes.push([patch, key])} unit="thẻ" />);
    fireEvent.change(screen.getByLabelText("Chiều rộng ảnh (% chiều cao thẻ)"), { target: { value: "30" } });
    expect(changes.at(-1)).toEqual([{ photoWidth: 0.3 }, "photoWidth"]);
  });
});

describe("CertificateCanvas photo resize handle", () => {
  it("shows the handle only for the selected photo while editing and reports pointer resizes", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const resizes: Array<[number, { size: number; photoWidth?: number }]> = [];
    const { container } = render(
      <CertificateCanvas
        aspect={1.4}
        backgroundImage=""
        editable
        fieldLabel={(key) => key ?? ""}
        layout={[{ ...base, size: 0.3, photoRatio: "free", photoWidth: 0.2 }]}
        onMove={() => undefined}
        onResizePhoto={(index, patch) => resizes.push([index, patch])}
        onSelect={() => undefined}
        preview={false}
        sampleValue={() => ""}
        selectedIndex={0}
      />,
    );
    const handle = screen.getByLabelText("Kéo để đổi kích thước ảnh");
    const canvas = container.firstElementChild as HTMLElement;
    canvas.getBoundingClientRect = () => ({ width: 700, height: 500, top: 0, left: 0, right: 700, bottom: 500, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 200, pointerId: 1 });
    // Khổ tự do đổi cả chiều rộng (+50/500) lẫn chiều cao (+100/500).
    expect(resizes.at(-1)?.[1].size).toBeCloseTo(0.5);
    expect(resizes.at(-1)?.[1].photoWidth).toBeCloseTo(0.3);
    fireEvent.pointerUp(canvas);
    fireEvent.pointerMove(canvas, { clientX: 400, clientY: 400, pointerId: 1 });
    expect(resizes).toHaveLength(1);
  });

  it("has no handle when the photo is not selected or not editable", () => {
    const common = { aspect: 1.4, backgroundImage: "", fieldLabel: (k?: string) => k ?? "", layout: [base], onMove: () => undefined, onSelect: () => undefined, preview: false, sampleValue: () => "", onResizePhoto: () => undefined };
    render(<CertificateCanvas {...common} editable selectedIndex={null} />);
    expect(screen.queryByLabelText("Kéo để đổi kích thước ảnh")).toBeNull();
    cleanup();
    render(<CertificateCanvas {...common} editable={false} selectedIndex={0} />);
    expect(screen.queryByLabelText("Kéo để đổi kích thước ảnh")).toBeNull();
  });
});
