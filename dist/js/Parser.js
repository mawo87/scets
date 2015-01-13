/**
 * Created by martinwortschack on 04/11/14.
 */
var SetVis = (function(vis) {

	vis.data = {
		sets: [],
		elements: [],

		grid: [],
		fullGrid: [],
		degreeVector: [],
		max: 0,
		min: 0,
		maxDegree: 0
	};

	function Parser() {
		this.setDescription = undefined;
	}

	Parser.prototype = {
		helpers: {
			createSets: function(header, setDescription) {
				var result = [];
				for (var i = 0, len = header.length; i < len; i++) {
					if (i >= setDescription.set.start && i <= setDescription.set.end) {
						result.push(new vis.Set(header[i]));
					}
				}
				return result;
			},
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
			//this will create the full create where each cell contains an array of elements instead of an int value only
			createFullGrid: function() {
				var result = [],
					setName = "",
					degree = 0,
					subset = undefined;

				for (var i = 0, len = vis.data.sets.length; i < len; i++) {
					var row = [];
					setName = vis.data.sets[i].name;
					for (var j = 0; j < vis.data.maxDegree; j++) {
						degree = j + 1;
						subset = new vis.SubSet(setName, degree);
						subset.elements = vis.data.elements.filter(function(d, i) {
							return $.inArray(setName, d.getSets().split(",")) != -1 && d.degree == degree;
						});
						subset.count = subset.elements.length;
						row.push(subset);
					}
					result.push(row);
				}

				return result;
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

			//vis.data.sets = self.helpers.createSets(header, self.setDescription);

			radSetAlgo(file, this.setDescription);

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

			var maxDegree = Math.max.apply(null, degreeVector);

			vis.data.degreeVector = degreeVector;
			vis.data.maxDegree = maxDegree;

			//console.log("degreeVector ", degreeVector);
			//console.log("maxDegree ", maxDegree);
			//console.log("setCount ", setCount);

			//create grid and store in global variable making it accessible
			vis.data.grid = self.helpers.createGrid(reducedFile, degreeVector, maxDegree, setCount);

			vis.data.fullGrid = self.helpers.createFullGrid();

		}
	};

	function radSetAlgo(file, setDescription) {

		var header = [],
			headerIdxAndCatIdx = [],
			id = 0;

		for (var i = 0, len = file.length; i < len; i++) {
			var row = file[i],
				element = null;

			for (var j = 0, l = row.length; j < l; j++) {
				var col = row[j];

				//header
				if (i === 0) {
					header.push(col);
				}

				//new set
				if (i === 0 && j !== 0 ) {
					if (j >= setDescription.set.start && j <= setDescription.set.end) {
						var set = new vis.Set(col);
						vis.data.sets.push(set);
						headerIdxAndCatIdx[j] = vis.data.sets.length - 1;
					}
				} else if (i !== 0 && j === 0) {
					id = vis.data.elements.length;
					element = new vis.Element(id, col);
				} else if (i !== 0 && j !== 0) {
					var head = header[j];
					if (j >= setDescription.set.start && j <= setDescription.set.end) {
						if (col === "1") {
							var catIndex = headerIdxAndCatIdx[j];
							if (catIndex !== undefined) {
								var cat = vis.data.sets[catIndex];
								element.sets.push(cat.name);
								vis.data.sets[catIndex].count += 1;
							}
						}
					} else {
						element[head] = col;
					}
				}
			}
			if (element !== null) {
				element.degree = element.sets.length;
				if (element.degree > 0) {
					vis.data.elements.push(element);
				}
			}
		}
	}

	vis.Parser = Parser;

	return vis;

})(SetVis || {});