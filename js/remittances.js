$(function() {

/////////////////////////////////////////

if (!Modernizr.svg) { return; }

var landColor = d3.rgb("#D7DAE2");

var countryNameKey = (msg.lang() === "en" ? "name" : "name_" + msg.lang());
var visReady = false;

var chart_svg = d3.select("#chart").append("svg");

var background = chart_svg.append("rect")
  .attr("fill", "#FFFFFF");

var migrationsColor =
  d3.scale.log()
    .range(["#A6BDDB", "#045A8D"])
    .interpolate(d3.interpolateHcl);

var projection = d3.geo.robinson()
    .scale(180);

var path = d3.geo.path()
    .projection(projection);

var rscale = d3.scale.sqrt();

function initSizes() {
  width = $(window).width();
  height = $(window).height() - 40;
  background
    .attr("width", width)
    .attr("height", height);
  projection.translate([width/2.3,height/2]);
  chart_svg
    .attr("width", width)
    .attr("height", height);
  rscale.range([0, height/50]);
};

initSizes();

// Timeline
flowChart("data/refugee-top20.csv", "blue");

var timelineMargins = {left: 50, top: 10, bottom: 0, right: 100};
var timelineWidth = width,
    timelineHeight = 200;

var timelineSvg = d3.select("#timeline").append("svg")
    .attr("width", timelineWidth + timelineMargins.left + timelineMargins.right);

var timeline = timelineSvg.append("g")
    .attr("class", "chart")
    .attr("transform","translate("+timelineMargins.left+","+timelineMargins.top+")");

$("#timeline svg").attr("height", (timelineHeight + timelineMargins.top + timelineMargins.bottom));

var arc = d3.geo.greatArc().precision(3)
var migrationsByOriginCode = {};

var isPlural = function(v, exp) {
  var v = Math.abs(Math.round(v/exp));
  return v >= 2;
}

var formatComma = d3.format(",");

function str2num(str) {
  if (str === null || str === undefined || str.length == 0) return NaN;
  return +str;
}

// var migrationYears = [ 1980, 1990, 2000, 2010, 2017 ];
var migrationYears = [
  1976,1977,1978,1979,1980,1981,1982,1983,1984,1985,1986,1987,1988,1989,1990,1991,
  1992,1993,1994,1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,
  2008,2009,2010,2011,2012,2013,2014,2015,2016,2017
];

var remittanceYears = [
  1976,1977,1978,1979,1980,1981,1982,1983,1984,1985,1986,1987,1988,1989,1990,1991,
  1992,1993,1994,1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,
  2008,2009,2010,2011,2012,2013,2014,2015,2016,2017
];

var remittanceYearsDomain = [1976, 2017];

var remittanceTotals, remittanceTotalsByMigrantsOrigin,
    remittanceTotalsPerMigrant, remittanceTotalsPerMigrantByMigrantsOrigin,
    maxRemittanceValue, maxRemittancePerMigrantValue,
    refugeeTotals, refugeeTotalsByOrigin,
    aidTotals, aidTotalsByRecipient;

// Timeline
var yearScale = d3.scale.linear()
  .domain(remittanceYearsDomain);

var tseriesScale = d3.scale.linear()
  .range([timelineHeight, 2]);

var tseriesLine = d3.svg.area()
  .interpolate("monotone")
  .defined(function(d) {
    return !isNaN(d.value)});

var yearAxis = d3.svg.axis()
  .scale(yearScale)
  .orient("top")
  .ticks(timelineWidth / 70)
  .tickSize(10, 5, timelineHeight)
  .tickSubdivide(4)
  .tickPadding(5)
  .tickFormat(function(d) { return d; });

var magnitudeAxis = d3.svg.axis()
  .scale(tseriesScale)
  .orient("right")
  .ticks(timelineHeight / 40)
  .tickSize(5, 0, 0)
  .tickPadding(2)
  .tickFormat(refugeeTotalsByOrigin);

var selectedYear = null;
var selectedCountry = null, highlightedCountry = null;
var perMigrant = false;

var countryFeaturesByCode = {}, countryNamesByCode = {};

// Animation
var yearAnimation = (function() {
  var anim = {};
  var timerId = null;
  var interval = 300;
  var playing = false;
  var yearInterval = null;

  var stop = function() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };
  var start = function() {
    if (timerId === null) {
      timerId = setInterval(next, interval);
    }
  };
  var restart = function() {
    if (playing) start();
  }
  var years = function() {
    if (yearInterval !== null) return yearInterval;
    return remittanceYears;
  }
  var rewind = function() {
    selectYear(years()[0], interval);
    setTimeout(restart, interval * 2);
  };
  var next = function() {
    if (yearInterval !== null  &&  years().indexOf(year) < 0) {
      year = years()[0];
    }
    var year = selectedYear + 1;
    if (year > years()[years().length - 1]) {
      stop();
      setTimeout(rewind, interval * 4);
    } else {
      selectYear(year, interval);
    }
  };
  anim.years = function(years) {
    yearInterval = (years != null ? years.splice(0) : null);
    return anim;
  }
  anim.restart = function() {
    playing = true;
    rewind();
    return anim;
  }
  anim.isPlaying = function() {
    return playing;
  };
  anim.start = function() {
    playing = true;
    start();
    return anim;
  }
  anim.stop = function() {
    playing = false;
    stop();
    return anim;
  }

  anim.interval = function(msec) {
    if (arguments.length === 0) return interval;
    interval = msec;
    return anim;
  }

  return anim;
})();

var mySwiper = new Swiper('#guide',{
  //Your options here:
  mode:'horizontal',
  onSlideChangeEnd : function() {
    if (visReady) slideSelected();
  }
});

function showFlowChart() {
  // $("#chart").stop().fadeOut(250);
  $("#chart").css("display", "none");
  $("#flowChart").fadeIn();
  $("#flowChart").css("display", "inline");
  $("#timeline").css("display", "none");
  $("#color-legend").css("display", "none");
  $("#color-legend").css("visibility", "hidden");
  $("#details").css("display", "none");
  // setPerMigrant(false);
  // yearAnimation.stop();
  // showAid();
};
//
// function showTargetChart() {
//   // $("#chart").stop().fadeOut(250);
//   $("#chart").css("display", "none");
//   $("#flowChart").css("display", "none");
//   $("#timeline").css("display", "none");
//   $("#color-legend").css("display", "none");
//   $("#color-legend").css("visibility", "hidden");
//   $("#details").css("display", "none");
//   // setPerMigrant(false);
//   // yearAnimation.stop();
//   // showAid();
// };

function showMapChart() {
  $("#chart").fadeIn();
  $("#chart").css("display", "inline");
  $("#chart").css("visibility", "visible");
  $("#flowChart").css("display", "none");
  $("#timeline").css("display", "inline");
  $("#color-legend").css("visibility", "visible");
  $("#details").css("display", "inline");
  // setPerMigrant(false);
  // yearAnimation.stop();
  // showAid();
};

function showGuide() {
  $("#guide").fadeIn();
  $("#countrySelect").fadeOut();
  $("#timeline .play-parent").css("visibility", "hidden");
//  $("#per-capita").fadeOut();
  yearAnimation.stop();
  slideSelected();
};

$("#show-intro").click(showGuide);

function hideGuide() {
  $("#guide").fadeOut();
  $("#countrySelect").fadeIn();
  $("#color-legend").fadeIn();
  $("#timeline .play-parent").css("visibility", "visible");
  setPerMigrant(false);
  yearAnimation.stop();
  // showAid();
};

function slideSelected() {
  yearAnimation.stop();
  $("#guide .anim")
    .removeClass("playing")
    .text(msg("intro.animation.play"));

  switch (mySwiper.activeSlide) {
    case 0:
      showFlowChart();
      $("#color-legend").fadeOut();
      $("#chart").css("visibility", "hidden");
      // setPerMigrant(false);
      // selectCountry(null);
      // selectYear(2017);
      // hideAid();
    break;

    case 1:
      showMapChart();
      $("#color-legend").fadeOut();
      setPerMigrant(false);
      selectCountry("SYR");
      selectYear(2015);
      // showAid();
    break;

    case 2:
      showMapChart();
      $("#color-legend").fadeIn();
      setPerMigrant(false);
      selectCountry(null);
      selectYear(2017);
      // showAid();
    break;

    // case 3:
    //   showMapChart();
    //   $("#color-legend").fadeIn();
    //   setPerMigrant(false);
    //   selectCountry(null);
    //   selectYear(2017);
    //   // showAid();
    // break;
  }

};

var next = function() {
  if (visReady) {
    mySwiper.swipeNext();
  }
};
var prev = function() {
  if (visReady) {
    mySwiper.swipePrev();
  }
};

$("#guide .next").click(next);
$("#guide .prev").click(prev);
$("#guide .anim").click(function() {
  if (!visReady) return;
  if ($(this).hasClass("playing")) {
    $("#guide .anim")
      .removeClass("playing")
      .text(msg("intro.animation.play"));
    yearAnimation.stop();
  } else {
    var years = $(this).data("years");
    if (years != null) years = years.split(",").map(str2num);
    $("#guide .anim")
      .addClass("playing")
      .text(msg("intro.animation.stop"));

    if ($(this).data("clicked")) {
      yearAnimation.years(years).start();
    } else {
      yearAnimation.years(years).restart();
      $(this).data("clicked", true);
    }
  }
});

$("#timeline .play").click(function() {
  if ($(this).hasClass("playing")) {
    $("#timeline .play")
      .removeClass("playing")
      .text(msg("intro.animation.play"));
    yearAnimation.stop();
  } else {
    $("#timeline .play")
      .addClass("playing")
      .text(msg("intro.animation.stop"));
    if ($(this).data("clicked")) {
      yearAnimation.start();
    } else {
      yearAnimation.restart();
      $(this).data("clicked", true);
    }
  }
});


$("body").keydown(function(e) {
  if ($("#guide").is(":visible")) {
    if (e.keyCode == 37) prev();
    else if (e.keyCode == 39) next();
  }
});

$("#guide .skip").click(function() {
  if (visReady) hideGuide();
});
$("#guide .last").click(hideGuide);

$(document).keyup(function(e) { if (e.keyCode == 27) hideGuide(); });

///////////////////////////////

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

  // flowChartAnimation();
  //
  // function flowChartAnimation() {
  //   graph
  //     .transition()
  //     .duration(2000)
  //     .attr("g", "translate(0,30)")
  // }

}



