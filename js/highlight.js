"use strict";

var elements = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, td, caption, span, div, a, body, ul, strong, em, table, form, i, b"
);

function highlightAll(keywords) { // TODO: UNDO HARDCODING
    for (let keyword in keywords) {
        highlight(keyword, keywords[keyword]);
        console.log(keyword);
    }
}

function highlight(keywords) {
    elements.forEach((element) => {
        element.childNodes.forEach((child, index) => {
            if (child.nodeType === 3) {
                if (child.textContent) {
                    let text = child.textContent;
                    for (let key in keywords) {
                        text = text.replace(
                            key,
                            "<span style=\"background-color: dodgerBlue;\" data-toggle=\"popover-click\" title=\"" + key + "\" data-content=\"" + keywords[key] + "\">" + key + "</span>"
                        );
                    }
                    const newChild = document.createElement("span");
                    newChild.innerHTML = text;
                    element.replaceChild(newChild, child);
                }
            }
        });
    });
}

highlight({
    "Tana": "<img src='https://housedemocrats.wa.gov/tmp/2013/11/tanasenn.jpg' />",
    "coronavirus": "Dealy diseadse", 
    "public health": "Real bad",
});

$('[data-toggle="popover-click"]').popover({
    html: true,
    trigger: 'click',
    placement: 'top',
    content: function () { return 'Hello World!'; }
});
