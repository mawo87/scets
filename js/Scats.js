var SetVis = (function(my) {

    my.init = function() {
        new Scats().init();
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

            converter.initializeDataSet(config.dataset, function(grid) {
                self.draw(grid);
            });
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

                var grid = [];

                function Header(items) {
                    this.items  = items;
                }

                function DegreeRow(initializer) {
                    this.degree = initializer.degree;
                    this.cells = [];
                }

                function Cell(rowIndex, cellIndex) {
                    this.rowIndex = rowIndex;
                    this.cellIndex = cellIndex;
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

                grid = matrix.map(function(row, rowIndex) {
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
                    var i = row.length;
                    do {
                        if (row[i] == 1 && degreeList[i] == degreeValue) {
                            item = headerData[i];
                            result.push(item);
                        }
                    } while (--i);

                    /*
                    for (var i = 0, len = row.length; i < len; i++) {
                        if (row[i] == 1 && degreeList[i] == degreeValue) {
                            item = headerData[i];
                            //result++;
                            result.push(item);
                        }
                    }
                    */

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

    return my;

})(SetVis || {});