function calcTotalsByYear(values) {
  var totals = {}, i, yi, countryData, y, val, max = NaN;

  for (i=0; i<values.length; i++) {
    countryData = values[i];

    for (yi=0; yi<remittanceYears.length; yi++) {
      y = remittanceYears[yi];
      val = str2num(countryData[y]);
      if (!isNaN(val)) {
        if (totals[y] === undefined) totals[y] = 0;
        totals[y] += val;
      }
    }
  }
  return totals;
}

///////////////

function initTimeSeries(name) {
  var tseries = timeline.select("g.tseries");

  if (tseries.empty()) {
    tseries = timeline.append("g")
      .attr("class", "tseries");
  }

  var path = tseries.select("path." + name);
  if (path.empty) {
    tseriesLine
      .x(function(d) { return yearScale(d.year); })
      .y1(function(d) { return tseriesScale(d.value); })
      .y0(tseriesScale(0));

    tseries.append("path")
      .attr("class", name)
      .attr("fill", "#A9AFC0")
      //.attr("stroke-color", "#A9AFC0");
  }

  if (tseries.select("g.legend").empty()) {
    var legend = tseries.append("g")
      .attr("class", "legend")
      .attr("transform",
        "translate(120,10)"
      );

    var gg = legend.append("g")
       .attr("class", "remittances")
       .attr("transform", "translate(0, 10)");

    gg.append("circle")
      .attr("cx", 5)
      .attr("r", 5);
    gg.append("text")
      .attr("x", 15)
      .text(msg("details.tseries.legend.remittances"));

    // gg = legend.append("g")
    //    .attr("class", "aid")
    //    .attr("transform", "translate(0, 30)");
    //
    // gg.append("circle")
    //   .attr("cx", 5)
    //   .attr("r", 5);
    // gg.append("text")
    //   .attr("x", 15)
    //   .text(msg("details.tseries.legend.aid"));
  }
}

