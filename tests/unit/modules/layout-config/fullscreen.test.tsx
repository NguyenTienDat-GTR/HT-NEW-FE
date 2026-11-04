import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FULLSCREEN_CLASS, FullscreenButton, useDesignerFullscreen } from "@/modules/layout-config/wysiwyg/use-fullscreen";

const request = vi.fn(() => Promise.resolve());
const exit = vi.fn(() => Promise.resolve());

beforeEach(() => {
  request.mockClear();
  exit.mockClear();
  Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: request });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  document.body.style.overflow = "";
});
afterEach(cleanup);

describe("designer fullscreen", () => {
  it("toggles on, asks the browser for fullscreen and locks page scrolling", () => {
    const { result } = renderHook(() => useDesignerFullscreen());
    expect(result.current.fullscreen).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.fullscreen).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe("hidden");
    act(() => result.current.toggle());
    expect(result.current.fullscreen).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("leaves the overlay when the browser exits fullscreen (Esc)", () => {
    const { result } = renderHook(() => useDesignerFullscreen());
    act(() => result.current.toggle());
    expect(result.current.fullscreen).toBe(true);
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(result.current.fullscreen).toBe(false);
  });

  it("still works as an overlay when the browser refuses fullscreen", async () => {
    request.mockImplementationOnce(() => Promise.reject(new Error("denied")));
    const { result } = renderHook(() => useDesignerFullscreen());
    await act(async () => result.current.toggle());
    expect(result.current.fullscreen).toBe(true);
  });

  it("labels the button by state and covers the window with the fullscreen class", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<FullscreenButton fullscreen={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Toàn màn hình" }));
    expect(onToggle).toHaveBeenCalled();
    rerender(<FullscreenButton fullscreen onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "Thoát toàn màn hình" })).toHaveAttribute("aria-pressed", "true");
    expect(FULLSCREEN_CLASS).toContain("fixed inset-0");
  });
});
