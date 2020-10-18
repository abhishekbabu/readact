"use strict";

let elements = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, td, caption, span, div, a, body, ul, strong, em, table, form, i, b"
  );

function highlightAll(keywords) {
    keywords.forEach(function(keyword, i) {
        highlight(keyword);
    })
}

function highlight(keyword) {

}