function renderTimeSeries(name, data) {
  var tseries = timeline.select("g.tseries");
  var path = tseries.select("path." + name);

  if (data == null) data = {};
  var years = remittanceYears; // d3.keys(data).sort();

  tseries.datum(years.map(function(y) { return { year:y,  value: data[y] }; }), years)
    .select("path." + name)
      .attr("d", function(d) {
        var line = tseriesLine(d);
        if (line == null) line = "M0,0";
        return line;
      });

}


/* @param originCode  If null, total is returned */
function calcPerMigrantValue(value, year, originCode) {
  var m, v = str2num(value);
  if (!isNaN(v)) {
    m = calcTotalMigrants(year, originCode);
    if (!isNaN(m)) {
      return (v / m);
    }
  }
  return NaN;
}

/* @param data        An object year -> value
 *        originCode  If null, total is returned */
function calcPerMigrantValues(data, originCode) {
  var byMigrant = {}, yi, y, m, v;
  for (yi = 0; yi < remittanceYears.length; yi++) {
    y = remittanceYears[yi];
    byMigrant[y] = calcPerMigrantValue(data[y], y, originCode);
  }
  return byMigrant;
}



function updateTimeSeries() {

  var remittances, aid;

  var country = (selectedCountry || highlightedCountry);

  if (perMigrant) {
    aid = [];
    if (country == null) {
      remittances = remittanceTotalsPerMigrant;
    } else {
      remittances = remittanceTotalsPerMigrantByMigrantsOrigin[country];
    }
    d3.select("#timeline g.tseries .legend .remittances text")
      .text(msg("details.tseries.legend.remittances.per-capita"));
  } else {
    if (country == null) {
      remittances = remittanceTotals;
      // aid = aidTotals;
    } else {
      remittances = remittanceTotalsByMigrantsOrigin[country];
      // aid = aidTotalsByRecipient[country];
    }
    d3.select("#timeline g.tseries .legend .remittances text")
      .text(msg("details.tseries.legend.remittances"));
  }

  var rmax = d3.max(d3.values(remittances));
  var dmax = d3.max(d3.values(aid));

  var max;
  if (isNaN(rmax)) max = dmax;
  else if (isNaN(dmax)) max = rmax;
  else max = Math.max(rmax, dmax);

  max *= 1.15;

  tseriesScale.domain([0, max]);
  if (perMigrant) {
    d3.selectAll("#timeline g.tseries .aid")
      .attr("visibility", "hidden");
  } else {
    d3.selectAll("#timeline g.tseries .aid")
      .attr("visibility", "visible");
    renderTimeSeries("aid", aid);
  }
  renderTimeSeries("remittances", remittances);

  timeline.select("g.magnitudeAxis").call(magnitudeAxis);
}

