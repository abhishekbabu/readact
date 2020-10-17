document.addEventListener('DOMContentLoaded', function() {
    var colorA = "blue", colorB = "red";
    drawScale("seq1", d3.interpolate(colorA, colorB));
})

function drawScale(id, interpolator) {
    var data = Array.from(Array(400).keys());

    var cScale = d3.scaleSequential()
        .interpolator(interpolator)
        .domain([0,400]);

    var xScale = d3.scaleLinear()
        .domain([0,400])
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