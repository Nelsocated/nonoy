// Every admin list shows 15 rows per page.
export const PAGE_SIZE = 15;

export function pageOf<T>(items: T[], page: number) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return {
    rows: items.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE),
    page: p,
    pages,
  };
}

// 15 rows of h-16 (4rem): a multi-page list keeps that height so the pager
// stays put; a list that fits on one page shrinks to its rows
export const pagedList = (pages: number) =>
  `divide-y divide-border ${pages > 1 ? "min-h-[60rem]" : ""}`;