function updateDetails() {
  var details = d3.select("#details");

  details.select(".year")
    .text(msg("details.remittances.year", selectedYear));

  var countryName, totalRemittances, numMigrants;

  if (highlightedCountry != null  ||  selectedCountry != null) {
    var iso3 = (selectedCountry || highlightedCountry);
    countryName = countryNamesByCode[iso3];

    var countryRem = remittanceTotalsByMigrantsOrigin[iso3];
    totalRemittances = (countryRem != null ? str2num(countryRem[selectedYear]) : NaN);

    numMigrants = totalRemittances; // calcTotalMigrants(selectedYear, iso3);

    // var countryAid = aidTotalsByRecipient[iso3];
    // totalAid = (countryAid != null ? str2num(countryAid[selectedYear]) : NaN);

    // details.select(".aid .title").text(msg("details.aid.title.selected-country"));
    details.select(".migrants .value").text(function() { return formatComma(numMigrants); });
    details.select(".migrants .title").text(msg("details.migrants.title.total"));
    details.select(".migrants .title").text(msg("details.migrants.title.selected-country"));
    details.select(".remittances .title").text(msg("details.remittances.title.selected-country"));
  } else {
    // World total
    countryName = msg("details.remittances.total");
    numMigrants = remittanceTotals[selectedYear];
  }
  details.select(".migrants .value").text(function() { return formatComma(numMigrants); });
  details.select(".country").text(countryName);
}


function setPerMigrant(val) {
  perMigrant = val;
  $("#per-capita-chk").prop("checked", val);
  updateBubbleSizes();
  updateTimeSeries();
  updateCircleLegend();
}

function selectYear(year, duration) {

  var r = d3.extent(yearScale.domain());
  if (year < r[0]) year = r[0];
  if (year > r[1]) year = r[1];
  selectedYear = year;

  var t = d3.select("#visualisation")
    .transition()
      .ease("linear")
      .duration(duration);

  t.select("#timeline g.selectorHand")
    .attr("transform", "translate("+(yearScale(year))+",0)");

  updateBubbleSizes(t);
//  if (selectedCountry !== null)
  updateChoropleth();
  updateDetails();
  // barGraph();
}

function updateBubbleSizes(t) {
  if (t == undefined) {
    t = d3.select("#visualisation")
      .transition()
        .duration(300);
  }
  if (perMigrant) {
    rscale.domain([0, maxRemittancePerMigrantValue]);
  } else {
    rscale.domain([0, maxRemittanceValue]);
  }

  t.selectAll("#chart g.countries circle")
//    .attr("opacity", 1)
      .attr("r", function(d) {
        var v = d[selectedYear], r;
        if (perMigrant) {
          v = calcPerMigrantValue(v, selectedYear, d.iso3);
        }
        r = rscale(v);

        return (isNaN(r) ? 0 : r);
      });
}

function selectCountry(code, dontUnselect) {


  if (selectedCountry === code) {
    if (dontUnselect) return;
    selectedCountry = null;
  } else {
    selectedCountry = code;
  }

  $('#countrySelect input.typeahead').val(countryNamesByCode[selectedCountry]);

  updateChoropleth();
  updateDetails();
  updateTimeSeries();
}

$(document).keyup(function(e) { if (e.keyCode == 27) selectCountry(null); });
background.on("click", function() { selectCountry(null); });

