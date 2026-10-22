const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export const fmtNumber = (value: number | null | undefined) => (value === null || value === undefined ? "—" : integer.format(value));
export const fmtDecimal = (value: number | null | undefined) => (value === null || value === undefined ? "—" : decimal.format(value));
export const fmtPercent = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `${decimal.format(value)}%`);
