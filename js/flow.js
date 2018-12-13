$(document).ready(function () {
    flowChart("data/refugee-top20.csv", "blue");
});

var datearray = [];
var colorrange = [];

function flowChart(csvpath, color) {
  if (color == "blue") {
    colorrange = ["#045A8D", "#2B8CBE", "#74A9CF", "#A6BDDB", "#D0D1E6", "#F1EEF6"];
  }

  strokecolor = colorrange[0];

  var format = d3.time.format("%Y");

  var margin = {top: 200, right: 0, bottom: 200, left: 0};
  var width = $(window).width() - margin.left - margin.right;
  var height = $(window).height() - margin.top - margin.bottom;

  var tooltip = d3.select("body")
      .append("div")
      .attr("class", "remove")
      .style("position", "fixed")
      .style("z-index", "20")
      .style("visibility", "hidden")
      .style("top", "30px")
      .style("left", "55px");

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height - 10, 0]);

  var z = d3.scale.ordinal()
      .range(colorrange);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")

  var yAxis = d3.svg.axis()
      .scale(y);

  var yAxisr = d3.svg.axis()
      .scale(y);

  var stack = d3.layout.stack()
      .offset("silhouette")
      .values(function(d) { return d.values; })
      .x(function(d) { return d.year; })
      .y(function(d) { return d.refugees; });

  var nest = d3.nest()
      .key(function(d) { return d.origin; });

  var area = d3.svg.area()
      .interpolate("cardinal")
      .x(function(d) { return x(d.year); })
      .y0(function(d) { return y(d.y0); })
      .y1(function(d) { return y(d.y0 + d.y); });

  var svg = d3.select("#flowChart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var graph = d3.csv(csvpath, function(data) {
    data.forEach(function(d) {
      d.year = format.parse(d.year); // format.parse(d.year);
      d.refugees = +d.refugees;
      console.log(d.year);
    });

    var layers = stack(nest.entries(data));

    x.domain(d3.extent(data, function(d) { return d.year; }));
    y.domain([0, d3.max(data, function(d) { return d.y0 + d.y; })]);

    svg.selectAll(".layer")
        .data(layers)
      .enter().append("path")
        .attr("class", "layer")
        .attr("d", function(d) { return area(d.values); })
        .style("fill", function(d, i) { return z(i); });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

  });

}
