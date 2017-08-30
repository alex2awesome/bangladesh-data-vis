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
  // var water_color = '#40a4df'
  var water_color = 'rgba(64,164,223,.5)'

  var translate_x = -1400,
      translate_y = 700;

  // satellite projection? 
  var projection_overview = d3.geo.mercator()
      .scale(1400)
      .translate([translate_x, translate_y]);

  var path_overview = d3.geo.path()
      .projection(projection_overview)


  // satellite projection? 
  var projection = d3.geo.mercator()
      .scale(1)
      .translate([0, 0]);

  var path = d3.geo.path()
      .projection(projection);

  svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", water_color)
    ;
  
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
      .defer(d3.json, '../map-files/bangla-country-2.topo.json')
      .defer(d3.json, '../map-files/bangla-places.topo.json')
      .defer(d3.json, '../map-files/shamshuddins_path_2.topo.json')
      .defer(d3.json, '../map-files/bangla-river-poly-snapped.topo.json')
      .defer(d3.json, '../map-files/bangla-inland-rivers-clipped.topo.json')
      .defer(d3.json, '../map-files/dhaka-metro-area.topo.json')
      .await(makeMyMap);

    function makeMyMap(
      error, 
      countries,
      bangla, 
      cities, 
      shamshuddins_path,
      bangla_rivers_polygons,
      inland_rivers_polygons,
      dhaka_metro_area
    ){
      // convert topojson to GeoJSON for plotting
      all_subunits = topojson.feature(countries, countries.objects.bangla_region);
      subunits = topojson.feature(bangla, bangla.objects.bangla_country);
      places = topojson.feature(cities, cities.objects.bangla_places);
      
      bangla_river_poly = topojson.feature(
        bangla_rivers_polygons, 
        bangla_rivers_polygons.objects.bangla_river_poly_snapped
      );

      bangla_inland_rivers_poly = topojson.feature(
        inland_rivers_polygons, 
        inland_rivers_polygons.objects.bangla_inland_rivers_clipped
      );

      dhaka_metro_area_poly = topojson.feature(
        dhaka_metro_area, 
        dhaka_metro_area.objects.dhaka_metro_area
      );

      // get lookup
      all_subunits.features.map(function(d) { 
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

      // draw land masses
      svg.selectAll(".subunit")
          .data(subunits.features)
        .enter().append("path")
          .attr("class", function(d) { 
            return "subunit " + d.id; 
          })
          .attr("d", path)
          ;

      // draw dhaka metro area
      svg.selectAll('.dhaka-metro')
          .data(dhaka_metro_area_poly.features)
        .enter().append('path')
          .attr('class', 'dhaka-metro-area')
          .attr("d", path)
          .attr("opacity", .35) // transition to .35
          .style('fill', 'gray')

      // draw boundaries
        svg.append("path")
            .datum(topojson.mesh(
              bangla, 
              bangla.objects.bangla_country, 
              function(a, b) {return a !== b }
              )
            )
            .attr("d", path)
            .attr("class", "subunit-boundary");

      // label land
        // svg.selectAll(".subunit-label")
        //     .data(all_subunits.features)
        //   .enter().append("text")
        //     .attr("class", function(d) { return "subunit-label " + d.id; })
        //     .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        //     .attr("dy", ".35em")
        //     .text(function(d) { return d.properties.name; });

      // // label cities
      //   svg.selectAll(".place-label")
      //       .data(places.features)
      //     .enter().append("text")
      //       .attr("class", "place-label")
      //       .attr("transform", function(d) { 
      //         return "translate(" + projection(d.geometry.coordinates) + ")"; 
      //       })
      //       .attr("x", function(d) { 
      //         return d.geometry.coordinates[0] > -1 ? 6 : -6; 
      //       })
      //       .attr("dy", ".35em")
      //       .style("text-anchor", function(d) { 
      //         return d.geometry.coordinates[0] > -1 ? "start" : "end"; 
      //       })
      //       .text(function(d) { 
      //         return (3 - d.properties.rank) > 0 ? d.properties.name : ''; });

      //create river
      svg.selectAll(".river-1")
          .data(bangla_inland_rivers_poly.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path)
          .style('fill', 'white')
      ;  
      svg.selectAll(".river-color-1")
          .data(bangla_inland_rivers_poly.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path)
          .attr('opacity', .9)
          .style('fill', water_color)
      ;  
      svg.selectAll(".river-2")
          .data(bangla_river_poly.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path)
          .style('fill', 'white')
      ;  
      svg.selectAll(".river-color-2")
          .data(bangla_river_poly.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path)
          .attr('opacity', .9)
          .style('fill', water_color)
      ;  

      svg.selectAll('.dhaka-metro-area-label')
        .data(['Dhaka','Metro','Area'])
        .enter().append('text')
        .attr('class', 'dhaka-metro-area-label')
        .attr('x', 400)
        .attr('y', function(d, i) { return 118 + 10 * i })
        .text(function(d) { return d })
        .style('font-style', 'italic')
        .attr('opacity', 1)

      // parts of the overview map
      // include a backdrop for the overview legend
        svg.append("rect")
          .attr("class", "overview-backdrop")
          .attr("x", 727)
          .attr("y", 8)
          .attr("width", 160)
          .attr("height", 193)
          .style("fill", "white")
          .style("stroke", "steelblue")
          .attr('opacity', .5)

      // draw land masses for overview map
      svg.selectAll(".subunit-overview")
          .data(all_subunits.features)
        .enter().append("path")
          .attr("class", function(d) { 
            return "subunit-overview " + d.id; 
          })
          .attr("d", path_overview)
          .attr('opacity', function(d) { return d.id == 'BGD' ? 1 : 0 })
          ;
      svg.selectAll(".river-color-overview")
          .data(bangla_inland_rivers_poly.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path_overview)
          .attr('opacity', .2)
          .style('fill', 'white')
      ;    

      // add bounding box to show area
      legend_bounds = path_overview.bounds(country_mapping['Bangladesh']);
      svg.append("rect")
        .attr("class", "overview-backdrop")
        .attr("x", legend_bounds[0][0] + 18)
        .attr("y", legend_bounds[0][1] + 65)
        .attr("width", (legend_bounds[1][0] - legend_bounds[0][0]) / 1.28)
        .attr("height", (legend_bounds[1][1] - legend_bounds[0][1]) / 3)
        .style("fill", "white")
        .style("stroke", "steelblue")
        .attr('opacity', .5)


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
      .attr("class", function(d, i) { return "shamshuddins-path-circle-" + i})

      svg.selectAll(".sham-label")
      .data(path_points)
        .enter().append("text")
          .attr("class", function(d, i) {return "sham-label-" + i})
          .attr("transform", function(d) { 
            return "translate(" + projection(d.geometry.coordinates) + ")"; 
          })
          .attr("x", function(d, i) { 
            return [1, 3, 4].indexOf(i) == -1 ? 6 : -6; 
          })
          .attr("y", function(d, i){
            return [0].indexOf(i) != -1 ? 5 : 0 
          })
          .attr("dy", ".5em")
          .style("text-anchor", function(d, i) {
              return [1, 3, 4].indexOf(i) == -1 ? "start" : "end"; 
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
        .attr('class', function(d, i) {return 'sham-path-progress-' + i})
        .style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '.5px')
        .attr('opacity', 1)

      svg.selectAll(".sham-path-overlay")
        .data(path_arcs)
        .enter()
        .append("path")
        .attr('d', path)
        .attr('class', function(d, i) {return 'sham-path-overlay-' + i})
        .style('fill', 'none')
        .style('stroke', 'black')
        .style('stroke-width', '.5px')
        .attr('opacity', 0)
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
      reShade({
        "sham-path-overlay-0": 1,
        "sham-path-overlay-1": 1,
        "sham-path-overlay-2": 1,
        "sham-path-overlay-3": 1,
        "sham-path-progress-0": 0,
        "sham-path-progress-1": 0,
        "sham-path-progress-2": 0,
        "sham-path-progress-3": 0,
        "shamshuddins-path-circle-0":1,
        "shamshuddins-path-circle-1":1,
        "shamshuddins-path-circle-2":1,
        "shamshuddins-path-circle-3":1,
        "shamshuddins-path-circle-4":1,
        "dhaka-metro-area":.35,
        "dhaka-metro-area-label":1,
      }, 50)

      reShade({
        "sham-label-0":1,
        "sham-label-1":0,
      })
  }

  var step_2_activate = function(){
    // Elisha village -> Donia
      reShade({
        "sham-path-overlay-0": 0,
        "sham-path-overlay-1": 0,
        "sham-path-overlay-2": 0,
        "sham-path-overlay-3": 0,
        "sham-path-progress-0": 1,
        "sham-path-progress-1": 0,
        "sham-path-progress-2": 0,
        "sham-path-progress-3": 0,
        "shamshuddins-path-circle-0":1,
        "shamshuddins-path-circle-1":0,
        "shamshuddins-path-circle-2":0,
        "shamshuddins-path-circle-3":0,
        "shamshuddins-path-circle-4":0,
        "dhaka-metro-area":0,
        "dhaka-metro-area-label":0,
      }, 50)

      reShade({
        "sham-label-0":1,
        "sham-label-1":0
        // "sham-label-2":0
      })
  }

  var step_2_progress = function(progress) {
    // Elisha village -> Donia
    "draw progress."

    selection = svg.select('.sham-path-progress-0')
    selection.style('stroke-dasharray', tweenDash(selection, progress))

    // possibly unnecessary...
    direction = progress - last_seen_progress
    last_seen_progress = progress
  }

  var step_3_activate = function(){
    // Donia -> Elisha Ferry Terminal
      reShade({
        "sham-path-overlay-0": 1,
        "sham-path-overlay-1": 0,
        "sham-path-overlay-2": 0,
        "sham-path-overlay-3": 0,
        "sham-path-progress-0": 1,
        "sham-path-progress-1": 1,
        "sham-path-progress-2": 0,
        "sham-path-progress-3": 0,
        "shamshuddins-path-circle-1":1,
        "shamshuddins-path-circle-2":0,
      }, 50)

      reShade({
        "sham-label-1":1,
        "sham-label-2":0
      })
  }

  var step_3_progress = function(progress) {
    // Donia -> Elisha Ferry Terminal
    "draw progress."

    selection = svg.select('.sham-path-progress-1')
    selection.style('stroke-dasharray', tweenDash(selection, progress))

    // possibly unnecessary...
    direction = progress - last_seen_progress
    last_seen_progress = progress
  }

  var step_4_activate = function(){
    // Elisha Ferry Terminal -> Sadarghat
      reShade({
        "sham-path-overlay-0": 1,
        "sham-path-overlay-1": 1,
        "sham-path-overlay-2": 0,
        "sham-path-overlay-3": 0,
        "sham-path-progress-0": 1,
        "sham-path-progress-1": 1,
        "sham-path-progress-2": 1,
        "sham-path-progress-3": 0,
        "dhaka-metro-area": 0,
        "dhaka-metro-area-label": 0,
        "shamshuddins-path-circle-2":1,
        "shamshuddins-path-circle-3":0,
      }, 50)

      reShade({
        "sham-label-2":1,
        "sham-label-3":0
      })
  }

  var step_4_progress = function(progress) {
    // Elisha Ferry Terminal -> Sadarghat
    "draw progress."

    selection = svg.select('.sham-path-progress-2')
    selection.style('stroke-dasharray', tweenDash(selection, progress))

    // possibly unnecessary...
    direction = progress - last_seen_progress
    last_seen_progress = progress
  }

  var step_5_activate = function(){
    // Sadarghat -> Bhola Bosti
      reShade({
        "sham-path-overlay-0": 1,
        "sham-path-overlay-1": 1,
        "sham-path-overlay-2": 1,
        "sham-path-overlay-3": 0,
        "sham-path-progress-0": 1,
        "sham-path-progress-1": 1,
        "sham-path-progress-2": 1,
        "sham-path-progress-3": 1,
        "shamshuddins-path-circle-3":1,
        "shamshuddins-path-circle-4":0,
      }, 50)

      reShade({
        "sham-label-3":1,
        "dhaka-metro-area": .35,
        "dhaka-metro-area-label": 1,
        "sham-label-4":0
      })
  }

  var step_5_progress = function(progress) {
    // Sadarghat -> Bhola Bosti
    "draw progress."

    selection = svg.select('.sham-path-progress-3')
    selection.style('stroke-dasharray', tweenDash(selection, progress))

    // possibly unnecessary...
    direction = progress - last_seen_progress
    last_seen_progress = progress
  }

  var step_6 = function(){
      reShade({
        "sham-path-overlay-0": 1,
        "sham-path-overlay-1": 1,
        "sham-path-overlay-2": 1,
        "sham-path-overlay-3": 1,
        "sham-path-progress-0": 0,
        "sham-path-progress-1": 0,
        "sham-path-progress-2": 0,
        "sham-path-progress-3": 0,
        "shamshuddins-path-circle-4":1,
        // "dhaka-metro-area": 0,
        // "dhaka-metro-area-label": 0
      }, 50)

      reShade({
        "sham-label-4":1
      })
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
    activateFunctions[2] = step_3_activate
    activateFunctions[3] = step_4_activate
    activateFunctions[4] = step_5_activate
    activateFunctions[5] = step_6

    // updateFunctions are called
    // in a particular section to update
    // Most sections do not need to be updated.
    for (var i = 0; i < 9; i++) {
      updateFunctions[i] = function () {};
    }
    updateFunctions[1] = step_2_progress
    updateFunctions[2] = step_3_progress
    updateFunctions[3] = step_4_progress
    updateFunctions[4] = step_5_progress
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