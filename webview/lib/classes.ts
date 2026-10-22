import { ICONS, icon } from "./icons";

export const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const SCROLL_BODY =
    "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-4 [scrollbar-width:thin] [scrollbar-color:var(--color-line-strong)_transparent]";
export const FIELD = "flex flex-col gap-2";
export const LABEL_ROW =
    "flex items-center justify-between gap-2 text-label text-fg-muted";
export const VALUE = "text-fg-subtle tabular-nums";
export const HINT = "text-body text-fg-subtle data-[tone=bad]:text-danger";
export const RULE = "h-px shrink-0 bg-divider";
export const STATUS =
    "text-body text-fg-subtle empty:-mb-2 data-[tone=bad]:rounded-lg data-[tone=bad]:bg-danger-subtle data-[tone=bad]:px-3 data-[tone=bad]:py-2 data-[tone=bad]:text-fg data-[tone=good]:text-success";

export const PRIMARY = `inline-flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-accent px-3 text-label-md text-on-accent transition-colors hover:bg-accent-hover active:bg-accent-pressed disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-panel`;
export const FOOTER_SECONDARY = `inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-line bg-subtle px-3 text-label-md text-fg-muted transition-colors hover:bg-hover hover:text-fg active:bg-pressed disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-subtle ${FOCUS}`;
export const SECONDARY = `inline-flex h-7.5 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-line bg-subtle px-2.5 text-label text-fg-muted transition-colors hover:bg-hover hover:text-fg active:bg-pressed disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-subtle ${FOCUS}`;
export const ICON_BUTTON = `inline-grid size-7.5 cursor-pointer place-items-center rounded-lg text-fg-muted transition-colors hover:bg-hover hover:text-fg active:bg-pressed ${FOCUS}`;
export const LINK = `shrink-0 cursor-pointer rounded-sm text-label text-fg-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-fg ${FOCUS}`;
export const TAB = `relative cursor-pointer text-label text-fg-subtle transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent-text after:opacity-0 hover:text-fg aria-selected:text-fg aria-selected:after:opacity-100 ${FOCUS}`;

export const SEGMENTED = "flex h-8 gap-0.5 rounded-lg bg-control-subtle p-0.5";
export const SEGMENT = `min-w-0 flex-1 cursor-pointer truncate rounded-md px-2 text-label text-fg-subtle transition-colors hover:text-fg aria-pressed:bg-control aria-pressed:text-fg ${FOCUS}`;
export const CHIP = `h-7 shrink-0 cursor-pointer rounded-full border border-line px-3 text-label text-fg-muted transition-colors hover:bg-hover hover:text-fg aria-pressed:border-transparent aria-pressed:bg-accent-subtle aria-pressed:text-accent-text ${FOCUS}`;

const FIELD_SURFACE =
    "w-full rounded-xl border border-line bg-subtle px-3 text-fg placeholder:text-fg-disabled transition-colors hover:bg-hover focus:border-line-strong focus:bg-active focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-disabled aria-invalid:border-danger";
export const INPUT = `h-9 ${FIELD_SURFACE} text-[13px] leading-5`;
export const CODE_AREA = `min-h-20 resize-none py-2 ${FIELD_SURFACE} font-mono text-[12px] leading-5 whitespace-pre`;
export const SELECT = `h-9 cursor-pointer appearance-none pr-8 ${FIELD_SURFACE} text-[13px] leading-5`;
export const SELECT_COMPACT =
    "h-8 w-full cursor-pointer appearance-none rounded-lg border border-line bg-subtle pr-8 pl-3 text-label text-fg transition-colors hover:bg-hover focus:border-line-strong focus:bg-active focus:outline-none focus:ring-1 focus:ring-ring";
export const SELECT_CHEVRON = icon(
    ICONS.chevronDown,
    "pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-subtle"
);
export const NUMBER =
    "h-8 w-20 shrink-0 rounded-lg border border-line bg-subtle px-2.5 text-label text-fg tabular-nums transition-colors hover:bg-hover focus:border-line-strong focus:bg-active focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-disabled";
export const SLIDER = `h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,var(--color-accent)_var(--fill),var(--color-control)_var(--fill))] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.3)] [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent ${FOCUS}`;
export const SWATCH =
    "size-6 shrink-0 cursor-pointer rounded-full ring-1 ring-black/10 ring-inset aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export const COLOUR_INPUT =
    "size-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 ring-1 ring-line-strong ring-inset [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export const CHECKER =
    "data-checker:bg-[repeating-conic-gradient(var(--color-control-subtle)_0_25%,var(--color-subtle)_0_50%)] data-checker:bg-size-[12px_12px]";
export const CHIP_ROW = "flex flex-wrap gap-1.5";
