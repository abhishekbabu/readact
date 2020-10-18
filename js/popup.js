// Parsing page HTML
var documentHTML;

chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action == "getSource") {
        documentHTML = request.source;
        var bodyHtml = /<body.*?>([\s\S]*)<\/body>/.exec(documentHTML)[1];
        var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
        while (SCRIPT_REGEX.test(bodyHtml)) {
            bodyHtml = bodyHtml.replace(SCRIPT_REGEX, " ");
        }
        var STYLE_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
        while (STYLE_REGEX.test(bodyHtml)) {
            bodyHtml = bodyHtml.replace(STYLE_REGEX, " ");
        }
        bodyHTML = bodyHtml.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ' ');
        let plainText = bodyHtml.replace(/<[^>]+>/g, ' ');
        plainText = plainText.replace("&nbsp;", ' ');
        plainText = plainText.replace(/[\u2000-\u206F\u2E00-\u2E7F\\©!"#$%&()*+\-\/:;<=>?@\[\]^_`{|}~]/g, ' ');
        plainText = plainText.replace(/\s+/g, ' ').trim();

        var body;

        if (plainText.length > 5120) {
            var docs = splitIntoDocs(plainText);
            var input = {};
            var documents = [];
            for (var i = 1; i <= Object.keys(docs).length; i++) {
                var document = {};
                document["language"] = "en";
                document["id"] = i.toString();
                document["text"] = docs[i];
                documents.push(document);
            }
            input["documents"] = documents;
            body = JSON.stringify(input);
        } else {
            body = JSON.stringify({
                "documents": [
                    {
                        "language": "en",
                        "id": "1",
                        "text": plainText
                    }
                ]
            })
        }
        bias(plainText);
        textAnalytics(body);
    }
});

function splitIntoDocs(text) {
    var numDocs = text.length / 5120;
    var docs = {};
    for (var i = 1; i <= numDocs; i++) {
        var splitIndex = -1;
        for (var j = (i * 5120) - 1; j >= (i - 1) * 5120; j--) {
            if (text.charAt(j) === ' ') {
                splitIndex = j;
                break;
            }
        }
        if (splitIndex != -1) {
            docs[i] = text.substring((i - 1) * 5120, splitIndex);
        }
    }
    return docs;
}

function textAnalytics(body) {

    $(function() {
        var params = {
            // Request parameters
            "showStats": true,
        };

        $.ajax({
            url: "https://westus2.api.cognitive.microsoft.com/text/analytics/v2.1/entities?" + $.param(params),
            beforeSend: function(xhrObj){
                // Request headers
                xhrObj.setRequestHeader("Content-Type","application/json");
                xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","***REMOVED***");
            },
            type: "POST",
            // Request body
            data: body,
        })
        .done(function(data) {
            parseResults(data);
        })
        .fail(function() {
            alert("error");
        });
    });

}

function bias(article) {
    apikey = "gAAAAABeVpQJKRM5BqPX91XW2AKfz8pJosk182maAweJcm5ORAkkBFj__d2feG4H5KIeOKFyhUVSY_uGImiaSBCwy2L6nWxx4g=="

    const data = new URLSearchParams();
    data.append("API", apikey);
    data.append("Text", article);

    fetch('https://api.thebipartisanpress.com/api/endpoints/beta/robert', {
        method: 'POST',
        body: data
    })
    .then(response => response.text())
    .then((response) => drawLine(response))
    .catch(error => console.error(error));
}

function parseResults(results) {
    var entities = results["documents"][0]["entities"];

    var usefulEntities = [];

    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        if (entity["type"] === "Person") {
            usefulEntities.push(entity);
        }
    }

    console.log(usefulEntities);
    for(var j = 0; j < usefulEntities.length; j++){
        var person = usefulEntities[j];
        var name = person["name"];
        var actualMatches = [];
        for (var k = 0; k < person["matches"].length; k++) {
            actualMatches.push(person["matches"][k]["text"]);
        }
        item(name, actualMatches);
    }
}

function item(candidate, actualMatches){
  var id = "BpMZ1s0iLLUyBnJiqF978sbNUBgUGMna3MNyBOm3qzkInkH2OubPkdUd5f7xip3UscHR54MzqcrB00D9S5RzJbap";

    $(function() {
        $.get("https://api.wevoteusa.org/apis/v1/searchAll", {
            text_from_search_field: candidate,
            voter_device_id: id
        })
        .done(function(data) {
            candidate_search(data, id, actualMatches);
        })
        .fail(function() {
            alert("error");
        });
    });
}

