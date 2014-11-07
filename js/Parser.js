/**
 * Created by martinwortschack on 04/11/14.
 */
var SetVis = (function(vis) {

    function Parser() {
        this.setDescription = undefined;
    }

    vis.data = {
        setNames: [],
        grid: [],
        degreeVector: [],
        max: 0,
        min: 0,
        magDegree: 0
    };

    Parser.prototype = {
        helpers: {
            //creates a grid of rows x cols where all cols are filled with 0
            initGrid: function(rows, cols) {
                return d3.range(rows).map(function(j) {
                    return Array.apply(null, new Array(cols)).map(Number.prototype.valueOf, 0);
                });
            },
            //initialize grid and populate with values
            createGrid: function(csv, degreeVector, rows, cols) {
                var grid = this.initGrid(rows, cols),
                    degree = undefined;

                for (var i = 0, rowLen = csv.length; i < rowLen; i++) {
                    for (var j = 0, colLen = csv[i].length; j < colLen; j++) {
                        if (csv[i][j] == 1) {
                            degree = degreeVector[i];
                            grid[degree - 1][j]++;

                            //set min and max
                            if (grid[degree - 1][j] > vis.data.max) {
                                vis.data.max = grid[degree - 1][j];
                            }

                            if (grid[degree - 1][j] < vis.data.min) {
                                vis.data.min = grid[degree - 1][j];
                            }
                        }
                    }
                }

                return grid;
            },
            transpose: function(a) {
                return a[0].map(function (_, c) { return a.map(function (r) { return r[c]; }); });
            }
        },
        loadSet: function(setDescriptionUrl) {
            var self = this,
                $deferred = $.Deferred();

            if (setDescriptionUrl) {
                $.ajax({
                    url: setDescriptionUrl,
                    dataType: 'json',
                    success: onDescriptionLoaded
                })
            } else {
                $deferred.reject({ success: false, error: "no description file given" });
            }

            function onDescriptionLoaded(setDescription) {
                self.setDescription = setDescription;
                console.log("setDescription ", setDescription);
                d3.text(setDescription.file, "text/csv", function(data) {
                    //self.parseDataSet(data, setDescription);
                    $deferred.resolve({ success: true, data: data });
                });
            }

            return $deferred.promise();
        },
        parseFile: function(rawFile) {
            var self = this,
                dsv = d3.dsv(self.setDescription.separator, "text/plain"),
                file = dsv.parseRows(rawFile),
                header = file[self.setDescription.header];

            vis.data.setNames = header.slice(self.setDescription.set.start, self.setDescription.set.end + 1);

            //remove header from file
            file.splice(self.setDescription.header, 1);

            //create degree vector of length n (number of rows in file) and fill up with 0
            var degreeVector = Array.apply(null, new Array(file.length)).map(Number.prototype.valueOf, 0),
                setCount = self.setDescription.set.end - self.setDescription.set.start + 1;

            var reducedFile = file.map(function(row, rowIndex) {
                return row.map(function(col, colIndex) {
                    if (colIndex >= self.setDescription.set.start && colIndex <= self.setDescription.set.end) {
                        var intValue = parseInt(col, 10);

                        if (isNaN(intValue)) {
                            console.error('Unable to convert "' + value + '" to integer (row ' + rowIndex + ', column ' + colIndex + ')');
                        } else {
                            //increase the degree as we iterate over the cols
                            degreeVector[rowIndex] = degreeVector[rowIndex] + intValue;
                        }

                        return intValue;
                    }

                    return null;
                }).filter(function(val) {
                    return val !== null;
                });
            });

            var maxDegree = Math.max.apply(null, degreeVector);

            vis.data.degreeVector = degreeVector;
            vis.data.maxDegree = maxDegree;

            console.log("degreeVector ", degreeVector);
            console.log("maxDegree ", maxDegree);
            console.log("setCount ", setCount);

            //create grid and store in global variable making it accessible
            vis.data.grid = self.helpers.createGrid(reducedFile, degreeVector, maxDegree, setCount);

        }
    };

    vis.Parser = Parser;

    return vis;

})(SetVis || {});