document.addEventListener('DOMContentLoaded', function() {
    // Background canvas for quick drawing of 2k lines
    var canvas = d3.select("body").append("canvas")
    .attr("width", 960)
    .attr("height", 500);
    var ctx = canvas.node().getContext("2d");
    //Translucent svg on top to show the axis
    var svg = d3.select("body").append("svg")
    .attr("width", 960)
    .attr("height", 500)
    .style("position", "fixed")
    .style("top", 0)
    .style("left", 0);

    var x = d3.scaleLinear().domain([-1, 1]).range([20, 500]);
    // Let's add an axis
    svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0, 50)")
    .call(d3.axisTop(x));

    var steps = 5
    //Discrete diverging scale
    var color_threshold = d3.scaleThreshold()
    .domain(d3.range(-1 + 2/steps, 1, 2/steps) ) //[-.6, -.2, .2, .6]
    .range(d3.schemePuOr[steps]); //=> 5 colors in an array

    //Continuous diverging scale
    var color_sequential = d3.scaleSequential(d3.interpolatePuOr)
    .domain([-1, 1]);

    // Let's draw 2000 lines on canvas for speed
    d3.range(-1, 1, 0.001)
    .forEach(function (d) {
    ctx.beginPath();
    ctx.strokeStyle = color_threshold(d);
    ctx.moveTo(x(d), 50);
    ctx.lineTo(x(d), 70);
    ctx.stroke();

    ctx.beginPath();      
    ctx.strokeStyle = color_sequential(d);
    ctx.moveTo(x(d), 80);
    ctx.lineTo(x(d), 100);      
    ctx.stroke();
    });
})