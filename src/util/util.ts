import { Notice } from "obsidian";
import { Admonition } from "../@types";
import type { SelectionRange, EditorState } from "@codemirror/state";
import {
    editorLivePreviewField,
    editorViewField,
    requireApiVersion
} from "obsidian";

function startsWithAny(str: string, needles: string[]) {
    for (let i = 0; i < needles.length; i++) {
        if (str.startsWith(needles[i])) {
            return i;
        }
    }

    return false;
}

export function getParametersFromSource(
    type: string,
    src: string,
    admonition: Admonition
) {
    const admonitionTitle =
        admonition.title ?? type[0].toUpperCase() + type.slice(1).toLowerCase();
    const keywordTokens = ["title:", "collapse:", "icon:", "color:"];

    const keywords = ["title", "collapse", "icon", "color"];

    let lines = src.split("\n");

    let skipLines = 0;

    let params: { [k: string]: string } = {};

    for (let i = 0; i < lines.length; i++) {
        let keywordIndex = startsWithAny(lines[i], keywordTokens);

        if (keywordIndex === false) {
            break;
        }

        let foundKeyword = keywords[keywordIndex];

        if (params[foundKeyword] !== undefined) {
            break;
        }

        params[foundKeyword] = lines[i]
            .slice(keywordTokens[keywordIndex].length)
            .trim();
        ++skipLines;
    }

    let { title, collapse, icon, color } = params;

    let content = lines.slice(skipLines).join("\n");

    /**
     * If the admonition should collapse, but something other than open or closed was provided, set to closed.
     */
    if (
        collapse !== undefined &&
        collapse !== "none" &&
        collapse !== "open" &&
        collapse !== "closed"
    ) {
        collapse = "closed";
    }

    if (!("title" in params)) {
        if (!admonition.noTitle) {
            title = admonitionTitle;
        }
    }
    /**
     * If the admonition should collapse, but title was blanked, set the default title.
     */
    if (
        title &&
        title.trim() === "" &&
        collapse !== undefined &&
        collapse !== "none"
    ) {
        title = admonitionTitle;
        new Notice("An admonition must have a title if it is collapsible.");
    }

    return { title, collapse, content, icon, color };
}

export const rangesInclude = (
    ranges: readonly SelectionRange[],
    from: number,
    to: number
) => {
    for (const range of ranges) {
        const { from: rFrom, to: rTo } = range;
        if (rFrom >= from && rFrom <= to) return true;
        if (rTo >= from && rTo <= to) return true;
        if (rFrom < from && rTo > to) return true;
    }
    return false;
};

export const isLivePreview = (state: EditorState) => {
    if (requireApiVersion && requireApiVersion("0.13.23")) {
        return state.field(editorLivePreviewField);
    } else {
        const md = state.field(editorViewField);
        const { state: viewState } = md.leaf.getViewState() ?? {};

        return (
            viewState && viewState.mode == "source" && viewState.source == false
        );
    }
};
