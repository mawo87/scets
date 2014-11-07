/**
 * Created by martinwortschack on 05/11/14.
 */
var SetVis = (function(vis) {

    function Renderer() {
        this.settings = {
            canvas: {
                margin: {
                    top: 60,
                    right: 80,
                    bottom: 10,
                    left: 60
                },
                width: 900,
                height: 700
            },
            set: {
                margin: { right: 2 },
                width: 16,
                height: 16,
                stroke: 1
            },
            subset: {
                r: 6
            },
            color: {
                range: ['#FFF7FB', '#023858']
            },
            bins: vis.data.maxDegree
        };
        this.max_sets_per_group = 0;
        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.data = [];
        this.init();
    }

    Renderer.prototype = {
        init: function() {
            var self = this;
            this.data = new vis.Parser().helpers.transpose(vis.data.grid);
            this.max_sets_per_group = this.settings.canvas.width / this.getTotalSetWidth();

            initScales();

            function initScales() {
                self.colorScale = d3.scale.linear()
                    .domain([vis.data.min, vis.data.max])
                    .range(self.settings.color.range);

                self.xScale = d3.scale.ordinal()
                    .rangeBands([0, self.settings.canvas.width])
                    .domain(d3.range(self.max_sets_per_group));

                self.yScale = d3.scale.ordinal()
                    .rangeBands([0, self.getSetInnerHeight()])
                    .domain(d3.range(self.settings.bins));
            }
        },
        render: function() {
            var self = this,
                width = this.settings.canvas.width,
                height = this.settings.canvas.height;   //TODO change

            this.svg = d3.select('#main').append("svg")
                .attr("width", width)
                .attr("height", height)
                .style("margin-left", -self.settings.canvas.margin.left + "px")
                .append("g")
                .attr("transform", "translate(" + self.settings.canvas.margin.left + "," + self.settings.canvas.margin.top + ")");

            this.renderSets();
        },
        getTotalSetWidth: function() {
            return this.settings.set.width + 2 * this.settings.set.stroke + this.settings.set.margin.right;
        },
        getSetInnerHeight: function() {
            return this.settings.bins * this.settings.set.height;
        },
        getSetOuterHeight: function() {
            return this.getSetInnerHeight() + 2 * this.settings.set.stroke;
        },
        renderSets: function() {
            //TODO: remove --> just added for testing
            //this.max_sets_per_group = 10,

            var self = this,
                //calculate number of set groups needed
                data = vis.helpers.chunk(this.data, Math.ceil(this.max_sets_per_group)); //this will just wrap the data array into another level

            var setGroups = this.svg.selectAll('.set-group')
                .data(data)
                .enter().append("g")
                .attr("class", "set-group")
                .attr("transform", function(d, i) {
                    var top_offset = i > 0 ? 40 : 0;
                    return "translate(0," + (i * self.getSetOuterHeight() + top_offset) + ")";
                });

            setGroups.each(renderSetsNew);
            setGroups.each(renderLabels);

            function renderLabels(setGroup, index) {
                //creates an array from 0 to maxDegree
                var data_y_axis = vis.helpers.createZeroToNArray(vis.data.maxDegree),
                    data_x_axis = vis.data.setNames.slice(index * self.max_sets_per_group, index * self.max_sets_per_group + self.max_sets_per_group);

                //render labels for y axis (add labels to given group)
                d3.select(this).selectAll('.y-label')
                    .data(data_y_axis)
                    .enter().append("text")
                    .attr("class", "y-label")
                    .attr("x", -6)
                    .attr("y", function(d, i) { return i * self.settings.set.height + self.settings.subset.r + 3; })
                    .attr("dy", ".32em")
                    .attr("text-anchor", "end")
                    .text(function(d, i) { return i; });

                //render labels for x axis
                d3.select(this).selectAll('.x-label')
                    .data(data_x_axis)
                    .enter().append("text")
                    .attr("class", "x-label")
                    .attr("transform", function(d, i) {
                        return "rotate(-90)";
                    })
                    .attr("x", 6)
                    //.attr("y", function(d, i) { return i * self.getTotalSetWidth() + 7; })
                    .attr("y", function(d, i) { return self.xScale(i) + 7; })
                    .attr("dy", ".32em")
                    .attr("text-anchor", "start")
                    .text(function(d, i) { return d; });
            }

            function renderSetsNew(d, i) {
                var sets = d3.select(this).selectAll(".set")
                    .data(data[i])
                    .enter().append("g")
                    .attr("class", "set")
                    .attr("transform", function(d, i) {
                        //return "translate(" + i * self.getTotalSetWidth()  +  ", 0)";
                        return "translate(" + self.xScale(i) + ", 0)";
                    });

                sets.each(drawSets);

                sets.each(drawSubsets);
            }

            function drawSets(d, i) {
                //console.log("d ", d, "i ", i);
                //console.log(d3.select(this));

                d3.select(this)
                    .append("rect")
                    .attr("class", "set-background")
                    .attr("x", 0)
                    .attr("width", self.settings.set.width)
                    .attr("height", function(d, i) {
                        return self.settings.bins * self.settings.set.height;
                    })
                    .attr("fill", "#EFEFEF");
            }

            function drawSubsets(set) {
                //console.log("set ", set);
                var circle = d3.select(this).selectAll('.subset')
                    .data(set)
                    .enter()
                    .append("circle")
                    .attr("class", "subset")
                    .attr("cx", self.settings.set.width/2)
                    //.attr("cy", function(d, i) { return i * self.settings.set.height + self.settings.set.height/2; })
                    .attr("cy", function(d, i) { return self.yScale(i) + self.settings.set.height / 2; })
                    .attr("r", self.settings.subset.r)
                    .style("fill", function(d) { return self.colorScale(d); })
                    .on("mouseover", onMouseover)
                    .on("mouseout", onMouseout);

                function onMouseover(d, i) {
                    //console.log("d3.select(this) ", d3.select(this));
                    var itemCount = d,
                        degree = i,
                        text = "",
                        xPos = parseFloat(jQuery(this).offset().left - self.settings.canvas.margin.left - 3 * self.settings.subset.r), //circle diameter (2r) plus radius
                        yPos = parseFloat(jQuery(this).offset().top) + 3 * self.settings.subset.r;

                    if (degree > 0) {
                        text = "Items shared with " + degree + " other sets: " + itemCount;
                    } else {
                        text = "Unique items in this set: " + itemCount;
                    }

                    //tooltips
                    d3.select('#tooltip')
                        .style("left", xPos + "px")
                        .style("top", yPos + "px")
                        .text(text)
                        .classed("hidden", false);

                }

                function onMouseout() {
                    //tooltip
                    d3.select('#tooltip')
                        .classed("hidden", true);
                }
            }

            console.log("setGroups ", setGroups);
        }
        /* DEPRECATED */
        /*
        renderSets: function() {
            var self = this,
                data = this.data;

            var colorRange = ['#FFF7FB', '#023858'];

            var colorScale = d3.scale.linear()
                .domain([vis.data.min, vis.data.max])
                .range(colorRange);

            var sets = this.svg.selectAll(".set")
                .data(data)
                .enter().append("g")
                .attr("class", "set")
                .attr("transform", function(d, i) {
                    return "translate(" + i * self.getTotalSetWidth()  +  ", 0)";
                });

            sets.each(drawSets);

            sets.each(drawSubsets);

            function drawSets(d, i) {
                //console.log("d ", d, "i ", i);
                //console.log(d3.select(this));

                d3.select(this)
                    .append("rect")
                    .attr("class", "set-background")
                    .attr("x", 0)
                    .attr("width", self.settings.set.width)
                    .attr("height", function(d, i) {
                        return self.settings.bins * self.settings.set.height;
                    })
                    .attr("fill", "#EFEFEF");
            }

            function drawSubsets(set) {
                //console.log("set ", set);
                var circle = d3.select(this).selectAll('.subset')
                    .data(set)
                    .enter()
                    .append("circle")
                    .attr("class", "subset")
                    .attr("cx", self.settings.set.width/2)
                    .attr("cy", function(d, i) { return i * self.settings.set.height + self.settings.set.height/2; })
                    .attr("r", self.settings.subset.r)
                    .style("fill", function(d) { return colorScale(d); })
                    .on("mouseover", onMouseover)
                    .on("mouseout", onMouseout);

                function onMouseover(d, i) {
                    //console.log("d3.select(this) ", d3.select(this));
                    var itemCount = d,
                        degree = i,
                        text = "",
                        xPos = parseFloat(jQuery(this).offset().left - self.settings.canvas.margin.left - 3 * self.settings.subset.r), //circle diameter (2r) plus radius
                        yPos = parseFloat(jQuery(this).offset().top) + 3 * self.settings.subset.r;

                    if (degree > 0) {
                        text = "Items shared with " + degree + " other sets: " + itemCount;
                    } else {
                        text = "Unique items in this set: " + itemCount;
                    }

                    //tooltips
                    d3.select('#tooltip')
                        .style("left", xPos + "px")
                        .style("top", yPos + "px")
                        .text(text)
                        .classed("hidden", false);

                }

                function onMouseout() {
                    //tooltip
                    d3.select('#tooltip')
                        .classed("hidden", true);
                }
            }

        }
        */
    };

    vis.Renderer = Renderer;

    return vis;

})(SetVis || {});