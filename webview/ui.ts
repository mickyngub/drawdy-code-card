import {
    CHIP,
    FIELD,
    INPUT,
    LABEL_ROW,
    NUMBER,
    RULE,
    SEGMENT,
    SEGMENTED,
    SELECT,
    SELECT_CHEVRON,
    SLIDER,
    SWATCH,
    VALUE,
} from "./lib/classes";

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    parent?: HTMLElement
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
}

export function button(
    parent: HTMLElement,
    className: string,
    text: string,
    onClick: () => void,
    label?: string
): HTMLButtonElement {
    const node = el("button", className, parent);
    node.type = "button";
    node.textContent = text;
    if (label) {
        node.setAttribute("aria-label", label);
        node.title = label;
    }
    node.addEventListener("click", onClick);
    return node;
}

function field(parent: HTMLElement, label: string, forId?: string) {
    const wrap = el("div", FIELD, parent);
    const head = el("div", LABEL_ROW, wrap);
    const text = el(forId ? "label" : "span", undefined, head);
    text.textContent = label;
    if (forId) (text as HTMLLabelElement).htmlFor = forId;
    return { wrap, head };
}

let uid = 0;
const nextId = (stem: string) => `${stem}-${++uid}`;

export type Control<T> = { set(value: T): void };

function setFill(input: HTMLInputElement): void {
    const min = Number(input.min);
    const max = Number(input.max);
    const fill = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--fill", `${fill}%`);
}

export type SliderSpec = {
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
};

export function makeSlider(
    parent: HTMLElement,
    spec: SliderSpec,
    initial: number,
    onInput: (value: number) => void
): Control<number> {
    const { wrap, head } = field(parent, spec.label);
    const value = el("span", VALUE, head);
    const input = el("input", SLIDER, wrap);
    input.type = "range";
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.setAttribute("aria-label", spec.label);
    const show = (v: number) => {
        value.textContent = `${v} ${spec.unit}`;
        setFill(input);
    };
    input.value = String(initial);
    show(initial);
    input.addEventListener("input", () => {
        const v = Number(input.value);
        show(v);
        onInput(v);
    });
    return {
        set(v) {
            input.value = String(v);
            show(v);
        },
    };
}

export function makeSegmented<T extends string | number>(
    row: HTMLElement,
    options: [T, string][],
    initial: T,
    onPick: (value: T) => void
): Control<T> {
    const buttons = options.map(([value, caption]) => {
        const node = button(row, SEGMENT, caption, () => {
            paint(value);
            onPick(value);
        });
        return { value, node };
    });
    const paint = (current: T) => {
        for (const entry of buttons) {
            entry.node.setAttribute(
                "aria-pressed",
                String(entry.value === current)
            );
        }
    };
    paint(initial);
    return { set: paint };
}

export function makeSegmentedField<T extends string | number>(
    parent: HTMLElement,
    label: string,
    options: [T, string][],
    initial: T,
    onPick: (value: T) => void
): Control<T> & { wrap: HTMLElement; row: HTMLElement } {
    const { wrap } = field(parent, label);
    const row = el("div", SEGMENTED, wrap);
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", label);
    const control = makeSegmented(row, options, initial, onPick);
    return { ...control, wrap, row };
}

export function makeToggle(
    parent: HTMLElement,
    caption: string,
    initial: boolean,
    onChange: (value: boolean) => void
): Control<boolean> {
    let value = initial;
    const node = button(parent, CHIP, caption, () => {
        paint(!value);
        onChange(value);
    });
    const paint = (next: boolean) => {
        value = next;
        node.setAttribute("aria-pressed", String(next));
    };
    paint(initial);
    return { set: paint };
}

export function makeSelect(
    parent: HTMLElement,
    label: string,
    options: [string, string][],
    initial: string,
    onPick: (value: string) => void
): Control<string> {
    const id = nextId("select");
    const { wrap } = field(parent, label, id);
    const box = el("div", "relative", wrap);
    const select = el("select", SELECT, box);
    box.insertAdjacentHTML("beforeend", SELECT_CHEVRON);
    select.id = id;
    for (const [value, caption] of options) {
        const option = el("option", undefined, select);
        option.value = value;
        option.textContent = caption;
    }
    select.value = initial;
    select.addEventListener("change", () => onPick(select.value));
    return {
        set(value) {
            select.value = value;
        },
    };
}

export function makeTextInput(
    parent: HTMLElement,
    label: string,
    placeholder: string,
    maxLength: number,
    onInput: (value: string) => void
): Control<string> & { input: HTMLInputElement; wrap: HTMLElement } {
    const id = nextId("text");
    const { wrap } = field(parent, label, id);
    const input = el("input", INPUT, wrap);
    input.id = id;
    input.type = "text";
    input.placeholder = placeholder;
    input.maxLength = maxLength;
    input.spellcheck = false;
    input.addEventListener("input", () => onInput(input.value));
    return {
        input,
        wrap,
        set(value) {
            input.value = value;
        },
    };
}

export function makeNumberInput(
    parent: HTMLElement,
    label: string,
    range: { min: number; max: number },
    initial: number,
    onChange: (value: number) => void
): Control<number> & { input: HTMLInputElement } {
    const wrap = el("label", LABEL_ROW, parent);
    wrap.textContent = label;
    const input = el("input", NUMBER, wrap);
    input.type = "number";
    input.min = String(range.min);
    input.max = String(range.max);
    input.step = "1";
    input.value = String(initial);
    const read = () => {
        const raw = Math.round(Number(input.value));
        const value = Number.isFinite(raw)
            ? Math.min(range.max, Math.max(range.min, raw))
            : range.min;
        return value;
    };
    input.addEventListener("input", () => {
        if (input.value.trim() !== "") onChange(read());
    });
    input.addEventListener("change", () => {
        const value = read();
        input.value = String(value);
        onChange(value);
    });
    return {
        input,
        set(value) {
            input.value = String(value);
        },
    };
}

export type Swatch = {
    value: string;
    label: string;
    css: string;
    className?: string;
};

export function makeSwatchRow(
    parent: HTMLElement,
    label: string,
    swatches: Swatch[],
    initial: string,
    onPick: (value: string) => void
): Control<string> & {
    row: HTMLElement;
    nodes: Map<string, HTMLButtonElement>;
} {
    const { wrap } = field(parent, label);
    const row = el("div", "flex flex-wrap items-center gap-2", wrap);
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", label);
    const buttons = swatches.map((swatch) => {
        const node = button(
            row,
            `${SWATCH}${swatch.className ? ` ${swatch.className}` : ""}`,
            "",
            () => {
                paint(swatch.value);
                onPick(swatch.value);
            },
            swatch.label
        );
        if (swatch.css) node.style.background = swatch.css;
        return { value: swatch.value, node };
    });
    const paint = (current: string) => {
        for (const entry of buttons) {
            entry.node.setAttribute(
                "aria-pressed",
                String(entry.value === current)
            );
        }
    };
    paint(initial);
    return {
        set: paint,
        row,
        nodes: new Map(buttons.map((entry) => [entry.value, entry.node])),
    };
}

export function makeRule(parent: HTMLElement): void {
    el("div", RULE, parent);
}
