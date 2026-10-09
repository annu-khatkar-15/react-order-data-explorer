/** Page numbers to show: always first and last, plus a window around the current page. */
export function pageWindow(page: number, pageCount: number, radius = 1): (number | 'gap')[] {
  const pages = new Set([1, pageCount]);
  for (let p = page - radius; p <= page + radius; p++) if (p >= 1 && p <= pageCount) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push(p - prev === 2 ? p - 1 : 'gap');
    out.push(p);
  });
  return out;
}
