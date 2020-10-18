"use strict";

var elements = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, td, caption, span, div, a, body, ul, strong, em, table, form, i, b"
);

function highlight(keywords) {
    elements.forEach((element) => {
        element.childNodes.forEach((child, index) => {
            if (child.nodeType === 3) {
                if (child.textContent) {
                    let text = child.textContent;
                    for (let key in keywords) {
                        text = text.replace(
                            key,
                            "<span style=\"background-color: paleGreen;\" data-toggle=\"popover-hover\" title=\"" + key + "\" data-content=\"" + keywords[key] + "\">" + key + "</span>"
                        );
                        // "<span style=\"background-color: dodgerBlue;\" data-toggle=\"popover-hover\" title=\"" + key + "\" data-content=\"" + keywords[key] + "\">" + key + "</span>"
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

$('[data-toggle="popover-hover"]').popover({
    html: true,
    trigger: 'hover',
    placement: 'top',
    content: function () { return ("Hello world!"); }
});
