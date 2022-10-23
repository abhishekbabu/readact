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
            var analysisInput = {};
            input["kind"] = "EntityRecognition";
            input["parameters"] = { "modelVersion": "latest" };
            var documents = [];
            for (var i = 1; i <= Object.keys(docs).length; i++) {
                var document = {};
                document["language"] = "en";
                document["id"] = i.toString();
                document["text"] = docs[i];
                documents.push(document);
            }
            analysisInput["documents"] = documents;
            input["analysisInput"] = analysisInput;
            body = JSON.stringify(input);
        } else {
            body = JSON.stringify({
                "kind": "EntityRecognition",
                "parameters": {
                    "modelVersion": "latest"
                },
                "analysisInput": {
                    "documents": [
                        {
                            "language": "en",
                            "id": "1",
                            "text": plainText
                        }
                    ]
                }
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
function textAnalytics(info) {
    fetch('https://readact2022.cognitiveservices.azure.com//language/:analyze-text?api-version=2022-10-01-preview&showStats=true', {
        method: 'POST',
        body: info,
        headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": "009a654e207843ea8a219d7f5733a5a1"
        }
    })
        .then(response => { return response.json() })
        .then(data => {
            parseResultsCandidate(data["results"]);
            parseResultsMeasure(data["results"]);
        })
        .catch(error => console.error(error));
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

var candidates = [];

//Parse out candidates from Azure
function parseResultsCandidate(results) {
    for(var k = 0; k < Object.keys(results["documents"]).length; k++){
        var entities = results["documents"][k]["entities"];

        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            if (entity["category"] === "Person") {
                candidates.push(entity["text"]);
            }
        }
    }
    
    itemCandidate(candidates);
}

//Parse out measures from Azure
function parseResultsMeasure(results) {
    const measure_set = new Set();
    for(var k = 0; k < Object.keys(results["documents"]).length; k++){
        var entities = results["documents"][k]["entities"];
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
            if (entity["category"] === "Skill") {
                if(!measure_set.has(entity["text"])){
                    measure_set.add(entity["text"]);
                    itemMeasure(entity["text"]);
                }
            }
        }
    }
}

//Find candidate ballot
function itemCandidate(candidates) {
    var id = "KwR5TWQ95ST7ZPqoaQzanSKj3pT7Eg4cEi3MDYTZSgi1XuJFrMHjxm3JzxPAg1E6G4nbPtwYf36wnbrqetQ47WCi";

    fetch('https://api.wevoteusa.org/apis/v1/ballotItemHighlightsRetrieve', {
        method: 'GET',
    })
        .then(response => { return response.json() })
        .then(data => {
            candidate_search(candidates, data, id);
        })
        .catch(error => console.error(error));
}

//Find measure ballot
function itemMeasure(measure) {
    var id = "KwR5TWQ95ST7ZPqoaQzanSKj3pT7Eg4cEi3MDYTZSgi1XuJFrMHjxm3JzxPAg1E6G4nbPtwYf36wnbrqetQ47WCi";

    fetch("https://api.wevoteusa.org/apis/v1/electionsRetrieve", {
        method: 'GET',
    })
        .then(response => { return response.json() })
        .then(data => {
            get_related_measures(measure, data, id);
        })
        .catch(error => console.error(error));
}

var highlights = {};

function candidate_search(candidates, ballot, voter_id) {
    for (i = 0; i < ballot["highlight_list"].length; i++) {
        for (j = 0; j < candidates.length; j++) {
            if (ballot["highlight_list"][i]["name"] == candidates[j]) {
                candidate_id = ballot["highlight_list"][i]["we_vote_id"];
                perCandidate(candidate_id, voter_id, candidates[j]);
            }
        }
    }
}

function perCandidate(candidate_id, voter_id, name) {
    fetch("https://api.wevoteusa.org/apis/v1/candidateRetrieve?" + new URLSearchParams({
        candidate_we_vote_id: candidate_id,
        voter_device_id: voter_id
    }), {
        method: 'GET',
    })
        .then(response => { return response.json() })
        .then(data => {
            addCandidateToHighlights(name, data);

            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ["js/bootstrap.bundle.min.js"],
                },
                    () => {
                        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
                        if (chrome.runtime.lastError) {
                            console.log('There was an error injecting script : \n' + chrome.runtime.lastError.message);
                        }
                        
                        chrome.storage.sync.set({
                            "highlightInfo": highlights
                        }, function () {
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                files: ["js/highlight.js"],
                            })
                        })
                        
                    });
            });
        })
        .catch(error => console.error(error));
}