function highlightCountry(code) {
  highlightedCountry = code;
  chart_svg.selectAll("path.land")
    .sort(function(a, b) {
       if (a.id === selectedCountry) return 1;
       if (b.id === selectedCountry) return -1;
       if (a.id === code) return 1;
       if (b.id === code) return -1;
      return 0;
    });
  updateChoropleth();
  updateDetails();
  updateTimeSeries();
}

/* t must be in the range [0,1] */
function interpolate(t, a, b) { return a + (b - a) * t; }

function updateChoropleth() {
  var gcountries = chart_svg.select("g.countries");

  if (selectedCountry === null  &&  highlightedCountry == null) {
    d3.select("#description").text("");
    chart_svg.selectAll("path.land")
       .classed("highlighted", false)
       .classed("selected", false)
       .transition()
          .duration(50)
            .attr("fill",landColor)
            .attr("stroke", "none");

    gcountries.selectAll("circle.country")
          .attr("opacity", 1);

  } else {
    var code = ( selectedCountry !== null ? selectedCountry : highlightedCountry);

    var migrantsFromCountry = migrationsByOriginCode[code];
    if (migrantsFromCountry === undefined) {
      console.warn("No refugees for " + code);
      migrantsFromCountry = [];
    }

    var max =
      d3.max(migrantsFromCountry, function(d) {
        return d3.max(migrationYears.map(function(y) { return +d[y]; }));
      });

    migrationsColor.domain([1, max]);

    var migrantsByDest = d3.nest()
      .key(function(d) { return d.dest; })
      .rollup(function(d) { return d[0]; })
      .map(migrantsFromCountry);

    chart_svg.selectAll("path.land")
      .classed("highlighted", function(d) { return d.id === highlightedCountry; })
      .classed("selected", function(d) { return d.id === selectedCountry; })
      .transition()
      .duration(50)
      .attr("fill", function(d) {

        var m = migrantsByDest[d.id];
        if (m !== undefined) {
          var val = interpolateNumOfMigrants(m, selectedYear);
          if (!isNaN(val) && (val > 0 /* for log scale to work*/)) return migrationsColor(val);
        }

        return landColor;   //.darker(0.5);
       })

    gcountries.selectAll("circle.country")
//         .transition()
//          .duration(50)
          .attr("opacity", function(d) {
            if (d.iso3 === selectedCountry  ||
               (selectedCountry == null && d.iso3 == highlightedCountry))
              return 1;
            else
              return 0;
          });

  }

//  updateColorLegend();
}


/* @param values is a map year=>value */
function interpolateNumOfMigrants(values, year) {
  if (values == null) return NaN;
  var val = str2num(values[year]);

  if (isNaN(val)) {
    val = str2num(values[year]);
  }

  return val;
}


function getInterpolatedNumberOfMigrants(from, to, year) {
  var migs, vals;
  migs = migrationsByOriginCode[from];
  if (migs != undefined) {

    vals = migs.filter(function(d) {
      console.log(d.iso3);
      return d.iso3 === to; })[0];
    if (vals != undefined) {
      return vals;
    }
  }
  return NaN;
}



function calcTotalMigrants(year, origin) {

  if (origin != undefined)
    return interpolateNumOfMigrants(refugeeTotalsByOrigin[origin], year);

  return d3.keys(refugeeTotalsByOrigin).reduce(function(sum, origin) {
    var val = interpolateNumOfMigrants(refugeeTotalsByOrigin[origin], year);
    if (!isNaN(val)) {
      if (isNaN(sum)) sum = 0;
      sum += val;
    }
    return sum;
  }, NaN);

}


function nestBy(uniqueProperty, data, rollup) {
  return d3.nest()
      .key(function(d) { return d[uniqueProperty]; })
      .rollup(function(arr) { return arr[0]; })
      .map(data);
}


function initCountriesTypeahead() {

  var countryNames = d3.keys(countryNamesByCode).map(function(iso3) {
    return { iso3:iso3, name:countryNamesByCode[iso3] };
  });
  var typeaheadSelect = function(event, d) {
    selectCountry(d.iso3, true);
  };

  $("#countrySelect .typeahead")
    .attr("placeholder", msg("search.country"))
    .typeahead({
      valueKey: "name",
      name: 'countries',
      local: countryNames,
      limit: 10,
    })
    .on("typeahead:selected", typeaheadSelect)
    .on("typeahead:autocompleted", typeaheadSelect);

}

function initCountryNames(remittances) {
  remittances.forEach(function(r) {
    r.centroid = [+r.lon, +r.lat];
    countryNamesByCode[r.iso3] = r[countryNameKey];
  });
}


