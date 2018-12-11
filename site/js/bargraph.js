var data = [{
                "name": "Top 1",
                "value": 15000,
        },
            {
                "name": "Top 2",
                "value": 10203,
        },
            {
                "name": "Top 3",
                "value": 8038,
        },
            {
                "name": "Top 4",
                "value": 5300,
        },
            {
                "name": "Top 5",
                "value": 1600,
        }];

// Bar Graph
var barMargin = { top: 15, right: 25, bottom: 15, left: 50 };
var barWidth = 250 - barMargin.left - barMargin.right,
    barHeight = 150 - barMargin.top - barMargin.bottom;

var barSvg = d3.select("#graphic").append("svg")
    .attr("width", barWidth + barMargin.left + barMargin.right)
    .attr("height", barHeight + barMargin.top + barMargin.bottom)
    .append("g")
    .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")");

// barData = data.sort(function (a, b) {
//     return d3.ascending(a.value, b.value);
// })
console.log(data);

var x = d3.scale.linear()
    .range([0, barWidth])
    .domain([0, d3.max(data, function (d) {
        return d.value;
    })]);

var y = d3.scale.ordinal()
    .rangeRoundBands([barHeight, 0], .1)
    .domain(years.map(function (d) {
        return d.name;
    }));

var yAxis = d3.svg.axis()
    .scale(y)
    .tickSize(0)
    .orient("left");

var gy = barSvg.append("g")
    .attr("class", "y axis")
    .call(yAxis)

var bars = barSvg.selectAll(".bar")
    .data(data)
    .enter()
    .append("g")

bars.append("rect")
    .attr("class", "bar")
    .attr("y", function (d) {
        return y(d.name);
    })
    .attr("height", y.rangeBand())
    .attr("x", 0)
    .attr("width", function (d) {
        return x(d.value);
    });

bars.append("text")
    .attr("class", "label")
    .attr("y", function (d) {
        return y(d.name) + y.rangeBand() / 2 + 4;
    })
    .attr("x", function (d) {
        return x(d.value) + 3;
    })
    .text(function (d) {
        return d.value;
    });
