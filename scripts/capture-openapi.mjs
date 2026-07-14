import { mkdir, writeFile } from "node:fs/promises";

const origin = process.env.BACKEND_ORIGIN ?? "http://localhost:1007";
const url = new URL("/v3/api-docs", origin);
const response = await fetch(url, { headers: { accept: "application/json" } });

if (!response.ok) {
  throw new Error(`Cannot capture OpenAPI from ${url}: ${response.status} ${response.statusText}`);
}

await mkdir("openapi", { recursive: true });
const body = await response.text();
await writeFile("openapi/ht-management.json", body, "utf8");
console.log(`Captured ${url} -> openapi/ht-management.json`);
