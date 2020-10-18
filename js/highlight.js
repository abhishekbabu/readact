"use strict";

let keywords = ["COVID-19", "Joe Biden", "Kamala Harris", "Donald Trump"];

let elements = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, td, caption, span, div, a, body, ul, strong, em, table, form, i, b"
);

function highlightAll() { // TODO: UNDO HARDCODING
    keywords.forEach(function(keyword, i) {
        highlight(keyword);
    });
}

function highlight(keyword) {
    elements.forEach(function(element, i) {
        element.childNodes.forReach(function(child, j) {
            if (child.nodeType === 3) {
                if (child.textContent) {
                    let regex = new RegExp(keyword, "i");
                    let text = child.textContent;
                    text = text.replace(
                        regex,
                        <span class="highlighted" data-toggle="popover-click">${keyword}</span>
                    );
                    const newChild = document.createElement("span");
                    newChild.innerHTML = text;
                    element.replaceChild(newChild, child);
                }
            }
        })
    });
}

$('[data-toggle="popover-click"]').popover({
      html: true,
      trigger: 'click',
      placement: 'top',
      content: function () { return 'Hello World!'; }
});
