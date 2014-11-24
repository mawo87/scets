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
            //this.data = new vis.Parser().helpers.transpose(vis.data.grid);
            this.data = vis.data.fullGrid;
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

            this.svg = d3.select('#canvas').append("svg")
                .attr("width", width)
                .attr("height", height)
                .style("margin-left", -self.settings.canvas.margin.left + "px")
                .append("g")
                .attr("transform", "translate(" + self.settings.canvas.margin.left + "," + self.settings.canvas.margin.top + ")");

            this.renderSets();
            this.updateCanvasHeight();
            this.drawDegreeHistogram(vis.data.elements);

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
        getDegreeList: function(entries) {
            var result = [];
            for (var i = entries.length - 1; i >= 0; i--) {
                if (result[entries[i].degree] === undefined) {
                    result[entries[i].degree] = { degree: entries[i].degree, count: 1 };
                } else {
                    result[entries[i].degree].count++;
                }
            }
            return result;
        },
        renderSets: function() {
            //TODO: remove --> just added for testing
            //this.max_sets_per_group = 10;

            var self = this,
                //data = vis.helpers.chunk(this.data, Math.ceil(this.max_sets_per_group)); //this will just wrap the data array into another level
                //calculate number of set groups needed
                data = vis.helpers.chunk(this.data, Math.ceil(this.max_sets_per_group));

            var setGroups = this.svg.selectAll('.set-group')
                .data(data)
                .enter().append("g")
                .attr("class", "set-group")
                .attr("transform", function(d, i) {
                    var top_offset = self.settings.canvas.margin.top;
                    return "translate(0," + (i * (self.getSetOuterHeight() + top_offset)) + ")";
                });

            setGroups.each(renderSetsNew);
            setGroups.each(renderLabels);

            function renderLabels(setGroup, index) {
                //creates an array from 0 to maxDegree
                var data_y_axis = vis.helpers.createZeroToNArray(vis.data.maxDegree),
                    data_x_axis = vis.data.sets.slice(index * self.max_sets_per_group, index * self.max_sets_per_group + self.max_sets_per_group);

                //render labels for y axis (add labels to given group)
                d3.select(this).selectAll('.y-label')
                    .data(data_y_axis)
                    .enter().append("text")
                    .attr("class", "y-label")
                    .attr("x", -6)
                    .attr("y", function(d, i) { return i * self.settings.set.height + self.settings.subset.r + 3; })
                    .attr("dy", ".32em")
                    .attr("text-anchor", "end")
                    .text(function(d, i) { return i + 1 ; }); //start with degree 1 (not 0)

                //render labels for x axis
                d3.select(this).selectAll('.x-label')
                    .data(data_x_axis)
                    .enter().append("text")
                    .attr("class", "x-label")
                    .attr("transform", function(d, i) {
                        return "rotate(-90)";
                    })
                    .attr("x", 6)
                    .attr("y", function(d, i) { return self.xScale(i) + 7; })
                    .attr("dy", ".32em")
                    .attr("text-anchor", "start")
                    .text(function(d, i) { return d.name; });
            }

            function renderSetsNew(d, i) {
                var sets = d3.select(this).selectAll(".set")
                    .data(data[i])
                    .enter().append("g")
                    .attr("class", "set")
                    .attr("transform", function(d, i) {
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
                    });
            }

            function drawSubsets(set) {
                var circle = d3.select(this).selectAll('.subset')
                    .data(set)
                    .enter()
                    .append("circle")
                    .attr("class", "subset")
                    .attr("cx", self.settings.set.width/2)
                    .attr("cy", function(d, i) { return self.yScale(i) + self.settings.set.height / 2; })
                    .attr("r", self.settings.subset.r)
                    //.style("fill", function(d) { return self.colorScale(d); })
                    .style("fill", function(d) { return self.colorScale(d.count); })
                    .on("mouseover", onMouseover)
                    .on("mouseout", onMouseout)
                    .on("click", onClick);

                function onMouseover(d, i) {
                    var $tooltip = $('#tooltip'),
                        //itemCount = d,
                        itemCount = d.count,
                        degree = i,
                        text = "",
                        //xPos = parseFloat($(this).offset().left - ($tooltip.width() / 2 - self.settings.subset.r / 2)),
                        xPos = parseFloat($(this).offset().left) - ($tooltip.width()/2 + self.getTotalSetWidth()/2 - self.settings.subset.r/2),
                        yPos = parseFloat($(this).offset().top) + 3 * self.settings.subset.r;

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
                    d3.select('#tooltip')
                        .classed("hidden", true);
                }

                function onClick(subset, rowIndex) {
                    console.log("subset ", subset, "rowIndex ", rowIndex);
                    var degree = rowIndex + 1,
                        //set_occurrence_map = subset.getSetOccurrenceMap(subset.set_name),
                        elements = subset.getElementNames();

                    //console.log("set_occurrence_map ", set_occurrence_map);

                    //self.selectSubset(subset, rowIndex);
                    self.selectSubset_New(subset, degree);

                }
            }

            //console.log("setGroups ", setGroups);
        },
        clearSelection: function() {
            d3.selectAll('.subset.selected').remove();
            d3.selectAll('.subset.hidden').classed("hidden", false);
        },
        selectSubset_New: function(subset) {
            var set_occurrence_map = vis.helpers.getElementsGroupedBySetAndDegree(subset),
                table = new vis.Table({ container: "#element-table", tableClass: "table table-bordered" });

            //console.log("vis.helpers.getElementsGroupedBySetAndDegree ", vis.helpers.getElementsGroupedBySetAndDegree(subset));

            //first unselect all previously selected elements
            this.clearSelection();

            table.update(subset.elements);

            d3.selectAll('.set-group').selectAll('.set .subset').each(function(d, i) {
                //console.log("d ", d, "i ", i);

                if (typeof set_occurrence_map[d.set_name] !== "undefined" && typeof set_occurrence_map[d.set_name][d.degree] !== "undefined") {
                    //console.log("is ok ", this);

                    var cx = d3.select(this).attr("cx"),
                        cy = d3.select(this).attr("cy"),
                        r = d3.select(this).attr("r");

                    d3.select(this).classed("hidden", true);

                    d3.select(this.parentNode)
                        .append("circle")
                        .attr("class", "subset selected")
                        .attr("cx", cx)
                        .attr("cy", cy)
                        .attr("r", r);
                }

            });
        },
        /* deprecated */
        selectSubset: function(subset, rowIndex) {
            var elements = subset.getElementNames(),
                degree = rowIndex + 1,
                result = [];

            console.log("subset ", subset);
            console.log("all elements ", elements);

            //first unselect all previously selected elements
            this.clearSelection();

            for (var i = 0, len = vis.data.fullGrid.length; i < len; i++) {
                var col = vis.data.fullGrid[i],
                    cell = col[rowIndex];

                var filteredArr = cell.elements.filter(function(el) {
                    if ($.inArray(subset.set_name, el.getSets().split(",")) != -1) {
                        return el;
                    }
                }).map(function(el) {
                    return el.name;
                });

                filteredArr = $.unique(filteredArr);
                filteredArr = $(elements).filter(filteredArr);

                result.push({ setIndex: i, elements: filteredArr });

                //console.log("col ", col, "result ", result);
            }

            var newSelection = new vis.Selection(subset.set_name, subset.degree);
            newSelection.elements = subset.elements;

            var table = new vis.Table({ container: "#element-table", tableClass: "" });
            table.update(subset.elements);

            createSelection(result, rowIndex);

            function createSelection(data, index) {
                console.log("data ", data, "index ", index);

                d3.selectAll('.set-group').selectAll('.set .subset').each(function(d, i) {
                    ////console.log("d ", d, "i ", i);
                    if (d.degree == index + 1 && d.elements.length > 0) {
                        /*
                        var c = document.createElement('circle');
                        c.setAttribute("cx", this.getAttribute("cx"));
                        c.setAttribute("cy", this.getAttribute("cy"));
                        c.setAttribute("r", this.getAttribute("r"));
                        c.setAttribute("style", "fill:rgb(0,0,0);");
                        c.setAttribute("class", "subset");
                        this.parentNode.insertBefore(c, this.nextSibling);
                        */

                        var cx = d3.select(this).attr("cx"),
                            cy = d3.select(this).attr("cy"),
                            r = d3.select(this).attr("r");

                        d3.select(this.parentNode)
                            /*
                            .selectAll(".selected")
                            .data(data)
                            .enter()
                            */
                            .append("circle")
                            .attr("class", "selected")
                            .attr("cx", cx)
                            .attr("cy", cy)
                            .attr("r", r)
                            .attr("fill", "orange");

                    }
                });

            }
        },
        updateCanvasHeight: function() {
            var no_of_set_groups = Math.ceil(this.data.length / this.max_sets_per_group),
                newHeight = (this.getSetOuterHeight() + this.settings.canvas.margin.top) * no_of_set_groups;
            
            d3.select('#canvas svg').attr("height", newHeight);
        },
        drawDegreeHistogram: function(elements) {

            var $container = $('#degree-hist'),
                degreeList = this.getDegreeList(elements),
                sorted = degreeList.sort(function (a, b) {
                    return (a.degree - b.degree);
                }),
                maxEntriesCount = 0,
                arr = [];

            for (var i = 0; i < sorted.length; i++) {
                if (sorted[i] !== undefined) {
                    if (maxEntriesCount < sorted[i].count) {
                        maxEntriesCount = sorted[i].count;
                    }
                }
            }

            for (var i = 0, len = sorted.length; i < len; i++) {
                var deg = sorted[i];
                if (deg !== undefined) {
                    var per = deg.count / maxEntriesCount * 100;
                    arr.push('<li>');
                    arr.push(deg.degree + '<div class="meter"><span class="Degree-' + deg.degree + '" style="width: ' + per.toFixed(2) + '%">');
                    arr.push('<span class="inner-meter"></span>');
                    arr.push('</li>');
                }
            }

            $container.find('ul').append(arr.join(''));

            return sorted;

        }
    };

    vis.Renderer = Renderer;

    return vis;

})(SetVis || {});