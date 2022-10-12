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
                            "<span style=\"background-color: paleGreen;\">" + key + "</span>"
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

chrome.storage.sync.get('highlightInfo', function (items) {
    console.log(items);
    highlight(items.highlightInfo);
    chrome.storage.local.remove('highlightInfo');
});
