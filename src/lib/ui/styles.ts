// Shared look (red accents on white) so every screen matches and new pages
// pick it up by name. Colours are theme tokens from globals.css.

// short red bar above a page title; combine with the title's own size
export const titleBar =
  "before:mb-3 before:block before:h-1 before:w-10 before:rounded-full before:bg-primary before:content-['']";

// the heading strip at the top of a list card ("Out right now", "Buyers"…)
export const cardTitle =
  "flex items-center justify-between border-b border-brand-100 bg-primary-soft px-5 py-2.5 text-sm font-semibold text-primary-soft-foreground";

// a small count pill inside a card title
export const cardCount =
  "rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-primary-soft-foreground tabular-nums";

// a totals tile (Sales, Kilos, Net…): white with a red top edge
export const statCard =
  "rounded-xl border border-t-3 border-t-primary bg-surface p-4 shadow-card";

// an icon in a soft red circle
export const iconBadge =
  "flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary";

// menu item states: the current page is solid red
export const navActive = "bg-primary text-primary-foreground shadow-primary";
export const navIdle =
  "text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground";

// thin red strip across the top of app screens
export const topStrip = "h-1 shrink-0 bg-primary";
