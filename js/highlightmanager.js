// Credits to Jerome Parent-Levesque (https://github.com/jeromepl/highlighter)
"use strict";

var alternativeUrlIndexOffset = 0; // Number of elements stored in the alternativeUrl Key. Used to map highlight indices to correct key

function loadAll(url) { // alternativeUrl is optional
    // TODO: Use the API to create a list of things that need to be highlighted
    let highlights = []; // TODO: here

    for (let i = 0; highlights && i < highlights.length; i++) {
        load(highlights[i], i);
    }
}

function load(highlightVal, highlightIndex, noErrorTracking) { // noErrorTracking is optional
    const selection = {
        anchorNode: elementFromQuery(highlightVal.anchorNode),
        anchorOffset: highlightVal.anchorOffset,
        focusNode: elementFromQuery(highlightVal.focusNode),
        focusOffset: highlightVal.focusOffset
    };

    const selectionString = highlightVal.string;
    const container = elementFromQuery(highlightVal.container);
    const color = highlightVal.color;

    if (!selection.anchorNode || !selection.focusNode || !container) {
        if (!noErrorTracking) {
            addHighlightError(highlightVal, highlightIndex);
        }
        return false;
    } else {
        const success = highlight(selectionString, container, selection, color, highlightIndex);
        if (!noErrorTracking && !success) {
            addHighlightError(highlightVal, highlightIndex);
        }
        return success;
    }
}

function elementFromQuery(storedQuery) {
    const re = />textNode:nth-of-type\(([0-9]+)\)$/i;
    const result = re.exec(storedQuery);

    if (result) { // For text nodes, nth-of-type needs to be handled differently (not a valid CSS selector)
        const textNodeIndex = parseInt(result[1]);
        storedQuery = storedQuery.replace(re, "");
        const parent = $(storedQuery)[0];
        if (!parent)
            return undefined;
        return parent.childNodes[textNodeIndex];
    } else {
        return $(storedQuery)[0];
    }
}

// From an DOM element, get a query to that DOM element
function getQuery(element) {
    if (element.id)
        return '#' + escapeCSSString(element.id);
    if (element.localName === 'html')
        return 'html';

    const parent = element.parentNode;

    let index;
    const parentSelector = getQuery(parent);
    // The element is a text node
    if (!element.localName) {
        // Find the index of the text node:
        index = Array.prototype.indexOf.call(parent.childNodes, element);

        return parentSelector + '>textNode:nth-of-type(' + index + ')';
    } else {
        const jEl = $(element);
        index = jEl.index(parentSelector + '>' + element.localName) + 1;
        return parentSelector + '>' + element.localName + ':nth-of-type(' + index + ')';
    }
}

// Colons and spaces are accepted in IDs in HTML but not in CSS syntax
// Similar (but much more simplified) to the CSS.escape() working draft
function escapeCSSString(cssString) {
    return cssString.replace(/(:)/g, "\\$1");
}