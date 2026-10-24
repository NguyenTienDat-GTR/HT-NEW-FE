import type { ScanResult } from "./types";

// Luồng quét điểm danh: quét -> tra cứu -> người dùng xác nhận -> điểm danh -> quét tiếp.
export type ScanFlowState =
  | { step: "scanning" }
  | { step: "looking"; token: string }
  | { step: "confirm"; token: string; person: ScanResult }
  | { step: "confirming"; token: string; person: ScanResult }
  | { step: "done"; person: ScanResult }
  | { step: "already"; person: ScanResult }
  | { step: "error"; message: string };

export type ScanFlowEvent =
  | { type: "scanned"; token: string }
  | { type: "looked-up"; person: ScanResult }
  | { type: "confirm" }
  | { type: "confirmed"; person: ScanResult }
  | { type: "failed"; message: string }
  | { type: "skip" }
  | { type: "next" };

export const INITIAL_SCAN_FLOW: ScanFlowState = { step: "scanning" };

export function scanFlowReducer(state: ScanFlowState, event: ScanFlowEvent): ScanFlowState {
  switch (event.type) {
    case "scanned":
      // Chỉ nhận mã mới khi đang chờ quét; các bước khác bỏ qua để camera không ghi đè kết quả đang hiển thị.
      return state.step === "scanning" ? { step: "looking", token: event.token } : state;
    case "looked-up":
      if (state.step !== "looking") return state;
      return event.person.status === "ALREADY_CHECKED_IN" ? { step: "already", person: event.person } : { step: "confirm", token: state.token, person: event.person };
    case "confirm":
      return state.step === "confirm" ? { step: "confirming", token: state.token, person: state.person } : state;
    case "confirmed":
      return state.step === "confirming" ? { step: "done", person: event.person } : state;
    case "failed":
      return state.step === "looking" || state.step === "confirming" || state.step === "scanning" ? { step: "error", message: event.message } : state;
    case "skip":
      return state.step === "confirm" ? INITIAL_SCAN_FLOW : state;
    case "next":
      return state.step === "done" || state.step === "already" || state.step === "error" ? INITIAL_SCAN_FLOW : state;
  }
}

export function isAcceptingScans(state: ScanFlowState) {
  return state.step === "scanning";
}
