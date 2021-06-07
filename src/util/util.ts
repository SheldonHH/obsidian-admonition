import { MarkdownRenderer, Notice } from "obsidian";
import { getIconNode } from "./icons";
import { AdmonitionIconDefinition, INestedAdmonition } from "../@types";

export function getMatches(
    src: string,
    from: number,
    toMatch: string
): INestedAdmonition {
    const split = src.split("\n").slice(from);
    const first = split.indexOf(split.find((l) => l == toMatch));

    let next = first + 1;
    for (; next < split.length; next++) {
        if (!/^(?: {2,4}|\t)+[\s\S]*?/.test(split[next])) break;
    }

    let innerSrc = split.slice(first + 1, next).join("\n");

    const toRemove = innerSrc.split("\n")[0].match(/^(\s+)/);
    innerSrc = innerSrc.replace(new RegExp(`^${toRemove[0] || ""}`, "gm"), "");

    return {
        start: first + from,
        end: next + from - 1,
        src: innerSrc,
        type: toMatch.split("-").pop()
    };
}

function startsWithAny(str: string, needles: string[]) {
    for (let i = 0; i < needles.length; i++) {
        if (str.startsWith(needles[i])) {
            return i;
        }
    }

    return false;
}

export function getParametersFromSource(type: string, src: string) {
    const keywordTokens = ["title:", "collapse:"];

    const keywords = ["title", "collapse"];

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
            .substr(keywordTokens[keywordIndex].length)
            .trim();
        ++skipLines;
    }

    let {
        title = type[0].toUpperCase() + type.slice(1).toLowerCase(),
        collapse /* = "none" */
    } = params;

    let content = lines.slice(skipLines).join("\n");

    /**
     * If the admonition should collapse, but something other than open or closed was provided, set to closed.
     */
    if (
        collapse &&
        collapse.length &&
        collapse !== "none" &&
        collapse !== "open" &&
        collapse !== "closed"
    ) {
        collapse = "closed";
    }

    /**
     * If the admonition should collapse, but title was blanked, set the default title.
     */
    if (
        title.trim() === "" &&
        collapse &&
        collapse.length &&
        collapse !== "none"
    ) {
        title = type[0].toUpperCase() + type.slice(1).toLowerCase();
        new Notice("An admonition must have a title if it is collapsible.");
    }

    return { title, collapse, content };
}

export /* async */ function getAdmonitionElement(
    type: string,
    title: string,
    icon: AdmonitionIconDefinition,
    color: string,
    collapse?: string
): HTMLElement {
    let admonition,
        titleEl,
        attrs: { style: string; open?: string } = {
            style: `--admonition-color: ${color};`
        };
    if (collapse) {
        if (collapse === "open") {
            attrs.open = "open";
        }
        admonition = createEl("details", {
            cls: `admonition admonition-${type}`,
            attr: attrs
        });
        titleEl = admonition.createEl("summary", {
            cls: `admonition-title ${!title.trim().length ? "no-title" : ""}`
        });
    } else {
        admonition = createDiv({
            cls: `admonition admonition-${type}`,
            attr: attrs
        });
        titleEl = admonition.createDiv({
            cls: `admonition-title ${!title.trim().length ? "no-title" : ""}`
        });
    }

    if (title && title.length) {
        /**
         * Title structure
         * <div|summary>.admonition-title
         *      <element>.admonition-title-content - Rendered Markdown top-level element (e.g. H1/2/3 etc, p)
         *          div.admonition-title-icon
         *              svg
         *          div.admonition-title-markdown - Container of rendered markdown
         *              ...rendered markdown children...
         */

        //get markdown
        const markdownHolder = createDiv();
        MarkdownRenderer.renderMarkdown(title, markdownHolder, "", null);

        //admonition-title-content is first child of rendered markdown
        const admonitionTitleContent = markdownHolder.children[0];

        //get children of markdown element, then remove them
        const markdownElements = Array.from(
            admonitionTitleContent?.childNodes || []
        );
        admonitionTitleContent.innerHTML = "";
        admonitionTitleContent.addClass("admonition-title-content");

        //build icon element
        const iconEl = admonitionTitleContent.createDiv(
            "admonition-title-icon"
        );
        if (icon && icon.name && icon.type) {
            iconEl.appendChild(getIconNode(icon));
        }

        //add markdown children back
        const admonitionTitleMarkdown = admonitionTitleContent.createDiv(
            "admonition-title-markdown"
        );
        for (let i = 0; i < markdownElements.length; i++) {
            admonitionTitleMarkdown.appendChild(markdownElements[i]);
        }
        titleEl.appendChild(admonitionTitleContent || createDiv());
    }

    //add them to title element

    if (collapse) {
        titleEl.createDiv("collapser").createDiv("handle");
    }
    return admonition;
}
