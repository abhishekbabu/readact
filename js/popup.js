$('#btn1').on("click",function() {
    chrome.tabs.create({url:"https://www.vote.org/polling-place-locator/"});
});

$('#btn2').on("click",function() {
    chrome.tabs.create({url:"https://vote.gov/"});
});

var documentHTML;

chrome.runtime.onMessage.addListener(function (request, sender) {
    //Make page text interpretable by Azure
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

        //Split into smaller documents if too long
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
        //Measure political bias and associate candidates/measures
        bias(plainText);
        textAnalytics(body);
    }
});

//Split into smaller documents
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

//Parse for candidates and measures
function textAnalytics(body) {
    $(function () {
        var params = {
            // Request parameters
            "showStats": true,
        };

        $.ajax({
            url: "https://westus2.api.cognitive.microsoft.com/text/analytics/v2.1/entities?" + $.param(params),
            beforeSend: function (xhrObj) {
                // Request headers
                xhrObj.setRequestHeader("Content-Type", "application/json");
                xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", "009a654e207843ea8a219d7f5733a5a1");
            },
            type: "POST",
            // Request body
            data: body,
        })
            .done(function (data) {
                parseResultsCandidate(data);
                parseResultsMeasure(data);
            })
            .fail(function () {
                alert("error");
            });
    });

}

//Measure political bias
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

var candidates = {};

//Parse out candidates from Azure
function parseResultsCandidate(results) {
    var entities = results["documents"][0]["entities"];

    var usefulEntities = [];

    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        if (entity["type"] === "Person") {
            usefulEntities.push(entity);
        }
    }

    for (var j = 0; j < usefulEntities.length; j++) {
        var person = usefulEntities[j];
        var name = person["name"];
        candidates[name] = [];
        for (var k = 0; k < person["matches"].length; k++) {
            candidates[name].push(person["matches"][k]["text"]);
        }
    }
    itemCandidate(candidates);
}

//Parse out measures from Azure
function parseResultsMeasure(results) {
    var entities = results["documents"][0]["entities"];

    var usefulEntities = [];

    for (var i = 0; i < entities.length; i++) {
        var entity = entities[i];
        if (entity["type"] === "Other") {
            usefulEntities.push(entity);
        }
    }

    for (var j = 0; j < usefulEntities.length; j++) {
        var measure = usefulEntities[j];
        var name = measure["name"];
        var actualMatches = [];
        for (var k = 0; k < measure["matches"].length; k++) {
            actualMatches.push(measure["matches"][k]["text"]);
        }
        itemMeasure(name, actualMatches);
    }
}

//Find candidate ballot
function itemCandidate(candidates) {
    var id = "KwR5TWQ95ST7ZPqoaQzanSKj3pT7Eg4cEi3MDYTZSgi1XuJFrMHjxm3JzxPAg1E6G4nbPtwYf36wnbrqetQ47WCi";

    $(function () {
        $.get("https://api.wevoteusa.org/apis/v1/ballotItemHighlightsRetrieve")
            .done(function (data) {
                candidate_search(candidates, data, id);
            })
            .fail(function () {
                alert("error in itemizing candidate");
            });
    });
}

//Find measure ballot
function itemMeasure(measure, actualMatches) {
    var id = "KwR5TWQ95ST7ZPqoaQzanSKj3pT7Eg4cEi3MDYTZSgi1XuJFrMHjxm3JzxPAg1E6G4nbPtwYf36wnbrqetQ47WCi";

    $(function () {
        $.get("https://api.wevoteusa.org/apis/v1/electionsRetrieve", {
            voter_device_id: id
        })
            .done(function (data) {
                get_related_measures(measure, data, id, actualMatches);
            })
            .fail(function () {
                alert("error");
            });
    });
}

var highlights = {};

function candidate_search(candidates, ballot, voter_id) {
    for (i = 0; i < ballot["highlight_list"].length; i++) {
        for (let key in candidates) {
            if (ballot["highlight_list"][i]["name"] == key) {
                    candidate_id = ballot["highlight_list"][i]["we_vote_id"];
                    perCandidate(candidate_id, voter_id, candidates[key]);
            }
        }
    }
}

function perCandidate(candidate_id, voter_id, matches){
    $(function () {
        $.get("https://api.wevoteusa.org/apis/v1/candidateRetrieve", {
            candidate_we_vote_id: candidate_id,
            voter_device_id: voter_id
        })
            .done(function (data) {
                addCandidateToHighlights(matches, data);
                chrome.tabs.executeScript(null, { file: "js/jquery.js" }, function () {
                    chrome.tabs.executeScript(null, { file: "js/bootstrap.bundle.min.js" }, function () {
                        chrome.storage.sync.set({
                            "highlightInfo": highlights
                        }, function () {
                            chrome.tabs.executeScript(null, { file: "js/highlight.js" });
                        })
                    });
                });
            });
    });
}

function get_measures_from_election(search_term, id, state, civic_id, actualMatches) {
    $.get("https://api.wevoteusa.org/apis/v1/ballotItemOptionsRetrieve", {
        voter_device_id: id,
        search_string: search_term,
        state_code: state,
        google_civic_election_id: civic_id
    }).done(function (data) {
        measure_search(data, id, actualMatches)
    })
}

function get_related_measures(measure, elections, id, actualMatches) {
    for (i = 0; i < elections["election_list"].length; i++) {
        get_measures_from_election(measure, id, elections["election_list"][i]["state_code"], elections["election_list"][i]["google_civic_election_id"], actualMatches);
    }
}

