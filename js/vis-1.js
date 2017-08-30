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
  var translate_x = -750,
      translate_y = 600;

  // satellite projection? 
  var projection = d3.geo.mercator()
      .scale(800)
      .translate([translate_x, translate_y]);

  var path = d3.geo.path()
      .projection(projection);

  svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  var subunits, places;
  var city_mapping    = {}
  var country_mapping = {}

  //  Flood cat 0 - Not flood proned, 
  //  1 - Severe River Flooding, 
  //  8 - Moderate Tidal Surge

  var flood_color_scale = d3.scale.ordinal()
      .domain(d3.range(0, 9))
      .range(d3.schemeReds[9]);

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
    // var svg = selection.append("svg")

    queue()
      .defer(d3.json, '../map-files/bangla-region.topo.json')
      .defer(d3.json, '../map-files/bangla-places.topo.json')
      .defer(d3.json, '../map-files/bangla-country-2.topo.json')
      .defer(d3.json, '../map-files/bangla-all-river-centerlines.topo.json')
      .defer(d3.json, '../map-files/bangla-river-poly-snapped.topo.json')
      .defer(d3.json, '../map-files/bangla-inland-rivers-clipped.topo.json')
      .defer(d3.json, '../map-files/bangla-flood-risk-small.topo.json')
      .defer(d3.json, '../map-files/bangla-erosion.topo.json')
      .await(makeMyMap);

    function makeMyMap(
        error, 
        countries, 
        cities, 
        bangla_country,
        bangla_rivers_centerlines,
        bangla_rivers_polygons,
        inland_rivers_polygons,
        flood_risk,
        erosion
    ) {
      subunits = topojson.feature(countries, countries.objects.bangla_region);

      subunits.features.map(function(d) { 
        country_mapping[d.properties.name] = d
      })

      places = topojson.feature(cities, cities.objects.bangla_places);
      bangla_subunits = topojson.feature(
        bangla_country, 
        bangla_country.objects.bangla_country
      );
      
      bangla_river_cent = topojson.feature(
        bangla_rivers_centerlines,
        bangla_rivers_centerlines.objects.bangla_all_river_centerlines);

      bangla_river_poly = topojson.feature(
        bangla_rivers_polygons, 
        bangla_rivers_polygons.objects.bangla_river_poly_snapped
      );

      bangla_inland_rivers_poly = topojson.feature(
        inland_rivers_polygons, 
        inland_rivers_polygons.objects.bangla_inland_rivers_clipped
      );

      // draw land masses except bangladesh (we need higher def)
      svg.selectAll(".subunit")
          .data(subunits.features)
        .enter().append("path")
        .filter(function(d) { return (d.id != "BGD") & (d.id != 'IND')})
          .attr("class", function(d) { 
          	return "subunit " + d.id; 
          })
          .attr("d", path)
      ;
      // draw bangladesh land mass
      svg.selectAll(".subunit-bangla")
          .data(bangla_subunits.features)
        .enter().append("path")
          .attr("class", function(d) { 
            return "subunit " + d.id;
          })
          .attr("d", path)
      ;

      flood_subunits = topojson.feature(flood_risk, flood_risk.objects.bangla_flood_risk);
      // draw land masses
      svg.selectAll(".flood-risk")
          .data(flood_subunits.features)
        .enter().append("path")
          .attr("class", function(d) { return "flood-risk " + d.id; })
          .attr("d", path)
          .attr("opacity", 0)
          .attr("fill", function(d) {
            var risk = d.properties.flood_risk
            return flood_color_scale(risk); 
          });

      river_color = '#40a4df'
      river_opacity = 0
      // draw river centerlines
      svg.selectAll(".river-centerlines")
          .data(bangla_river_cent.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path)
          .style('fill', 'none')
          .style('stroke', river_color)
          .style('stroke-width', '.05px')
          .attr('opacity', river_opacity)
      ;

      // draw river polygons
      svg.selectAll(".river-polygons")
          .data(bangla_river_poly.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path)
          .attr('opacity', river_opacity)
          .style('fill', river_color)
      ;  

      svg.selectAll(".river-polygons-2")
          .data(bangla_inland_rivers_poly.features)
        .enter().append("path")
          .attr("class", "river")
          .attr("d", path)
          .attr('opacity', river_opacity)
          .style('fill', river_color)
      ;      

      
      // draw boundaries
        svg.append("path")
            .datum(topojson.mesh(countries, countries.objects.bangla_region, function(a, b) { return a !== b }))
            .attr("d", path)
            .attr("class", "subunit-boundary");

      // draw boundaries bangladesh
        svg.append("path")
            .datum(topojson.mesh(bangla_country, bangla_country.objects.bangla_country, function(a, b) { return a !== b }))
            .attr("d", path)
            .attr("class", "subunit-boundary-bangla")
            .attr('opacity', 0)
            ;

      // label land
        svg.selectAll(".subunit-label")
            .data(subunits.features)
          .enter().append("text")
            .attr("class", function(d) { return "subunit-label " + d.id; })
            .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
            .attr("dy", ".35em")
            .text(function(d) { return d.properties.name; });

      // label rivers
        // svg.selectAll(".river-label")
        //     .data(bangla_river_cent.features)
        //   .enter().append("text")
        //     .attr("class", function(d) { return "river-label " + d.id; })
        //     .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        //     .attr("dy", ".35em")
        //     .style('font-size', 3)
        //     .style('font-style', 'italic')
        //     .text(function(d) { return d.id; });


      // draw cities
        svg.selectAll('circle')
        	.data(places.features)
        	.enter().append('circle')
      	.attr("cx", function(d) {
      		return projection(d.geometry.coordinates)[0];
      	})
      	.attr("cy", function(d) {
      		return projection(d.geometry.coordinates)[1];
      	})
      	.attr("r", function(d) {
      		return d3.max([0, 3 - d.properties.rank]);
      	})
      	.attr("class", function(d) {return "place-dot " + d.properties.name})

      // label cities
        svg.selectAll(".place-label")
            .data(places.features)
          .enter().append("text")
            .attr("class", function(d) {return "place-label " + d.properties.name})
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
    

      first_house_x = 515.5;
      first_house_y = 273.5;
      x_padding = -1.5
      // label his starting city
      svg.append('circle')
        .attr('class', 'first-house-dot')
        .attr('cx', first_house_x)
        .attr('cy', first_house_y)
        .attr('r', .5)
        .attr('opacity', 0)

      svg.append('text')
        .attr("class", "first-house-label")
        .attr("transform", function(d) { 
          return "translate(" + first_house_x + "," + first_house_y + ")"; 
        })
        .attr("x", x_padding) // 6 or -6 
        .attr("dy", ".35em")
        .style("text-anchor", "end") // "start" or "end"
        .style('font-size', '1.5px')
        .html("Elisha Village")
        .attr('opacity', 0)

      svg.append('text')
        .attr('class', 'first-house-label')
        .attr("transform", function(d) { 
          return "translate(" + first_house_x + "," + first_house_y + ")"; 
        })
        .attr("x", x_padding) // 6 or -6 
        .attr("dy", "1.65em")
        .style("text-anchor", "end") // "start" or "end"
        .style('font-size', '1px')
        .style('font-style', 'italic')
        .html("(Shamshuddin's Home. ca. 1981)")
        .attr('opacity', 0)

      // draw erosion 
      erosion_subunits = topojson.feature(erosion, erosion.objects.bangla_erosion);
      // draw land masses
      svg.selectAll(".erosion-subunit")
          .data(erosion_subunits.features)
        .enter().append("path")
          .attr("class", "erosion-subunit")
          .attr("d", path)
          .attr("opacity", 0)
          .attr("fill", 'purple');

      var legend_box_height = 1.5;
      var legend_y_offset = 270;
      var legend_x_offset = 480;
      var legend_width = 5;

      // scale for flooding choropleth 
      svg.selectAll("rect")
        .data(flood_color_scale.domain())
        .enter().append("rect")
          .attr("class", "flood-legend")
          .attr("height", legend_box_height)
          .attr("x", legend_x_offset)
          .attr("y", function(d) { return d * legend_box_height + legend_y_offset; })
          .attr("width", legend_width )
          .attr("fill", function(d) { return flood_color_scale(d); })
          .attr('opacity', 0)

      legend_labels = {
        '0': '0: Not flood prone',
        '1': '1: Severe River Flooding',
        '8': '8: Moderate Tidal Surge'
      }

      svg.selectAll(".flood-legend-label")
          .data(d3.range(0, 9))
          .enter().append("text")
          .attr("class", "flood-legend-label")
          .attr("x", legend_x_offset - 1)
          .attr("y", function(d) { return ( d * legend_box_height + legend_box_height ) + legend_y_offset; })
          .attr("fill", "#000")
          .attr("text-anchor", "end")
          .text(function(d){return legend_labels[d];})
          .style('font-size', legend_width / 4)
          .attr('opacity', 0)
        ;
    }
  }

  function reShade(item_recolor_mapping){
    for (var svg_item in item_recolor_mapping){
        svg.selectAll('.' + svg_item)
              .transition(svg_item).duration(750)
              .attr('opacity', item_recolor_mapping[svg_item])
    }
  }

  var step_1 = function () {
    // zoom out to South Asia
    // exit previous
    svg.selectAll('.subunit-label')
      .transition().duration(750)
      .style('font-size', '20px')

    svg.selectAll('.place-label')
      .transition().duration(750)
      .style('font-size', '10px')

    // zoom out (still exit previous) 
    svg.transition()
        .duration(750)
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(1)translate(" + - width / 2 + "," + - height /  2 + ")")
        .style("stroke-width", .5 + "px");

    reShade({
      'subunit': 1,
      'subunit-boundary':1,
      'subunit-label': 1,
      'place-label': 1,
      'flood-legend-caption':0,
      "erosion-caption":0
    })
  }

  function zoom_bangladesh() {
    // entrance
    var x = path.centroid(country_mapping["Bangladesh"])[0]
    var y = path.centroid(country_mapping["Bangladesh"])[1]
    svg.transition()
        .duration(750)
        .attr("transform", "translate(" + width + "," + height + ")scale(8)translate(" + -x/3.5 + "," + -y/8 + ")")
        .style("stroke-width", .1 + "px")

    svg.selectAll('.subunit-label')
      .transition().duration(750)
      .style('font-size', '10px')

    svg.selectAll('.place-label')
      .transition().duration(750)
      .style('font-size', '5px')
  }

  var step_2 = function () {
    // zoom in to bangladesh
    reShade({
      'subunit:not(.BGD)':.2,
      'subunit-label':0,
      'subunit-boundary':0,
      'subunit-boundary-bangla':.4,
      'place-label.Kolkata':0,
      'place-label.Patna':0,
      'place-dot.Kolkata':0,
      'place-dot.Patna':0,
      'river':0,
      'flood-legend-caption':0,
      'erosion-caption':0
    })
    zoom_bangladesh();
  }

  var step_2a = function() {
    reShade({
      'subunit-boundary-bangla':.4,
      'river': 1,
      'flood-risk': 0,
      'flood-legend': 0,
      'flood-legend-label': 0,
      'flooding-caption': 0,
      'place-label:not(.Kolkata):not(.Patna)': 1,
      'place-dot:not(.Kolkata):not(.Patna)' : 1,
      'subunit.BGD':1
    })
  }



  var step_3 = function() {
    // show flood risk
    // exit
    reShade({
      'erosion-subunit': 0,
      'erosion-caption':0
    })

    // entrance
    reShade({
      'flood-risk':1,
      'flood-legend':1,
      'flood-legend-label':1,
      'place-label':0,
      'subunit':.2,
      'place-dot':0,
      'river': .4
    })

    svg.append("text")
        .attr("class", "flooding-caption")
        .attr("x", 510)
        .attr("y", 235)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text("Major Flood-Risk Areas (2013)")
        .style('font-size', "4px")
        .attr('opacity', 0)
        .transition().duration(750)
        .attr('opacity', 1)
        ;
  }

  var step_4 = function() {
    // show erosion risk 
    reShade({
      'flooding-caption':0,
      'flood-risk': 0,
      'flood-legend': 0,
      'subunit.BGD':.4,
      'flood-legend-label':0,
      'erosion-subunit': 1,
      'first-house-dot': 0,
      'first-house-label': 0,
      'river':.4
    })
    zoom_bangladesh();

    svg.append("text")
        .attr("class", "erosion-caption")
        .attr("x", 510)
        .attr("y", 235)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text("Riverbank Erosion (2013)")
        .style('font-size', "4px")
        .attr('opacity', 0)
        .transition().duration(750)
        .attr('opacity', 1)
        ;
  }

  var step_5 = function() {
    reShade({
      'erosion-subunit': 0,
      'first-house-dot': 1,
      'first-house-label': 1,
      'subunit:not(.BGD)':0,
      'river':.2,
      'subunit-boundary':0
    })

    // final zoom in 
    svg.transition()
    .duration(750)
    .attr("transform", 
      "translate(" + width + "," + height + ")scale(20)translate(" + -80 + "," + -10 + ")")
    .style("stroke-width", .1 + "px")

    svg.selectAll('.place-label')
      .transition().duration(750)
      .style('font-size', '2px')

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
    activateFunctions[0] = step_1;
    activateFunctions[1] = step_2;
    activateFunctions[2] = step_2a;
    activateFunctions[3] = step_3;
    activateFunctions[4] = step_4;
    activateFunctions[5] = step_5;

    // updateFunctions are called
    // in a particular section to update
    // Most sections do not need to be updated.
    for (var i = 0; i < 9; i++) {
      updateFunctions[i] = function () {};
    }
    // updateFunctions[7] = updateCough;
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
  // vis = d3.select("#vis")
     // .append("svg")

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
      .style('opacity', function (d, i) { 
        return i === index ? 1 : 0.3; 
    });

    // activate current section
    plot.activate(index);
  });

  scroll.on('progress', function (index, progress) {
    plot.update(index, progress);
  });
}

display()