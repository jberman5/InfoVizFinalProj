var data = []; // the variable that holds the data from csv file
var margin = { top: 20, right: 20, bottom: 20, left: 60 },
    width = 900 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
var list = [10, 20, 40, 80, 160];
var thresholds = [500, 1500, 4500, 15000];
var runCount = 0;

$(document).ready(function () {
    loadData();
});


function loadData() {
    d3.csv("data/data.csv", function (d) {
        data = d;
        data.forEach(function (item) {
            item.Year = parseInt(item.Year);
            item.refugeeCount = parseInt(item.Refugees);
            item.Distance = parseInt(item.Distance);
            if (500 >= item.Distance && item.Distance >= 0) {
              item.bin = "B1";
            }else if (1000 >= item.Distance && item.Distance >= 501) {
              item.bin = "B2";
            }else if (1500 >= item.Distance && item.Distance >= 1001) {
              item.bin = "B3";
            }else if (2000 >= item.Distance && item.Distance >= 1501) {
              item.bin = "B4";
            }
            else if (2500 >= item.Distance && item.Distance >= 2001) {
              item.bin = "B5";
            }
            else if ( item.Distance >= 2501) {
              item.bin = "B6";
            }
        });

      getAverageDistances();
    });
}


  function groupDataByYear() {
      var groupedData = d3.nest()
          .key(function(d) {return d.Year})
          .rollup(function (v) {return d3.sum(v, function (d) { return d.refugeeCount; }) })
          .entries(data);
        console.log(groupedData);
        return groupedData;
  }


  function groupDataByOrigin() {
      var groupedData = d3.nest()
          .key(function(d) {return d.Origin})
          .rollup(function (v) {return d3.sum(v, function (d) { return d.refugeeCount; }) })
          .entries(data);
        console.log(groupedData);
        return groupedData;
  }


  function getAverageDistances() {
    // Average distance is equal to sum(item.refugees*item.distance)/(total refugees)
    var groupedData = d3.nest()
        .key(function(d) {return d.bin;})
        .rollup(function (v) {return d3.sum(v, function (d) {return d.refugeeCount})})
      //  .rollup(function (v) {return d3.sum(v, function(d) {var e = (d.refugeeCount*d.Distance); return e;})})
        .entries(data);
      console.log(groupedData);

      //Delete "undefined"
      groupedData.shift();

      //Order bins
      groupedData.sort(function(a, b) {
        var nameA = a.key.toUpperCase(); // ignore upper and lowercase
        var nameB = b.key.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
      console.log(groupedData);
        var x = d3.scaleLinear()
              .domain([groupedData[2].value, groupedData[0].value])
              .range([.3, 1])

      /*  var svg = d3.select("#chart1").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("id", "testing")
            .append("g")
            .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
        var rad = 10; */
    /*    var circle = svg.selectAll("circle").data(groupedData).enter().append("circle")
                          .attr("opacity", function(d) {console.log(x(d.value)); return x(d.value);} )
                          .attr("cx", width/2)
                          .attr("cy", height/2)
                          .attr("r", function(d) { rad = rad + 20; return rad;}); */

            // Draw Arcs
              var PI = Math.PI;
              var arcMin = 0;        // inner radius of the first arc
              var arcWidth = 50;      // width
              var arcPad = 1;         // padding between arcs


              var newSvg = d3.select("#targetChart")
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height);

              var defs = newSvg.append("defs");
              var gradient = defs.append("linearGradient")
                 .attr("id", "svgGradient")
                 .attr("x1", "0%")
                 .attr("x2", "0%")
                 .attr("y1", "100%")
                 .attr("y2", "0%");

              gradient.append("stop")
                 .attr('class', 'start')
                 .attr("offset", "0%")
                 .attr("stop-color", "#FED931")
                 .attr("stop-opacity", .3);

              gradient.append("stop")
                 .attr('class', 'end')
                 .attr("offset", "100%")
                 .attr("stop-color", "#FED931")
                 .attr("stop-opacity", 1);

              var oldSvg = newSvg.append("g")
                  .attr("transform",
                  "translate(" + 0 + "," + 0 + ")");

              var arc = d3.arc()
                  .innerRadius(function(d, i) {return  arcMin + i*(arcWidth) + arcPad;})
                  .outerRadius(function(d, i) {return arcMin + (i+1)*(arcWidth);})
                  .startAngle(.25*Math.PI)
                  .endAngle(.75*Math.PI);

              var myArcs = oldSvg.selectAll("path.arc-path").data(groupedData);

              myArcs.attr("d", arc).attr("class", "path");

          var finalArc  =   myArcs.enter().append('g');

          finalArc.append("svg:path")
                  .attr("class", "arc-path")                  // assigns a class for easier selecting
                  .attr("transform", "translate(200,250)")    // sets position--easier than setting x's and y's
                  .attr("id", function(d) {return d.key;})
                  .attr("d", arc)
                  .attr("opacity", 1)
                  .transition().delay(500).duration(3000)
                  .attr("opacity", function(d) {console.log(x(d.value)); return x(d.value);} );

          oldSvg.append("text").text("500 mi").attr("transform", "translate(" + 120 + "," + 250 + ")");
          oldSvg.append("text").text("2500 mi +").attr("transform", "translate(" + 390 + "," + 10 + ")");

          oldSvg.append('rect')
             .attr('x1', 400)
             .attr('y1', 50)
             .attr('width', 15)
             .attr('height', 200)
             .attr("stroke", "gray")
             .style('fill', "url(#svgGradient)");

          oldSvg.append("text").text("More People").attr("transform", "translate(" + 17 + "," + 12 + ")");
          oldSvg.append("text").text("Less People").attr("transform", "translate(" + 17 + "," + 200 + ")");


  }

  function next() {
    if (runCount == 0) {
      d3.select("#infoText").text("However, as we see refugees tend to seek asylum in far higher numbers in closer countries.");
    } else if (runCount == 1) {
      d3.select("#infoText").text("For example, Pakistan, which borders Afghanistan, is the number one asylum country for Afghan refugees ");
      var lineData = [ { "x": 200,   "y": 250},  { "x": 438,  "y": 83},
                        { "x": 200,   "y": 250},  { "x": 375,  "y": 250},
                        { "x": 200,   "y": 250},  { "x": 230,  "y": 270}];
      var circleData = [ {"x": 438,  "y": 83}, { "x": 375,  "y": 250}, { "x": 230,  "y": 270} ];
      var lineFunction = d3.line()
                            .x(function(d) { return d.x; })
                            .y(function(d) { return d.y; });

      function xCircle(data) {
        return data.x;
      }

      d3.select("svg").select("#myLine").remove();
      var lineArea = d3.select("svg").append("g").attr("id", "myLine");
      var lineGraph = lineArea.append("path")
                              .attr("id", "myLine")
                              .attr("d", lineFunction(lineData))
                              .attr("stroke", "black")
                              .attr("stroke-width", 2)
                              .attr("fill", "none");
                        /*      .style("stroke-linecap", "round").attr("stroke-dasharray", 275 + " " + 275)
                              .attr("stroke-dashoffset", 275)
                              .transition()
                                .duration(1000)
                                .ease(d3.easeLinear)
                                .attr("stroke-dashoffset", 0);*/

    var circle =   lineArea.selectAll("circle")
                          .data(circleData)
                          .enter()
                          .append("circle")

        circle.attr("opacity", 0)
                .attr("r", 5)
                .attr("cx", function(d) {return d.x;} )
                .attr("cy", function(d) {return d.y})
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 2)
                .transition()
                      .delay(1000).attr("opacity", 1);
  //Label 1
      lineArea.append("text").attr("transform", "translate(500,83)")
              .text("Afghanistan to UK")
              .attr("class", "annotation")
              .attr("opacity", 0)
              .transition().duration(1000).ease(d3.easeLinear).attr("opacity", 1);

      lineArea.append("text")
              .text("3,610 mi")
              .attr("class", "annotation")
              .attr("transform", "translate(500,103)")
              .attr("opacity", 0)
              .transition().duration(1000).ease(d3.easeLinear).attr("opacity", 1);
  //Label 2
      lineArea.append("text").attr("transform", "translate(520,250)")
              .text("Afghanistan to Turkey")
              .attr("class", "annotation")
              .attr("opacity", 0)
              .transition().duration(1000).ease(d3.easeLinear).attr("opacity", 1);

      lineArea.append("text")
              .text("1,826 mi")
              .attr("class", "annotation")
              .attr("transform", "translate(520,270)")
              .attr("opacity", 0)
              .transition().duration(1000).ease(d3.easeLinear).attr("opacity", 1);
  //Label 3
      lineArea.append("text").attr("transform", "translate(480,400)")
              .text("Afghanistan to Pakistan")
              .attr("class", "annotation")
              .attr("opacity", 0)
              .transition().duration(1000).ease(d3.easeLinear).attr("opacity", 1);

      lineArea.append("text")
              .text("264 mi")
              .attr("class", "annotation")
              .attr("transform", "translate(480,420)")
              .attr("opacity", 0)
              .transition().duration(1000).ease(d3.easeLinear).attr("opacity", 1);
    } else if (runCount == 2) {
        $(location).attr('href', 'chart.html')
    }

    runCount = runCount+1;

  }
