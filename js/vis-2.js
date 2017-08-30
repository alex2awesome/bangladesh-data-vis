var scrollVis = function () {
  // tranisition variables
  // 
  // functions that activate when the person gets to a spot.
  var activateFunctions = [];
  // functions that update while the user scrolls.
  var updateFunctions = [];
  // Keep track of which visualization we are on.
  var lastIndex = -1;
  var activeIndex = 0;

  // 
  // map variables
  // 
  var svg;
  var width = 960,
      height = 600;

  // satellite projection? 
  var projection = d3.geo.mercator()
      .scale(1)
      .translate([0, 0]);

  var path = d3.geo.path()
      .projection(projection);

  svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  var subunits, places;
  var city_mapping    = {}
  var country_mapping = {}

  var last_seen_progress = 0

  var map = function () {
    // Draw the basic map
    setUpMap();
    // set up the transitions 
    setUpSections();

  }

  /////////
  /// Inital setup function to draw South Asia 
  ///
  var setUpMap = function (selection) {

    queue()
      .defer(d3.json, '../map-files/bangla-region.topo.json')
      .defer(d3.json, '../map-files/bangla-places.topo.json')
      .defer(d3.json, '../map-files/shamshuddins_path/shamshuddins_path.topo.json')
      .await(makeMyMap);

    function makeMyMap(error, countries, cities, shamshuddins_path) {
      subunits = topojson.feature(countries, countries.objects.bangla_region);

      subunits.features.map(function(d) { 
        country_mapping[d.properties.name] = d
      })

      // Compute the bounds of a feature of interest, then derive scale & translate.
      var b = path.bounds(country_mapping['Bangladesh']),
          s = 3 / Math.max(
            (b[1][0] - b[0][0]) / width, 
            (b[1][1] - b[0][1]) / height
          ),
          t = [
            - 100 + (width  - s * (b[1][0] + b[0][0])) / 2, 
            -150 + (height - s * (b[1][1] + b[0][1])) / 2
          ];

      // Update the projection to use computed scale & translate.
      projection
          .scale(s)
          .translate(t);

      places = topojson.feature(cities, cities.objects.bangla_places);

      // draw land masses
      svg.selectAll(".subunit")
          .data(subunits.features)
        .enter().append("path")
          .attr("class", function(d) { 
            return "subunit " + d.id; 
          })
          .attr("d", path)
          ;

      // draw boundaries
        svg.append("path")
            .datum(topojson.mesh(
              countries, 
              countries.objects.bangla_region, 
              function(a, b) {return a !== b }
              )
            )
            .attr("d", path)
            .attr("class", "subunit-boundary");

      // label land
        svg.selectAll(".subunit-label")
            .data(subunits.features)
          .enter().append("text")
            .attr("class", function(d) { return "subunit-label " + d.id; })
            .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
            .attr("dy", ".35em")
            .text(function(d) { return d.properties.name; });

      // draw cities
        // svg.selectAll('.city-circles')
        //   .data(places.features)
        //   .enter().append('circle')
        // .attr("cx", function(d) {
        //   return projection(d.geometry.coordinates)[0];
        // })
        // .attr("cy", function(d) {
        //   return projection(d.geometry.coordinates)[1];
        // })
        // .attr("r", function(d) {
        //   return d3.max([0, 3 - d.properties.rank]);
        // })
        // .attr("class", "place-dot")

      // label cities
        svg.selectAll(".place-label")
            .data(places.features)
          .enter().append("text")
            .attr("class", "place-label")
            .attr("transform", function(d) { 
              return "translate(" + projection(d.geometry.coordinates) + ")"; 
            })
            .attr("x", function(d) { 
              return d.geometry.coordinates[0] > -1 ? 6 : -6; 
            })
            .attr("dy", ".35em")
            .style("text-anchor", function(d) { 
              return d.geometry.coordinates[0] > -1 ? "start" : "end"; 
            })
            .text(function(d) { 
              return (3 - d.properties.rank) > 0 ? d.properties.name : ''; });

      // set up shamshuddin's path.
      full_path = topojson.feature(
          shamshuddins_path, 
          shamshuddins_path.objects.shamshuddins_path_2
      );

      path_points = full_path.features.filter(function(d){
        return d.geometry.type =="Point";
      })
      path_arcs = full_path.features.filter(function(d){
        return d.geometry.type =="LineString";
      })

      // draw cities
      svg.selectAll('.sham-circle')
        .data(path_points)
        .enter().append('circle')
      .attr("cx", function(d) {
        return projection(d.geometry.coordinates)[0];
      })
      .attr("cy", function(d) {
        return projection(d.geometry.coordinates)[1];
      })
      .attr("r", 1)
      .attr("class", "shamshuddins-path")

      svg.selectAll(".sham-label")
      .data(path_points)
        .enter().append("text")
          .attr("class", function(d, i) {return "sham-label-" + i})
          .attr("transform", function(d) { 
            return "translate(" + projection(d.geometry.coordinates) + ")"; 
          })
          .attr("x", function(d, i) { 
            return [1, 3].indexOf(i) == -1 ? 6 : -6; 
          })
          .attr("y", function(d, i){
            return [0].indexOf(i) != -1 ? 5 : 0 
          })
          .attr("dy", ".5em")
          .style("text-anchor", function(d, i) {
              return [1, 3].indexOf(i) == -1 ? "start" : "end"; 
          })
          .text(function(d, i) {  
            if (i == 0) { return 'Elisha Village' }
            else if (i == 1) { return 'Donia'}
            else if (i == 4) { return 'Bhola Bosti' }
            else { return d.id }
          })
          .attr('opacity', 0);

      svg.selectAll(".sham-path-progress")
        .data(path_arcs)
        .enter()
        .append("path")
        .attr('d', path)
        .attr('class', 'sham-path-progress') //function(d, i) {return 'sham-path-' + i})
        .style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '.5px')
        .attr('opacity', 0)

      svg.selectAll(".sham-path-overlay")
        .data(path_arcs)
        .enter()
        .append("path")
        .attr('d', path)
        .attr('class', 'sham-path-overlay') //function(d, i) {return 'sham-path-' + i})
        .style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '.5px')
        .attr('opacity', 1)
    }
  }

  function reShade(item_recolor_mapping, duration){
    if (duration === undefined) {
        duration = 750;
    }

    for (var svg_item in item_recolor_mapping){
      svg.selectAll('.' + svg_item)
          .transition(svg_item).duration(750)
          .attr('opacity', item_recolor_mapping[svg_item])
    }
  }

  // --- Helper functions (for tweening the path)
  function tweenDash(node, t) {
      var len = node[0][0].getTotalLength(),
          interpolate = d3.interpolateString("0," + len, len + "," + len);
      return interpolate(t); 
  };


  var step_1 = function(){
    // selection = svg.select('.sham-path-progress')
    // selection.style('stroke-dasharray', tweenDash(selection, 1))
      reShade({
        "sham-path-overlay": 1,
        "sham-path-progress": 0
      }, 50)

      reShade({
        "sham-label-0":0,
        "sham-label-1":0,
        "sham-label-2":0,
        "sham-label-3":0,
        "sham-label-4":0
      })
  }

  var step_2_activate = function(){
      reShade({
        "sham-path-overlay": 0,
        "sham-path-progress": 1
      }, 50)

      reShade({
        "sham-label-0":1,
        "sham-label-4":0
      })
  }

  var step_3 = function(){
    // selection = svg.select('.sham-path-progress')
    // selection.style('stroke-dasharray', tweenDash(selection, 1))
      reShade({
        "sham-path-overlay": 1,
        "sham-path-progress": 0
      }, 50)

      reShade({
        "sham-label-0":1,
        "sham-label-1":1,
        "sham-label-2":1,
        "sham-label-3":1,
        "sham-label-4":1
      })
  }

  var step_2_progress = function(progress) {
    "draw progress."

    selection = svg.select('.sham-path-progress')
    selection.style('stroke-dasharray', tweenDash(selection, progress))

    direction = progress - last_seen_progress
    ///
    ///
    /// forward direction
    if(last_seen_progress == 0 & 0 < progress & direction > 0){
      reShade({
        "sham-label-0": 1
      })
    }
    // second destination city 0.01785
    if(last_seen_progress < 0.01785 & 0.01785 < progress & direction > 0){
      reShade({
        "sham-label-1": 1
      })
    }
    // third destination city 0.04464
    if(last_seen_progress < 0.0446 & 0.0446 < progress & direction > 0){
      reShade({
        "sham-label-2": 1
      })    
    }
    // fourth destination midriver 0.3244
    // if(last_seen_progress < 0.3244 & 0.3244 < progress & direction > 0){
    //   reShade({
    //   })    
    // }
    // fifth destination city 0.8630
    if(last_seen_progress < 0.8630 & 0.8630 < progress & direction > 0){
      reShade({
        "sham-label-3": 1
      })    
    }
    // sixth destination city 0.985
    if(0.975 < progress & direction > 0){
      reShade({
        "sham-label-4": 1
      })    
    }


    ///
    /// reverse direction (is there a better way to do this?)
    if(progress == 0 & 0 < last_seen_progress & direction < 0){
      reShade({
        "sham-label-0": 0
      })
    }
    // second destination city 0.01785
    if(progress < 0.01785 & 0.01785 < last_seen_progress & direction < 0){
      reShade({
        "sham-label-1": 0
      })
    }
    // third destination city 0.04464
    if(progress < 0.0446 & 0.0446 < last_seen_progress & direction < 0){
      reShade({
        "sham-label-2": 0
      })    
    }
    // fourth destination midriver 0.3244
    // if(last_seen_progress < 0.3244 & 0.3244 < progress & direction > 0){
    //   reShade({
    //   })    
    // }
    // fifth destination city 0.8630
    if(progress < 0.8630 & 0.8630 < last_seen_progress & direction < 0){
      reShade({
        "sham-label-3": 0,
        "sham-label-4": 0
      })    
    }
    // sixth destination city 0.985
    if(0.975 < progress & 0.975 >= last_seen_progress & direction < 0){
      reShade({
        "sham-label-4": 0
      })    
    }

    last_seen_progress = progress
  }

  /**
   * setupSections - each section is activated
   * by a separate function.
   *
     */
  var setUpSections = function () {
    // activateFunctions are called each
    // time the active section changes
    for (var i = 0; i < 9; i++) {
      activateFunctions[i] = function () {};
    }
    activateFunctions[0] = step_1
    activateFunctions[1] = step_2_activate
    activateFunctions[2] = step_3

    // updateFunctions are called
    // in a particular section to update
    // Most sections do not need to be updated.
    for (var i = 0; i < 9; i++) {
      updateFunctions[i] = function () {};
    }
    updateFunctions[1] = step_2_progress;
  };

  map.activate = function (index) {
    activeIndex = index;
    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function (i) {
      activateFunctions[i]();
    });
    lastIndex = activeIndex;
  };

  /**
   * update
   *
   * @param index
   * @param progress
   */
  map.update = function (index, progress) {
    updateFunctions[index](progress);
  };

  return map
}

function display() {
  // create a new plot and
  // display it

  var plot = scrollVis();

  d3.select('#vis')
    .call(plot);

  // setup scroll functionality
  var scroll = scroller()
    .container(d3.select('#graphic'));

  // pass in .step selection as the steps
  scroll(d3.selectAll('.step'));

  // setup event handling
  scroll.on('active', function (index) {
    // highlight current step text
    d3.selectAll('.step')
      .style('opacity', function (d, i) { return i === index ? 1 : 0.1; });

    // activate current section
    plot.activate(index);
  });

  scroll.on('progress', function (index, progress) {
    plot.update(index, progress);
  });
}

display()