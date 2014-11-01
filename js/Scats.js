var SetVis = (function(vis) {

    vis.init = function() {
        new Scats().init();
    };

    vis.settings = {
        axisNames: {
            x: [],
            y: []
        }
    };

    var config = {
        dataset: "../data/skillmatrix_small.json" //the description file including the data set to be loaded
    };

    function Scats() {
        //this.sets = [];
        //this.subsets = [];
    }

    Scats.prototype = {
        init: function() {
            var self = this,
                converter = new Converter();

            converter.initializeDataSet(config.dataset, function(gridData) {
                //self.draw(gridData);
                self.draw_new(gridData);
            });
        },
        draw_new: function(gridData) {

            var margin = {top: 80, right: 0, bottom: 10, left: 80},
                width = 720,
                height = 720,
                cellSize = 20,
                svg = d3.select("#main").append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .style("margin-left", -margin.left + "px")
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var x = d3.scale.ordinal().rangeBands([0, width]);
            var c = d3.scale.category10().domain(d3.range(10));

            var totalCells = gridData.length * gridData[0].cells.length; //rows x cols
            x.domain(d3.range(totalCells));

            svg.append("rect")
                .attr("class", "background")
                .attr("width", width)
                .attr("height", height);

            var row = svg.selectAll(".row")
                .data(gridData)
                .enter().append("g")
                .attr("class", "row")
                //.attr("transform", function(d, i) { console.log("x(i) ", x(i)); return "translate(0," + i * cellSize + ")"; })
                .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
                .each(row);

            row.append("line")
                .attr("class", "grid-line")
                .attr("x2", width);

            row.append("text")
                .attr("x", -6)
                .attr("y", x.rangeBand() / 2)
                .attr("dy", ".32em")
                .attr("text-anchor", "end")
                .text(function(d, i) { return "Degree " + i; });

            var column = svg.selectAll(".column")
                .data(gridData)
                .enter().append("g")
                .attr("class", "column")
                //.attr("transform", function(d, i) { return "translate(" + i * cellSize + ")rotate(-90)"; });
                .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

            column.append("line")
                .attr("class", "grid-line")
                .attr("x1", -width);

            column.append("text")
                .attr("x", 6)
                .attr("y", x.rangeBand() / 2)
                .attr("dy", ".32em")
                .attr("text-anchor", "start")
                //.text(function(d, i) { return "Set " + i; });
                .text(function(d, i) { return vis.settings.axisNames.x[i]; });

            function row(row) {
                /*
                var cell = d3.select(this).selectAll(".cell")
                    .data(row.filter(function(d) { return d.z; }))
                    .enter().append("rect")
                    .attr("class", "cell")
                    .attr("x", function(d) { return x(d.x); })
                    .attr("width", x.rangeBand())
                    .attr("height", x.rangeBand())
                    .style("fill-opacity", function(d) { return z(d.z); })
                    .style("fill", function(d) { return nodes[d.x].group == nodes[d.y].group ? c(nodes[d.x].group) : null; })
                    .on("mouseover", mouseover)
                    .on("mouseout", mouseout);
                */


                //draw rectangle

                var cell = d3.select(this).selectAll(".cell")
                    .data(row.cells)
                    .enter()
                    .append("rect")
                    .attr("class", "cell")
                    //.attr("x", function(d, i) { return i * cellSize; })
                    .attr("x", function(d, i) { return x(i); })
                    //.attr("width", cellSize)
                    .attr("width", x.rangeBand())
                    //.attr("height", cellSize)
                    .attr("height", x.rangeBand())
                    .style("fill", "rgb(243,243,243)");
                    //.style("fill", function(d) { return c(d.items.length); });


                //draw circle
                var circle = d3.select(this).selectAll(".cell-item")
                    .data(row.cells)
                    .enter()
                    .append("circle")
                    .attr("class", "cell-item")
                    .attr("cx", function(d, i) { return x(i) + x.rangeBand() / 2; })
                    .attr("cy", function(d, i) { return x.rangeBand() / 2; })
                    .attr("r", function(d, i) { return x.rangeBand() / 5; })
                    .style("fill", function(d) { return c(d.items.length); })
                    .on("mouseover", mouseover)
                    .on("mouseout", mouseout);

            }

            function mouseover(cell) {
                var itemCount = cell.items.length,
                    degree = gridData[cell.rowIndex].degree,
                    text = "",
                    circleSize = parseFloat(d3.select(this).attr("r")),
                    xPos = parseFloat(d3.select(this).attr("cx")),
                    yPos = parseFloat(d3.select(this).attr("cy")) + (cell.rowIndex + 1) * x.rangeBand() + circleSize * 2;

                d3.selectAll(".row text").classed("active", function(d, i) { return i == cell.rowIndex; });
                d3.selectAll(".column text").classed("active", function(d, i) { return i == cell.colIndex; });

                if (degree > 0) {
                    text = "Items shared with " + degree + " other sets: " + itemCount + " items";
                } else {
                    text = "Unique items in this set: " + itemCount + " items";
                }

                //tooltips
                d3.select('#tooltip')
                    .style("left", xPos + "px")
                    .style("top", yPos + "px")
                    //.select('#value')
                    .text(text);

                d3.select('#tooltip')
                    .classed("hidden", false);

                console.log(text);
            }

            function mouseout() {
                d3.selectAll("text")
                    .classed("active", false);

                //tooltip
                d3.select('#tooltip')
                    .classed("hidden", true);
            }

        },
        draw: function(gridData) {
            var width = 300,
                height = 300,
                colspan = 5,
                //rw = 95,
                //rh = 95;
                colWidth = calcColWidth(gridData, width),
                colHeight = calcColWidth(gridData, width),
                circleRadius = 25;

            function calcColWidth(gridData, containerWidth) {
                if (gridData && gridData[0]) {
                    var firstRow = gridData[0],
                        cols = firstRow.cells.length,
                        emptySpace = (cols - 1) * colspan;

                    return (containerWidth - emptySpace) / cols;
                } else {
                    console.log("gridData does not contain any rows");
                }
                return null;
            }

            var svg =  d3.select("#main")
                            .append("svg")
                            .attr("width", width)
                            .attr("height", height);

            var logscale = d3.scale.log()
                .range([0,1])
                .domain([1,3]);

            var colorscale = d3.scale.linear()
                .domain([0, 1])
                .range(['#FFF7FB', '#023858']);

            var ramp = d3.scale.linear()
                .domain([0, 3])
                .range(['#FFF7FB', '#023858']);

            //create rows (groups)
            var grp = svg.selectAll('g')
                .data(gridData)
                .enter()
                .append('g')
                .attr('transform', function(d, i) {
                    return 'translate(0, ' + (colHeight + colspan) * i + ')';
                })
                .attr('class', 'row');

            //create cols
            grp.selectAll('rect')
                .data(function(d) { return d.cells; })
                .enter()
                .append('rect')
                    .attr({
                        'x': function(d, i) { return (colWidth + colspan) * i; },
                        'width': colWidth,
                        'height': colHeight,
                        'style': 'fill:rgb(234,234,234);'
                    });

            //create circles
            grp.selectAll('circle')
                .data(function(d) { return d.cells; })
                .enter()
                .append('circle')
                    .attr({
                        'cx': function(d, i) { console.log("d ", d, "i ", i); return (colWidth + colspan) * i + colWidth/2; },
                        'cy': colHeight / 2,
                        'r': circleRadius,
                        'style': function(d) {
                            //return 'fill:' + colorscale(logscale(d.items.length));
                            return 'fill:' + ramp(d.items.length);
                        }
                    });
        }
    };

    function Converter() {
        /*
        this.data = {
            sets: [],
            subsets: []
        };
        */

        this.datGrid = undefined;
    }

    Converter.prototype = {
        initializeDataSet: function(setDescriptionUrl, callback) {
            var self = this;
            if (setDescriptionUrl) {
                $.ajax({ url: setDescriptionUrl, dataType: 'json', success: onDescriptionLoaded })
            }

            function onDescriptionLoaded(setDescriptor) {
                self.processDataSet(setDescriptor, function(sets, subsets) {
                    if (callback) {
                        callback.call(this, sets, subsets);
                    }
                });
            }
        },
        processDataSet: function(setDescriptor, callback) {
            var self = this;
            d3.text(setDescriptor.file, "text/csv", function(data) {
                self.parseDataSet(data, setDescriptor);
                if (callback) {
                    callback(self.dataGrid);
                }
            });
        },
        parseDataSet: function(data, setDescriptor) {
            var dsv = d3.dsv(setDescriptor.separator, "text/plain"),
                file = dsv.parseRows(data),
                header = file[setDescriptor.header],
                headerData = header.slice(setDescriptor.set.start, setDescriptor.set.end + 1),
                helpers = {
                    computeDegrees: function(matrix) {
                        var colDegrees = [],
                            rowDegrees = [];

                        for (var row = 0, rowLen = matrix.length; row < rowLen; row++) {
                            var row_degree = matrix[row].reduce(add, 0);
                            rowDegrees.push(row_degree);

                            for (var col = 0, colLen = matrix[row].length; col < colLen; col++) {
                                var cellValue = matrix[row][col];
                                if (colDegrees[col] !== undefined) {
                                    colDegrees[col] += cellValue;
                                } else {
                                    colDegrees[col] = cellValue;
                                }
                            }
                        }

                        //console.log("rowDegrees ", rowDegrees, "colDegrees ", colDegrees);

                        function add(a, b) {
                            return a + b;
                        }

                        return {
                            col: colDegrees,
                            row: rowDegrees
                        }
                    }
                };

            //remove header from file
            file.splice(setDescriptor.header, 1);

            var matrix = file.map(function(row, rowIndex) {
                return row.map(function(col, colIndex) {
                    if (colIndex >= setDescriptor.set.start && colIndex <= setDescriptor.set.end) {
                        var intValue = parseInt(col, 10);

                        if (isNaN(intValue)) {
                            console.error('Unable to convert "' + value + '" to integer (row ' + rowIndex + ', column ' + columnIndex + ')');
                        }

                        return intValue;
                    } else {
                        //TODO: this has to be configurable -> now the first col will be used as set name
                        if (colIndex == 0) {
                            vis.settings.axisNames.x.push(col);
                        }
                    }

                    return null;
                }).filter(function(val) {
                    return val !== null;
                });
            });

            var degrees = helpers.computeDegrees(matrix);

            //console.log("degrees ", degrees);

            /***** STABLE TIL HERE *****/

            this.dataGrid = createGrid(matrix);

            function createGrid(matrix) {

                function Header(items) {
                    this.items  = items;
                }

                function DegreeRow(initializer) {
                    this.degree = initializer.degree;
                    this.cells = [];
                }

                function Cell(rowIndex, colIndex) {
                    this.rowIndex = rowIndex;
                    this.colIndex = colIndex;
                    this.items = [];
                }

                /*
                for (var i = 0, len = matrix.length, degreeRow = undefined; i < len; i++) {
                    degreeRow = new DegreeRow({ degree: i });

                    for (var j = 0; j < matrix.length; j++) {
                        degreeRow.cells.push(new Cell(i, j));
                    }

                    grid.push(degreeRow);
                }
                */

                var grid = matrix.map(function(row, rowIndex) {
                    var degreeRow = new DegreeRow({ degree: rowIndex });
                    return degreeRow;
                });

                //console.log("grid ", grid);

                grid = grid.map(function(gridRow, rowIndex) {
                    for (var i = 0, len = matrix.length, cell, degreeValue, cellItems; i < len; i++) {
                        cell = new Cell(rowIndex, i);
                        degreeValue = rowIndex + 1;
                        cellItems = getItems(matrix[i], degrees.col, headerData, degreeValue);
                        cell.items = cellItems;
                        gridRow.cells.push(cell);
                    }
                    return gridRow;
                });

                function getItems(row, degreeList, headerData, degreeValue) {
                    var result = [],
                        item = undefined;

                    //faster than for loop
                    /*
                    var i = row.length;
                    do {
                        if (row[i] == 1 && degreeList[i] == degreeValue) {
                            item = headerData[i];
                            result.push(item);
                        }
                    } while (--i);
                    */

                    for (var i = 0, len = row.length; i < len; i++) {
                        if (row[i] == 1 && degreeList[i] == degreeValue) {
                            item = headerData[i];
                            //result++;
                            result.push(item);
                        }
                    }

                    return result;

                }

                console.log("completed grid computation");

                return grid;

            }

            //console.log("header ", header);

            //console.log("headerData ", headerData);

            //console.log("matrix ", matrix);

            //console.log("grid ", grid);

        }
    };

    function Set(setId) {
        this.setId = setId;
        this.elements = [];
        this.attributes = {};
        this.size = 0;
    }

    Set.prototype = {
        addElement: function(element) {
            this.elements.push(element);
            this.size++;
        },
        addAttribute: function(attrName, attrVal) {
            this.attributes[attrName] = attrVal;
        }
    };

    function SubSet(id) {
        this.id = id;
        this.elements = [];
        this.size = 0;
    }

    SubSet.prototype = {
        addElement: function(element) {
            this.elements.push(element);
            this.size++;
        }
    };

    return vis;

})(SetVis || {});