function get_measures_from_election(search_term, id, state, civic_id) {
    fetch("https://api.wevoteusa.org/apis/v1/ballotItemOptionsRetrieve?" + new URLSearchParams({
        voter_device_id: id,
        search_string: search_term,
        state_code: state,
        google_civic_election_id: civic_id
    }), {
        method: 'GET'
    })
        .then(response => { return response.json() })
        .then(data => {
            measure_search(data, id, search_term);
        })
        .catch(error => console.error(error));
}

function get_related_measures(measure, elections, id) {
    for (i = 0; i < elections["election_list"].length; i++) {
        get_measures_from_election(measure, id, elections["election_list"][i]["state_code"], elections["election_list"][i]["google_civic_election_id"]);
    }
}

function measure_search(measures, voter_id, search_term) {
    if (measures["ballot_item_list"].length > 0) {
        var i = 0;
        while (i < measures["ballot_item_list"].length && measures["ballot_item_list"][i]["kind_of_ballot_item"] !== "MEASURE") {
            i++;
        }
        if (i >= 0 && i < measures["ballot_item_list"].length) {
            measure_id = measures["ballot_item_list"][i]["measure_we_vote_id"];

            fetch("https://api.wevoteusa.org/apis/v1/measureRetrieve?" + new URLSearchParams({
                measure_we_vote_id: measure_id,
                voter_device_id: voter_id
            }), {
                method: 'GET'
            })
                .then(response => { return response.json() })
                .then(data => {
                    addMeasureToHighlights(data, search_term);
                    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            files: ["js/bootstrap.bundle.min.js"],
                        },
                            () => {
                                // If you try and inject into an extensions page or the webstore/NTP you'll get an error
                                if (chrome.runtime.lastError) {
                                    console.log('There was an error injecting script : \n' + chrome.runtime.lastError.message);
                                }
                                
                                chrome.storage.sync.set({
                                    "highlightInfo": highlights
                                }, function () {
                                    chrome.scripting.executeScript({
                                        target: { tabId: tabs[0].id },
                                        files: ["js/highlight.js"],
                                    })
                                })
                                
                            });
                    });
                })
                .catch(error => console.error(error));
        }

    }
}

function addCandidateToHighlights(name, data) {
    highlights[name] = ["candidate"];
    if (data["candidate_photo_url_large"] != null) {
        highlights[name].push("<img class=\"w-25 mr-3\" src=\'" + data["candidate_photo_url_large"] + "\' />");
    } else if (data["candidate_photo_url_medium"] != null) {
        highlights[name].push("<img class=\"w-25 mr-3\" src=\'" + data["candidate_photo_url_medium"] + "\' />");
    } else if (data["candidate_photo_url_tiny"] != null) {
        highlights[name].push("<img class=\"w-25 mr-3\" src=\'" + data["candidate_photo_url_tiny"] + "\' />");
    } else {
        highlights[name].push("");
    }
    if (data["state_code"] != null) {
        highlights[name].push(data["state_code"].toUpperCase());
    } else {
        highlights[name].push("");
    }
    if (data["contest_office_name"] != null) {
        highlights[name].push(data["contest_office_name"]);
    } else {
        highlights[name].push("");
    }
    highlights[name].push("");
    if (data["party"] != null) {
        highlights[name].push(data["party"]);
    } else {
        highlights[name].push("");
    }
    highlights[name].push(data["candidate_url"]);
    displayKeywords(highlights);
}

function addMeasureToHighlights(data, search_term) {
    highlights[search_term] = ["measure"];
    if (highlights[search_term] != null) {
        highlights[search_term].push(data["ballot_item_display_name"]);
    } else {
        highlights[search_term].push("");
    }
    if (highlights[search_term] != null) {
        highlights[search_term].push(data["measure_text"]);
    } else {
        highlights[search_term].push("");
    }
    if (highlights[search_term] != null) {
        highlights[search_term].push(data["measure_url"]);
    } else {
        highlights[search_term].push("");
    }
    displayKeywords(highlights);
}

function onWindowLoad() {
    //potentially use chrome.scripting in ManifestV3
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['js/getPagesSource.js'],
        },
            () => {
                // If you try and inject into an extensions page or the webstore/NTP you'll get an error
                if (chrome.runtime.lastError) {
                    console.log('There was an error injecting script : \n' + chrome.runtime.lastError.message);
                }
            });
    });
}

window.onload = onWindowLoad;
// Create the bias scale
document.addEventListener('DOMContentLoaded', function () {
    var colorA = "blue", colorB = "red";
    drawScale("seq1", d3.interpolate(colorA, colorB));

    document.getElementById('btn1').addEventListener("click",function() {
        chrome.tabs.create({url:"https://www.vote.org/polling-place-locator/"});
   });
   
   document.getElementById('btn2').addEventListener("click",function() {
        chrome.tabs.create({url:"https://vote.gov/"});
   });
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