function candidate_search(candidates, voter_id, actualMatches){
    if (candidates["search_results"].length > 0) {
        var i = 0;
        while(i < candidates["search_results"].length && candidates["search_results"][i]["kind_of_owner"] !== "CANDIDATE"){
            i++;
        }
        if (i >= 0 && i < candidates["search_results"].length) {
            candidate_id = candidates["search_results"][i]["we_vote_id"];

            $(function() {
                $.get("https://api.wevoteusa.org/apis/v1/candidateRetrieve", {
                    candidate_we_vote_id: candidate_id,
                    voter_device_id: voter_id
                })
                .done(function(data) {
                    addCandidateToHighlights(actualMatches, data);
                })
                .fail(function() {
                    alert("error");
                });
            });
        }
        
    }
}

var highlights = {};

function addCandidateToHighlights(actualMatches, data) {
    for (var i = 0; i < actualMatches.length; i++) {
        match = actualMatches[i];
        highlights[match] = ["candidate"];
        if (data["candidate_photo_url_large"] != null) {
            highlights[match].push("<img src=\"" + data["candidate_photo_url_large"] + "\" />");
        } else if (data["candidate_photo_url_medium"] != null) {
            highlights[match].push("<img src=\"" + data["candidate_photo_url_medium"] + "\" />");
        } else if (data["candidate_photo_url_tiny"] != null) {
            highlights[match].push("<img src=\"" + data["candidate_photo_url_tiny"] + "\" />");
        } else {
            highlights[match].push("");
        }
        if (data["state_code"] != null) {
            highlights[match].push(data["state_code"]);
        } else {
            highlights[match].push("");
        }
        if (data["contest_office_name"] != null) {
            highlights[match].push(data["contest_office_name"]);
        } else {
            highlights[match].push("");
        }
        highlights[match].push("");
        if (data["party"] != null) {
            highlights[match].push(data["party"]);
        } else {
            highlights[match].push("");
        }
        highlights[match].push(data["candidate_url"])
    }
}

function onWindowLoad() {
    chrome.tabs.executeScript(null, {
        file: "js/getPagesSource.js"
    }, function() {
        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
        if (chrome.runtime.lastError) {
            console.log('There was an error injecting script : \n' + chrome.runtime.lastError.message);
        }
    });

}

window.onload = onWindowLoad;

// Create the bias scale
document.addEventListener('DOMContentLoaded', function() {
    var colorA = "blue", colorB = "red";
    drawScale("seq1", d3.interpolate(colorA, colorB));
})

function drawScale(id, interpolator) {
    var data = Array.from(Array(100).keys());

    var cScale = d3.scaleSequential()
        .interpolator(interpolator)
        .domain([0,99]);

    var xScale = d3.scaleLinear()
        .domain([0,99])
        .range([0, 580]);

    var u = d3.select("#" + id)
        .selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (d) => Math.floor(xScale(d)))
        .attr("y", 0)
        .attr("height", 40)
        .attr("width", (d) => {
            if (d == 99) {
                return 6;
            }
            return Math.floor(xScale(d+1)) - Math.floor(xScale(d)) + 1;
            })
        .attr("fill", (d) => cScale(d));
}

function drawLine(response) {
    var svg = d3.select("#seq1");
    svg.append('line')
    .style("stroke", "white")
    .style("stroke-width", 2)
    .attr("x1", (468.0 * ((parseFloat(response) + 42.0) / 84.0)))
    .attr("y1", 0)
    .attr("x2", (468.0 * ((parseFloat(response) + 42.0) / 84.0)))
    .attr("y2", 200);
}

chrome.tabs.executeScript(null, { file: "js/jquery.js" }, function() {
    chrome.tabs.executeScript(null, { file: "js/popper.min.js" }, function() {
        chrome.tabs.executeScript(null, { file: "js/bootstrap.min.js "});
    });
});

console.log(highlights)
chrome.storage.sync.set({
    "highlightInfo": highlights
}, function () {
    chrome.storage.sync.get("highlightInfo", function(data) {
        console.log(data.highlightInfo)
    });
    chrome.tabs.executeScript({
        file: "js/highlight.js"
    });
});
