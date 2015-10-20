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
      console.time("parseFile");

      console.time("radSetAlgo");

      var setCount = setDescription.set.end - setDescription.set.start + 1,
        header = [],
        headerIdxAndCatIdx = [],
        id = 0,
        reducedFile = [];

      //TODO: change size of array to file.length if file doesn't include a header
      //using length - 1 here because first row is header and we don't want to include it
      var degreeVector = Array.apply(null, new Array(file.length - 1)).map(Number.prototype.valueOf, 0);

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
            if (i == 1) {
              console.log("new Element ", element);
            }
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

              if (i == 1) {
                console.log("element ", element);
              }

              //TODO: change "i - 1" according to file length (has header or not)
              //using i-1 here because first row is header
              degreeVector[i - 1] = degreeVector[i - 1] + parseInt(col);
              gridRow.push(parseInt(col));

            //if not within range of set data, then just add it as an element attribute
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

      console.log("this.data.elements[0] ", JSON.parse(JSON.stringify(this.data.elements[0])));

      console.timeEnd("radSetAlgo");

      var maxDegree = Math.max.apply(null, degreeVector);

      this.data.degreeVector = degreeVector;
      this.data.maxDegree = maxDegree;

      //create grid and fullGrid
      this.data.grid = this.createGrid(reducedFile, degreeVector, maxDegree, setCount);
      //this.data.fullGrid = this.createFullGrid();

      console.timeEnd("parseFile");

      return this.data;
    },
    //creates a grid of rows x cols where all cols are filled with 0
    initGrid: function(rows, cols) {
      return Array.apply(null, new Array(rows)).map(function() {
        return Array.apply(null, new Array(cols)).map(Number.prototype.valueOf,0);
      });
    },
    //initialize grid and populate with values
    createGrid: function(csv, degreeVector, rows, cols) {
      console.time("createGrid");

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

      console.timeEnd("createGrid");

      return grid;
    },
    //this will create the full create where each cell contains an array of elements instead of an int value only
    createFullGrid: function() {
      console.time("createFullGrid");

      var result = [],
        row = [],
        setName = "",
        degree = 0,
        subset = undefined,
        re = undefined,
        match = false;

      //console.log("this.data.elements[5] ", this.data.elements[5]);

      for (var i = 0, len = this.data.sets.length; i < len; i++) {
        row = [];
        setName = this.data.sets[i].name;
        re = new RegExp("\\b("+setName+")\\b", "g"); //regex for matching the exact set name in the string returned by getSets()

        for (var j = 0; j < this.data.maxDegree; j++) {
          degree = j + 1;
          subset = new SubSet(setName, degree);

          /*
           * slower than another for loop
           *
          subset.elements = this.data.elements.filter(function(d, i) {
            return d.getSets().split(",").indexOf(setName) != -1 && d.degree == degree;
          });
          */

          //for (var k = 0, l = this.data.elements.length; k < l; k++) {
          for (var k = this.data.elements.length; k--;) {

            //using regex is much faster than split + indexOf
            match = this.data.elements[k].getSets().match(re);

            if (match && this.data.elements[k].degree == degree) {
              //console.log("fullGrid match :: pushing this.data.elements[k] ", this.data.elements[k]);
              subset.elements.push(this.data.elements[k]);
            }

          }

          subset.count = subset.elements.length;
          row.push(subset);
        }
        result.push(row);
      }

      //console.log("fullGrid :: ", result);
      console.timeEnd("createFullGrid");

      return result;
    }
  };

  module.exports = {
    Parser: Parser
  };
})();