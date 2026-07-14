import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const viNumber = new Intl.NumberFormat("vi-VN");
export const viPercent = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
  style: "percent",
});
