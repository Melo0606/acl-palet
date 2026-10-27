// Primitives de className Tailwind partagees. Les couleurs passent par les
// tokens de app/globals.css pour suivre le theme clair/sombre.

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft";

export const selectClass = inputClass;

export const labelClass = "text-sm font-medium text-text";

export const helpTextClass = "text-xs text-muted";

export const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-50";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-50";

export const buttonSecondarySmallClass =
  "inline-flex items-center justify-center rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-muted hover:text-text";

export const buttonDangerClass =
  "inline-flex items-center justify-center rounded-lg border border-neg/25 px-3 py-1.5 text-xs font-medium text-neg transition-colors hover:bg-neg-soft";

export const buttonDangerSmallClass =
  "inline-flex items-center justify-center rounded-md border border-neg/25 px-2 py-1 text-xs font-medium text-neg transition-colors hover:bg-neg-soft";

export const linkClass = "text-accent underline-offset-2 hover:underline";

export const cardClass = "rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]";

export const cardPadClass = `${cardClass} p-4`;

export const pageHeadingClass = "text-xl font-semibold tracking-tight text-text";

export const sectionHeadingClass = "text-base font-semibold text-text";

export const mutedClass = "text-muted";

export const badgeClass =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";

// ---- Tableaux ----

export const tableWrapClass = `${cardClass} overflow-x-auto`;

export const tableClass = "w-full border-collapse text-sm";

export const theadRowClass =
  "bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted";

export const thClass = "px-3 py-2.5 font-semibold whitespace-nowrap";

export const tdClass = "px-3 py-2 border-t border-border";

export const trHoverClass = "hover:bg-surface-muted/60";
