"use strict";

let elements = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, td, caption, span, div, a, body, ul, strong, em, table, form, i, b"
);

function highlightAll(keywords) { // TODO: UNDO HARDCODING
    keywords.forEach(function(keyword, i) {
        highlight(keyword);
    });
}

function highlight(keyword) {
    elements.forEach(function(element, i) {
        element.childNodes.forEach(function(child, j) {
            if (child.nodeType === 3) {
                if (child.textContent) {
                    console.log("highlight");
                    // let regex = new RegExp(keyword, "i");
                    let text = child.textContent;
                    text = text.replace(
                        keyword,
                        "<span style=\"background-color: dodgerBlue;\" data-toggle=\"popover-click\">" + keyword + "</span>"
                    );
                    const newChild = document.createElement("span");
                    newChild.innerHTML = text;
                    element.replaceChild(newChild, child);
                    console.log(text);
                }
            }
        })
    });
}

highlightAll(['Tana']);

$('[data-toggle="popover-click"]').popover({
    html: true,
    trigger: 'click',
    placement: 'top',
    content: function () { return 'Hello World!'; }
});
