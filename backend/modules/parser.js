(function() {

  function Element(id, name) {
    this.id = id;
    this.name = name;
    this.sets = [];
    this.degree = -1;
    this.getSets = function () {
      return this.sets.join(",");
    };
  }

  function Set(name) {
    this.name = name;
    this.count = 0;
  }

  function SubSet(set_name, degree) {
    this.set_name = set_name;
    this.degree = degree;
    this.elements = [];
    this.count = 0;
  }

  function Parser() {
    this.data = {
      sets: [],
      elements: [],
      grid: [],
      fullGrid: [],
      degreeVector: [],
      max: 0,
      min: 0,
      maxDegree: 0
    };
  }

  Parser.prototype = {
    parseFile: function(file, setDescription) {
      var radSetAlgoResult = this.radSetAlgo(file, setDescription),
        reducedFile = radSetAlgoResult.reducedFile,
        degreeVector = radSetAlgoResult.degreeVector,
        setCount = setDescription.set.end - setDescription.set.start + 1;

      /* deprecated */
      /*
      //remove header from file
      file.splice(setDescription.header, 1);

      //create degree vector of length n (number of rows in file) and fill up with 0
      var degreeVector = Array.apply(null, new Array(file.length)).map(Number.prototype.valueOf, 0),
        setCount = setDescription.set.end - setDescription.set.start + 1;

      var reducedFile = file.map(function(row, rowIndex) {
        return row.map(function(col, colIndex) {
          if (colIndex >= setDescription.set.start && colIndex <= setDescription.set.end) {
            var intValue = parseInt(col, 10);

            if (isNaN(intValue)) {
              console.error('Unable to convert "' + col + '" to integer (row ' + rowIndex + ', column ' + colIndex + ')');
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
      */

      //console.log("degreeVector parseFile :: ", degreeVector);
      //console.log("reducedFile :: ", reducedFile);

      var maxDegree = Math.max.apply(null, degreeVector);

      this.data.degreeVector = degreeVector;
      this.data.maxDegree = maxDegree;

      //create grid and fullGrid
      this.data.grid = this.createGrid(reducedFile, degreeVector, maxDegree, setCount);
      this.data.fullGrid = this.createFullGrid();

      return this.data;
    },
    radSetAlgo: function(file, setDescription) {
      var header = [],
        headerIdxAndCatIdx = [],
        id = 0;

      //TODO: change size of array to file.length if file doesn't include a header
      var degreeVector = Array.apply(null, new Array(file.length - 1)).map(Number.prototype.valueOf, 0);

      var reducedFile = [];

      for (var i = 0, len = file.length; i < len; i++) {
        var row = file[i],
          element = null,
          gridRow = [];

        for (var j = 0, l = row.length; j < l; j++) {
          var col = row[j];

          //header
          if (i === 0) {
            header.push(col);
          }

          //new set
          if (i === 0 && j !== 0 ) {
            if (j >= setDescription.set.start && j <= setDescription.set.end) {
              var set = new Set(col);
              this.data.sets.push(set);
              headerIdxAndCatIdx[j] = this.data.sets.length - 1;
            }
          } else if (i !== 0 && j === 0) {
            id = this.data.elements.length;
            element = new Element(id, col);
          } else if (i !== 0 && j !== 0) {
            var head = header[j];
            if (j >= setDescription.set.start && j <= setDescription.set.end) {
              if (col === "1") {
                var catIndex = headerIdxAndCatIdx[j];
                if (catIndex !== undefined) {
                  var cat = this.data.sets[catIndex];
                  element.sets.push(cat.name);
                  this.data.sets[catIndex].count += 1;
                }
              }

              //TODO: change "i - 1" according to file length (has header or not)
              degreeVector[i - 1] = degreeVector[i - 1] + parseInt(col);
              gridRow.push(parseInt(col));

            } else {
              element[head] = col;
            }
          }
        }

        if (element !== null) {
          element.degree = element.sets.length;
          if (element.degree > 0) {
            this.data.elements.push(element);
          }
        }

        if (i !== 0) {
          reducedFile.push(gridRow);
        }

      }

      //console.log("radSetAlgo :: result ", result);
      //console.log("degreeVector radSetAlgo :: ", degreeVector);

      return {
        reducedFile: reducedFile,
        degreeVector: degreeVector
      };

    },
    //creates a grid of rows x cols where all cols are filled with 0
    initGrid: function(rows, cols) {
      return Array.apply(null, new Array(rows)).map(function() {
        return Array.apply(null, new Array(cols)).map(Number.prototype.valueOf,0);
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
            if (grid[degree - 1][j] > this.data.max) {
              this.data.max = grid[degree - 1][j];
            }

            if (grid[degree - 1][j] < this.data.min) {
              this.data.min = grid[degree - 1][j];
            }
          }
        }
      }

      return grid;
    },
    //this will create the full create where each cell contains an array of elements instead of an int value only
    createFullGrid: function() {
      var result = [],
        setName = "",
        degree = 0,
        subset = undefined;

      for (var i = 0, len = this.data.sets.length; i < len; i++) {
        var row = [];
        setName = this.data.sets[i].name;
        for (var j = 0; j < this.data.maxDegree; j++) {
          degree = j + 1;
          subset = new SubSet(setName, degree);
          subset.elements = this.data.elements.filter(function(d, i) {
            return d.getSets().split(",").indexOf(setName) != -1 && d.degree == degree;
          });
          subset.count = subset.elements.length;
          row.push(subset);
        }
        result.push(row);
      }

      return result;
    }
  };

  module.exports = {
    Parser: Parser
  };
})();