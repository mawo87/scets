var scats = (function(vis) {

	vis.helpers = {
		/*
		 * calculates the intersection of two arrays a and b
		 */
		intersect: function(a, b) {
			var t;
			if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
			return a.filter(function (e) {
				if (b.indexOf(e) !== -1) return true;
			});
		},
		/*
		 * creates an array of length n, starting from 0 to n
		 */
		createZeroToNArray: function(n) {
			return Array.apply(null, {length: n}).map(Number.call, Number);
		},
		createNumbersArray: function(from, to) {
			var result = [];
			for (var i = from; i <= to; i++) {
				result.push(i);
			}
			return result;
		},
		/*
		 * splits array into chunks of size n
		 * see: http://stackoverflow.com/questions/8495687/split-array-into-chunks/10456644#10456644
		 */
		chunk: function(arr, chunk_size) {
			var groups = arr.map( function(e, i) {
				return i % chunk_size === 0 ? arr.slice(i , i + chunk_size) : null;
			}).filter(function(e) { return e; });
			return groups;
		},
		getElementsGroupedBySetAndDegree: function (subset) {
			var elements = subset.elements,
				set_occurrence_map = {};

			for (var i = 0, len = elements.length; i < len; i++) {
				var el = elements[i];
				for (var j = 0, l = el.sets.length; j < l; j++) {
					var set_name = el.sets[j];
					if (typeof set_occurrence_map[set_name] === "undefined") {
						set_occurrence_map[set_name] = { set: set_name, count: 1 };
					} else {
						set_occurrence_map[set_name].count++;
					}

					if (typeof set_occurrence_map[set_name][el.degree] === "undefined") {
						set_occurrence_map[set_name][el.degree] = { degree: el.degree, count: 1 };
					} else {
						set_occurrence_map[set_name][el.degree].count ++;
					}
				}
			}

			return set_occurrence_map;
		},
		getElementsPerDegree: function(arr) {
			var result = [],
				maxEntriesCount = 0,
				sum;

			for (var i = 0, len = arr.length; i < len; i++) {
				sum = 0;
				for (var j = 0, l = arr[i].length; j < l; j++) {
					sum += arr[i][j];
				}

				if (sum > maxEntriesCount) {
					maxEntriesCount = sum;
				}

				result.push(sum);
			}

			return {
				getList: function() { return result; },
				getMaxEntriesCount: function() { return maxEntriesCount; }
			};
		},
		/* swaps rows and cols in a matrix a */
		transpose: function(a) {
			return Object.keys(a[0]).map(
				function (c) { return a.map(function (r) { return r[c]; }); }
			);
		},
		/* calculates the percentage of the colored circle segment for a selected subset and a given neighboring element */
		calcSegmentPercentage: function(subset, neighbor) {
			var subset_elements = subset.elements.map(function(el) { return el.name; }),
				neighbor_elements = neighbor.elements.map(function(el) { return el.name; }),
				intersection = vis.helpers.intersect(subset_elements, neighbor_elements);

			return intersection.length / neighbor_elements.length;
		},
		initBins: function(data, k) {
			var elements_per_degree = vis.helpers.getElementsPerDegree(data),
				H = elements_per_degree.getList(), //histogram data
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
						if (result[i][x].getTotalElements() > vis.data.max) {
							vis.data.max = result[i][x].getTotalElements();
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
			return vis.helpers.arrayUnique(result).sort(function(a, b) { return a-b; });
		},
		arrayUnique: function(array) {
			var a = array.concat();
			for(var i=0; i<a.length; ++i) {
				for(var j=i+1; j<a.length; ++j) {
					if(a[i] === a[j]) {
						a.splice(j--, 1);
					}
				}
			}

			return a;
		},
		updateBinRanges: function(ranges) {
			if (ranges && ranges.length > 0) {
				vis.data.bins.ranges = ranges;
			}
		}
	};

	return vis;

})(scats || {});