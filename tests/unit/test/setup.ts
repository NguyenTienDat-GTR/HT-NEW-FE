import "@testing-library/jest-dom/vitest";

// Node 25 trở lên có sẵn biến toàn cục localStorage / sessionStorage, nhưng không dùng được khi thiếu --localstorage-file
// và lại che mất bản của jsdom. CI chạy Node 22 nên không gặp; máy dev dùng Node mới hơn thì test đụng tới storage sẽ lỗi.
// Khi storage không dùng được thì thay bằng bản lưu trong bộ nhớ.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(String(key)) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(String(key)),
    setItem: (key, value) => void data.set(String(key), String(value)),
  };
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  let usable = false;
  try {
    const probe = "__storage_probe__";
    window[name].setItem(probe, "1");
    window[name].removeItem(probe);
    usable = true;
  } catch {
    usable = false;
  }
  if (!usable) {
    Object.defineProperty(window, name, { configurable: true, value: createMemoryStorage() });
  }
}