function measure_search(measures, voter_id, actualMatches) {
    if (measures["ballot_item_list"].length > 0) {
        var i = 0;
        while (i < measures["ballot_item_list"].length && measures["ballot_item_list"][i]["kind_of_ballot_item"] !== "MEASURE") {
            i++;
        }
        if (i >= 0 && i < measures["ballot_item_list"].length) {
            measure_id = measures["ballot_item_list"][i]["measure_we_vote_id"];
            $(function () {
                $.get("https://api.wevoteusa.org/apis/v1/measureRetrieve", {
                    measure_we_vote_id: measure_id,
                    voter_device_id: voter_id
                })
                    .done(function (data) {
                        addMeasureToHighlights(actualMatches, data);
                        chrome.tabs.executeScript(null, { file: "js/jquery.js" }, function () {
                            chrome.tabs.executeScript(null, { file: "js/bootstrap.bundle.min.js" }, function () {
                                chrome.storage.sync.set({
                                    "highlightInfo": highlights
                                }, function () {
                                    chrome.tabs.executeScript(null, { file: "js/highlight.js" });
                                })
                            });
                        });
                    })
                    .fail(function () {
                        alert("error");
                    });
            });
        }

    }
}

function addCandidateToHighlights(actualMatches, data) {
    for (var i = 0; i < actualMatches.length; i++) {
        match = actualMatches[i];
        containsSubstring = false;
        for (let key in highlights) {
            if (key.includes(match)) {
                containsSubstring = true;
            }
        }
        if (containsSubstring) {
            continue;
        }
        highlights[match] = ["candidate"];
        if (data["candidate_photo_url_large"] != null) {
            highlights[match].push("<img class=\"w-25 mr-3\" src=\'" + data["candidate_photo_url_large"] + "\' />");
        } else if (data["candidate_photo_url_medium"] != null) {
            highlights[match].push("<img class=\"w-25 mr-3\" src=\'" + data["candidate_photo_url_medium"] + "\' />");
        } else if (data["candidate_photo_url_tiny"] != null) {
            highlights[match].push("<img class=\"w-25 mr-3\" src=\'" + data["candidate_photo_url_tiny"] + "\' />");
        } else {
            highlights[match].push("");
        }
        if (data["state_code"] != null) {
            highlights[match].push(data["state_code"].toUpperCase());
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
    displayKeywords(highlights);
}

function addMeasureToHighlights(actualMatches, data) {
    
    for (var i = 0; i < actualMatches.length; i++) {
        match = actualMatches[i];
        highlights[match] = ["measure"];
        if (highlights[match] != null) {
            highlights[match].push(data["ballot_item_display_name"]);
        } else {
            highlights[match].push("");
        }
        if (highlights[match] != null) {
            highlights[match].push(data["measure_text"]);
        } else {
            highlights[match].push("");
        }
        if (highlights[match] != null) {
            highlights[match].push(data["measure_url"]);
        } else {
            highlights[match].push("");
        }
        highlights[match].push(match["text"]);
    }
    displayKeywords(highlights);
}

function onWindowLoad() {
    chrome.tabs.executeScript(null, {
        file: "js/getPagesSource.js"
    }, function () {
        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
        if (chrome.runtime.lastError) {
            console.log('There was an error injecting script : \n' + chrome.runtime.lastError.message);
        }
    });

}

window.onload = onWindowLoad;
// Create the bias scale
document.addEventListener('DOMContentLoaded', function () {
    var colorA = "blue", colorB = "red";
    drawScale("seq1", d3.interpolate(colorA, colorB));
})

function drawScale(id, interpolator) {
    var data = Array.from(Array(100).keys());

    var cScale = d3.scaleSequential()
        .interpolator(interpolator)
        .domain([0, 99]);

    var xScale = d3.scaleLinear()
        .domain([0, 99])
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
            return Math.floor(xScale(d + 1)) - Math.floor(xScale(d)) + 1;
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

function displayKeywords(keywords) {
    let newHTML = "";
    for (let key in keywords) {
        let value = keywords[key];
        if (value[0] == "candidate") {
            newHTML += '<div class="media p-3 term">' +
                value[1] +
                '<div class="media-body">' +
                '<div class="d-flex">' +
                '<p class="mb-0 main-term">' + key + '</p>' +
                '<p class="mb-0 style="font-size: small; font-weight: 300;">&emsp;political candidate</p>' +
                '</div>' +
                '<p class="mb-0">' + value[2] + ' ' + value[3] + '</p>' +
                '<p class="mb-0">' + value[5] + '</p>' +
                '<a href=' + value[6] + ' target="_blank" class="mb-0">' + value[6] + '</a>' +
                '</div>' +
                '</div>';
        } else if (value[0] == "measure") {
            newHTML += '<div class="p-3 term">' +
                '<div class="d-flex">' +
                '<p class="mb-0 main-term">' + value[1] + '</p>' +
                '<p class="mb-0" style="font-size: small; font-weight: 300;">&emsp;political measure</p>' +
                '<p class="mb-0" style="font-size: small; font-weight: 300;">&emsp;"' + key + '"</p>' +
                '</div>' +
                '<p class="mb-0">' + value[2] + '</p>' +
                '</div>';
        }
    }
    document.getElementById("term-candidate").innerHTML = newHTML;
}