function calcRemittanceTotalsPerMigrantByMigrantsOrigin() {
  var result = {}, c, ci, countries = d3.keys(remittanceTotalsByMigrantsOrigin);
  for (ci = 0; ci < countries.length; ci++) {
    c = countries[ci];
    result[c] = calcPerMigrantValues(remittanceTotalsByMigrantsOrigin[c], c);
  }
  return result;
}

function showTooltip(e, html) {
  var tt = $("#tooltip"), x = (e.pageX + 10), y = (e.pageY + 10);
  tt.html(html);
  if (y -10 + tt.height() > $(window).height()) {
    y = $(window).height() - tt.height() - 20;
  }
  if (x -10 + tt.width() > $(window).width()) {
    x = $(window).width() - tt.width() - 20;
  }
  tt.css("left", x + "px")
    .css("top", y + "px")
    .css("display", "block");
}

function hideTooltip() {
  $("#tooltip")
    .text("")
    .css("display", "none");
}



function updateCircleLegend() {

  var container = d3.select("#circle-legend");
  var margin = {left:20, top:20, right:20, bottom:20};
  var maxr = rscale.range()[1];
  var w = 150 - margin.left - margin.right,
      h = 300; // maxr * 2;

  var svg, defs, g = container.select("g.circle-legend"), itemEnter;

  var entries;

  if (perMigrant) {
    entries = [0, 5000/1e6, 20000/1e6, 41000/1e6];
  } else {
    entries = [0, 10000, 30000, 71000];
  }


  if (g.empty()) {
    svg = container.append("svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height", h + margin.top + margin.bottom);

    g = svg.append("g")
        .attr("class", "circle-legend")
        .attr("transform", "translate("+margin.left+","+margin.top+")");
  }


  itemEnter = g.selectAll("g.item")
    .data(entries)
   .enter()
    .append("g")
      .attr("class", "item");

  itemEnter.append("rect")
    .attr("x", maxr)
    .attr("width", 50)
    .attr("height", 1)

  itemEnter.append("circle")
    .attr("cx", maxr)
    .attr("fill", "none");

  itemEnter.append("text")
    .attr("x", maxr + 50 + 5);


  // update
  var items = g.selectAll("g.item")
    .attr("transform", function(d) { return "translate(0,"+(maxr * 2 -  2*rscale(d))+")"; });

  items.select("circle"); // propagate data update from parent
  items.selectAll("circle")
    .attr("cy",  function(d) { return rscale(d); })
    .attr("r", function(d) { return rscale(d); })

  items.select("text");  // propagate data update from parent
  items.selectAll("text")
    .text(function() { return formatComma(d); });
}

function updateColorLegend() {
  var container = d3.select("#color-legend");
  var margin = {left:40, top:30, right:20, bottom:20};
  var w = 150 - margin.left - margin.right,
      h = 60 - margin.top - margin.bottom;

  var rect, gradient;
  var svg, defs, g = container.select("g.color-legend");

  if (g.empty()) {
    svg = container.append("svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height", h + margin.top + margin.bottom);
    gradient = svg.append("defs")
      .append("linearGradient")
        .attr({ id : "migrants-scale-gradient", x1 :"0%", y1 :"0%", x2 : "100%", y2:"0%" });
    gradient.append("stop")
      .attr({ offset:"0%", "stop-color": migrationsColor.range()[0] });
    gradient.append("stop")
      .attr({ offset:"100%", "stop-color": migrationsColor.range()[1] });

    g = svg.append("g")
        .attr("class", "color-legend")
        .attr("transform", "translate("+margin.left+","+margin.top+")");

    rect = g.append("rect")
      .attr({
        "class": "gradient",
        stroke : "#aaa",
        "stroke-width" : "0.3",
        width: w, height: h,
        fill: "url(#migrants-scale-gradient)"
      })

    g.append("text")
      .attr({ "class":"title", x : w/2, y : -7, "text-anchor":"middle" })
      .text(msg("legend.migrants.number"));

    g.append("text")
      .attr({ "class":"axis", x : 0, y : h + 13, "text-anchor":"middle" })
      .text(msg("legend.migrants.low"));

    g.append("text")
      .attr({ "class":"axis", x : w, y : h + 13, "text-anchor":"middle" })
      .text(msg("legend.migrants.high"));
  }

  rect = g.select("rect.gradient");
}

// Loading the csv files

