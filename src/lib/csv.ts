// CSV 导出工具(带 BOM,Excel 直接打开不乱码)

export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
