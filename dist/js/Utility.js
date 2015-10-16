var scats = (function(vis) {


	/**
	 * @description A utility object providing common helper functions
	 * @memberOf scats
	 * @namespace scats.helpers
	 */
	vis.helpers = {
		/**
		 * @method
		 * @name intersect
		 * @description Calculates the intersection of two arrays a and b
		 * @memberOf scats.helpers
		 * @param {array} a - The first array.
		 * @param {array} b - The second array.
		 * @returns {array} - The intersection of array a and b.
		 */
		intersect: function(a, b) {
			var t;
			if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
			return a.filter(function (e) {
				if (b.indexOf(e) !== -1) return true;
			});
		},
		/**
		 * @method
		 * @name createZeroToNArray
		 * @description Creates an array of length n, starting from 0 to n.
		 * @memberOf scats.helpers
		 * @param {array} n - The length of the array array.
		 * @returns {array} - An array from 0 to n.
		 * @static
		 */
		createZeroToNArray: function(n) {
			return Array.apply(null, {length: n}).map(Number.call, Number);
		},
		/**
		 * @method
		 * @name createNumbersArray
		 * @description Creates an array of numbers from from to to.
		 * @memberOf scats.helpers
		 * @param {int} from - The starting value.
		 * @param {int} to - The end value.
		 * @returns {array} - An array from from to to.
		 */
		createNumbersArray: function(from, to) {
			var result = [];
			for (var i = from; i <= to; i++) {
				result.push(i);
			}
			return result;
		},
		/**
		 * @method
		 * @name chunk
		 * @description Splits array into chunks of size n. From: http://stackoverflow.com/questions/8495687/split-array-into-chunks/10456644#10456644
		 * @memberOf scats.helpers
		 * @param {array} arr - The array which has to be split.
		 * @param {int} chunk_size - The number of chunks the resulting array should contain.
		 * @returns {array} - A two-dimensional array, e.g., [[1,2,3],[4,5,6],[7,8,9],[10]]
		 */
		chunk: function(arr, chunk_size) {
			var groups = arr.map( function(e, i) {
				return i % chunk_size === 0 ? arr.slice(i , i + chunk_size) : null;
			}).filter(function(e) { return e; });
			return groups;
		},
		/**
		 * @method
		 * @name getElementsGroupedBySetAndDegree
		 * @description Creates a set occurrence map for the given subset
		 * @memberOf scats.helpers
		 * @param {array} elements - An array of elements.
		 * @returns {object} - An object of the following form: { set1: { "2" : { count: 1, degree: 2 }, count: 1, set: set1 } }
		 */
		getElementsGroupedBySetAndDegree: function (elements) {
			var set_occurrence_map = {};

			if (elements && elements.length > 0) {
				for (var i = 0, len = elements.length; i < len; i++) {
					var el = elements[i];
					for (var j = 0, l = el.sets.length; j < l; j++) {
						var set_name = el.sets[j];
						if (typeof set_occurrence_map[set_name] === "undefined") {
							set_occurrence_map[set_name] = { set: set_name, count: 1, degrees: {} };
						} else {
							set_occurrence_map[set_name].count++;
						}

						if (typeof set_occurrence_map[set_name]["degrees"][el.degree] === "undefined") {
							set_occurrence_map[set_name]["degrees"][el.degree] = { degree: el.degree, count: 1 };
						} else {
							set_occurrence_map[set_name]["degrees"][el.degree].count ++;
						}
					}
				}
			}

			return set_occurrence_map;
		},
		getElementsPerDegree: function(arr) {
			var result = [],
				sum;

			for (var i = 0, len = arr.length; i < len; i++) {
				sum = 0;
				for (var j = 0, l = arr[i].length; j < l; j++) {
					sum += arr[i][j];
				}

				result.push(sum);
			}

			return result;
		},
		/**
		 * @method
		 * @name transpose
		 * @description Creates the transposte of a matrix, i.e., it swaps rows and cols in a matrix
		 * @memberOf scats.helpers
		 * @param {array} a - The matrix.
		 * @returns {array} - Returns the input matrix with columns and rows swapped
		 */
		transpose: function(a) {
			return Object.keys(a[0]).map(
				function (c) { return a.map(function (r) { return r[c]; }); }
			);
		},
		/**
		 * @method calcIntersection
		 * @description calculates the intersection between a selected subset and a given neighboring element
		 * @memberOf scats.helpers
		 * @param currElements
		 * @param refElements
		 * @returns {number}
		 */
		calcIntersection: function(currElements, refElements) {
			var a = currElements.map(function(el) { return el.name; }),
				b = refElements.map(function(el) { return el.name; }),
				intersection = vis.helpers.intersect(a, b);

			return intersection;
		},
		/**
		 * @method calcSegmentPercentage
		 * @description calculates the percentage of the colored circle segment for a selected subset and a given neighboring element
		 * @memberOf scats.helpers
		 * @param currElements
		 * @param refElements
		 * @returns {number}
		 */
		calcSegmentPercentage: function(currElements, refElements) {
			var a = currElements.map(function(el) { return el.name; }),
				b = refElements.map(function(el) { return el.name; }),
				intersection = vis.helpers.intersect(a, b);

			/* deprecated */
			//return intersection.length / b.length;

			//return refElements.length / currElements.length;
			return intersection.length / a.length;
		},
		initBins: function(data, k) {
			var H = vis.helpers.getElementsPerDegree(data), //histogram data
				n = H.reduce(function(a, b) { return a + b; }), //total number of elements across all degrees
				//b = vis.data.maxDegree, //max degree in histogram data
				ind = 0,
				leftElements = n,
				binSize,
				s;

			var result = [];

			//console.log("H ", H, "n ", n , "b ", b);

			for (var bin = 0; bin < k; bin++) {
				result[bin] = {};
				result[bin].start = ind;
				binSize = H[ind];
				s = leftElements / (k - bin);
				while ((ind < n - 1) && (binSize + H[ind + 1] <= s)) {
					ind++;
					binSize += H[ind];
				}
				result[bin].end = ind;
				leftElements -= binSize;
				ind++;
			}

			console.log("bins initialized ", vis.data.bins);

			return result;
		},
		classifyBinData: function() {

			//reset bin data first
			vis.data.bins.data = [];

			var gridData = vis.helpers.transpose(vis.data.fullGrid);
			for (var i = 0; i < vis.data.bins.k; i++) {
				var counter = vis.data.bins.ranges[i].start;
				while (counter <= vis.data.bins.ranges[i].end) {
					if (typeof vis.data.bins.data[i] === "undefined") {
						vis.data.bins.data[i] = [];
					}
					vis.data.bins.data[i].push(gridData[counter]);
					counter++;
				}
			}
		},
		/* creates aggregate data for bins */
		createAggregatedData: function(data) {

			var gridData = vis.helpers.transpose(vis.data.fullGrid),
				result = d3.range(data.length).map(function(i) {
					return Array.apply(null, new Array(gridData[0].length)).map(function(d) {
						return new vis.Aggregate();
					});
				});

			console.log("data ", data);

			for (var i = 0, len = data.length, current_block; i < len; i++) {
				current_block = data[i];
				for (var j = 0, l = current_block.length; j < l; j++) {
					for (var x = 0, innerLength = current_block[j].length; x < innerLength; x++) {
						result[i][x].addSubset(current_block[j][x]);
						if (result[i][x].count > vis.data.max) {
							vis.data.max = result[i][x].count;
						}
					}
				}
			}

			vis.data.aggregates = result;

			return result;
		},
		/* creates a sorted array of unique values based on the elements and aggregates array */
		computeSortedValuesArray: function(elements, aggregates) {
			var result = elements.map(function(el) {
					return el.degree;
				});

			for (var i = 0, len = aggregates.length; i < len; i++) {
				for (var j = 0, l = aggregates[i].length; j < l; j++) {
					if (result.indexOf(aggregates[i][j].count) != -1) {
						result.push(aggregates[i][j].count);
					}
				}
			}

			//eliminate duplicates and sort ascending
			return _.uniq(result).sort(function(a, b) { return a - b; });
		},
		getSetIdFromName: function (setName) {
			var regex = /[\s,\.]/g;
			return setName.replace(regex, '');
		}
	};

	return vis;

})(scats || {});