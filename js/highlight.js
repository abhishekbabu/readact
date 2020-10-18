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
                        let content = getHTMLContent(key, keywords[key]);
                        text = text.replace(
                            key,
                            "<span style=\"background-color: paleGreen;\" data-toggle=\"popover-hover\" data-html=\"true\" title=\"" + key + "\" data-content=\"" + content + "\">" + key + "</span>"
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

function getHTMLContent(key, value) {
    if (value[0] == "candidate") {
        return (
            value[1] + "<div>" + value[2] + " " + value[3] + "</div>" + "<div>Candidate for District " + value[4] + "</div><div>" + value[5] + "</div><div>" + value[6] + "</div>"
        )
    } else if (value[0] == "measure") {
        return (
            value[1]
        )
    } else if (value[0] == "org") {
        return (
            value[1]
        )
    }
}

highlight({
    "Tana": ["candidate", "<img src='https://housedemocrats.wa.gov/tmp/2013/11/tanasenn.jpg' />", "Washington", "Representative", "41", "Democratic Party", "https://www.electtanasenn.org/"],
    "coronavirus": ["measure", "Dealy diseadse"], 
    "public health": ["measure", "Real bad"],
    "Black Lives Matter": ["org", "https://en.wikipedia.org/wiki/Black_Lives_Matter"],
});

$('[data-toggle="popover-hover"]').popover({
    html: true,
    trigger: 'hover',
    placement: 'top',
    content: function () { return ("Hello world!"); }
});