queue()
  .defer(d3.json, "data/world-countries.json")
  .defer(d3.csv, "data/refugee-year.csv")
  .defer(d3.json, "data/oecd-aid.json")
  .defer(d3.csv, "data/refugee-pair-year.csv")
  .defer(d3.csv, "data/refugee-totals.csv")
  .await(function(err, world, remittances, aid, migrations, refugeeTotals) {
    refugeeTotals = refugeeTotals.filter(function(m) {
      return ["FRO", "MNE", "NCL", "PYF", "BMU", "NGA"]
        .indexOf(m.origin) < 0;  // remove outliers, probably wrong data
    })

//   $("#loading").hide();
//    yearAnimation.start();

    remittanceTotalsByMigrantsOrigin = //nestBy("iso3", remittances);
      d3.nest()
      .key(function(d) { return d.iso3; })
      .rollup(function(arr) {
          var d = arr[0], byYear = {};
          remittanceYears.forEach(function(y) {
            var v = str2num(d[y]);
            if (!isNaN(v)) byYear[y] = v;
          });
          return byYear;
       })
      .map(remittances);

    remittanceTotals = calcTotalsByYear(remittances);

    // aidTotalsByRecipient = aid["by-recipient"];
    // aidTotals = aid["TOTAL"];
//    aidTotals2 = calcTotalsByYear(
//      // remove TOTAL
//      d3.keys(aid).filter(function(d) { return  d!== "TOTAL"}).map(function(d) { return aid[d]; })
//    );

    refugeeTotalsByOrigin = nestBy("origin", remittances);

    remittanceTotalsPerMigrant = calcPerMigrantValues(remittanceTotals);
    remittanceTotalsPerMigrantByMigrantsOrigin = calcRemittanceTotalsPerMigrantByMigrantsOrigin();

    var leftMargin = 350; // Math.max(100, width*0.4);
    var fitMapProjection = function() {
      fitProjection(projection, world, [[leftMargin, 60], [width - 20, height-120]], true);
    };
    fitMapProjection();


    initCountryNames(remittances);
    world.features.forEach(function(f) {
      countryFeaturesByCode[f.id] = f;
    });
    initCountriesTypeahead(remittances);

    chart_svg.append("g")
       .attr("class", "map")
      .selectAll("path")
        .data(world.features)
        .enter().append("path")
        .attr("class", "land")
        .attr("fill", landColor)
        .attr("data-code", function(d) { return d.id; })
        .on("click", function(d) { selectCountry(d.id); })
        .on("mouseover", function(d) { highlightCountry(d.id); })
        .on("mouseout", function(d) { highlightCountry(null); });


    var updateMap = function() {
      chart_svg.selectAll("g.map path")
        .attr("d", path);
    };

    updateMap();

    var arcs = chart_svg.append("g").attr("class", "arcs");

    var flows = migrations.forEach(function(flow) {
      if (migrationsByOriginCode[flow.origin] === undefined) {
        migrationsByOriginCode[flow.origin] = [];
      }
      migrationsByOriginCode[flow.origin].push(flow);
    });

    var gcountries = chart_svg.append("g")
       .attr("class", "countries");

    maxRemittanceValue = d3.max(remittances, function(d) {
      return d3.max(remittanceYears.map(function(y) { return +d[y]; } ));
    });

    maxRemittancePerMigrantValue = d3.max(remittances, function(r) {
      return d3.max(remittanceYears.map(function(y) {
        return +remittanceTotalsPerMigrantByMigrantsOrigin[r.iso3][y];
      } ));
    })

    rscale.domain([0, maxRemittanceValue]);



    circles = gcountries.selectAll("circle")
        .data(remittances.filter(function(d) {
          return (d.centroid !== undefined  && d.centroid[0] !== undefined);
        }))
      .enter().append("svg:circle")
        .attr("class", "country")
        .attr("r", "0")
        .attr("opacity", 1.0)
        .on("click", function(d) { selectCountry(d.iso3); })
        .on("mouseover", function(d) { highlightCountry(d.iso3); })
        .on("mouseout", function(d) { highlightCountry(null); })

    var updateBubblePositions = function() {
      gcountries.selectAll("circle")
//        .attr(function(d) {
//          var c = projection(d.centroid);
//          return {
//            cx : c[0], cy : c[1]
//          };
//        });
        .attr("cx", function(d) { if (d.centroid) return projection(d.centroid)[0] })
        .attr("cy", function(d) { if (d.centroid) return projection(d.centroid)[1] });
    }

    updateBubblePositions();

    yearScale.range([0, timelineWidth]);

    selectYear(2010);

    // initTimeSeries("aid");
    initTimeSeries("remittances");


    var timelineAxisGroup = timeline.append("g")
      .attr("class", "timeAxis")
      .attr("transform", "translate(0,"+timelineHeight+")");

    var timelineRightAxisGroup = timeline.append("g")
      .attr("class", "magnitudeAxis")
      .attr("transform", "translate("+(timelineWidth)+",0)");

    timelineAxisGroup.call(yearAxis);
//    timelineRightAxisGroup.call(magnitudeAxis);

    updateTimeSeries();
    updateColorLegend();
    updateCircleLegend();

    var selectorHandHeight = Math.max(timelineHeight - 30, 60);

    var selectorHand = timeline.append("g")
      .attr("class", "selectorHand")
      .attr("transform", "translate("+(yearScale(selectedYear))+",0)");

    selectorHand.append("line")
      .attr("y1", timelineHeight - selectorHandHeight)
      .attr("y2", timelineHeight);


    var haloGradient = timelineSvg.append("defs")
      .append("radialGradient")
        .attr({
          id : "selectorHandHalo",
          cx : "50%", cy : "50%", r : "50%", fx : "50%", fy : "50%"
        });

    haloGradient.append("stop")
      .attr({ offset: "0%", "stop-color": "#fff", "stop-opacity": "0.0" });

    haloGradient.append("stop")
      .attr({ offset: "35%", "stop-color": "#fff", "stop-opacity": "0.05" });

    haloGradient.append("stop")
      .attr({ offset: "80%",  "stop-color": "#fff", "stop-opacity": "0.23" });

    haloGradient.append("stop")
      .attr({ offset: "100%",  "stop-color": "#fff", "stop-opacity": "0.25" });

    selectorHand.append("circle")
      .attr("class", "center")
      .attr("cx", 0)
      .attr("cy", timelineHeight - selectorHandHeight)
      .attr("r", 4);

    selectorHand.append("circle")
      .attr("class", "halo")
      .attr("opacity", "0.4")
      .attr("fill", "url(#selectorHandHalo)")
      .attr("cx", 0)
      .attr("cy", timelineHeight - selectorHandHeight)
      .attr("r", 30);

    var selectorHandDrag = d3.behavior.drag()
        .origin(Object)
        .on("drag", dragSelectorHand);

    d3.select("#timeline .selectorHand")
      .on("mouseover", function(){
         d3.select(this).select("circle.halo")
           .transition()
             .duration(250)
             .attr("opacity", "1.0");
      })
      .on("mouseout", function(){
         d3.select(this).select("circle.halo")
           .transition()
             .duration(250)
             .attr("opacity", "0.5");
      })
      .call(selectorHandDrag);


    d3.select("#timeline g.chart")
      .on("click", function() {
        var c = d3.mouse(this);
        selectYearForPosition(c[0]);
      })

    function dragSelectorHand(d) {
      var c = d3.mouse(this.parentNode);   // get mouse position relative to its container
      selectYearForPosition(c[0]);
    }

    function selectYearForPosition(cx) {
      var year = Math.round(yearScale.invert(cx));
      selectYear(year, true);
    }




    $("#per-capita-chk").click(function(d) {
      setPerMigrant($(this).is(":checked"));
    })

    $("#chart g.map path.land")
           .add("#chart g.countries circle")
           .on("mousemove", function(e) {
             var d = e.target.__data__;
             var iso3 = (d.id  ||  d.iso3);
             var vals, val, text = null;

             if (selectedCountry != null) {
               if (selectedCountry !== iso3) {
                 val = getInterpolatedNumberOfMigrants(selectedCountry, iso3, selectedYear);
                 text = "<b>"+countryNamesByCode[iso3]+"</b>"
                        // + (!isNaN(val) ? ": <br>" +
                        // msg("tooltip.migrants.number.from-a",
                        //   formatComma(val),
                        //   countryNamesByCode[selectedCountry]) :
                        //   ": " + formatComma(val));
               }
             }

             if (text === null) {
               if (highlightedCountry != null) {
                 vals = remittanceTotalsByMigrantsOrigin[highlightedCountry];
                 if (vals != null) {
                   val = vals[selectedYear];
                   text = "<b>"+countryNamesByCode[iso3]+"</b>" +
                     (!isNaN(val) ? ": <br>" +
                       msg("tooltip.remittances.amount", formatComma(val)) :
                       ": " + formatComma(val));
                 }
               }
             }

             if (text !== null) showTooltip(e, text);
           })
           .on("mouseout", hideTooltip)

    $("#sources .info")
         .on("mouseover", function(e) {
           showTooltip(e, msg($(this).data("info")));
         })
         .on("mouseout", hideTooltip);

    $("#details").fadeIn();
    $("#circle-legend").fadeIn();
    $("#show-intro").fadeIn();

    visReady = true;
    slideSelected();

    var onResize = function() {
      initSizes();
      fitMapProjection();
      updateMap();
      updateBubblePositions();
      updateBubbleSizes();
      updateCircleLegend();
    };
    $(window).resize(onResize);
  });
});
