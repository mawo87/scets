/**
 * Created by martinwortschack on 05/11/14.
 */
var SetVis = (function(vis) {

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
		initBins: function() {
			var elements_per_degree = vis.helpers.getElementsPerDegree(vis.data.grid),
				H = elements_per_degree.getList(), //histogram data
				n = H.reduce(function(a, b) { return a + b; }), //total number of elements across all degrees
				b = vis.data.maxDegree, //max degree in histogram data
				ind = 0,
				leftElements = n,
				binSize,
				s;

			//console.log("H ", H, "n ", n , "b ", b);

			for (var bin = 0; bin < vis.data.bins.k; bin++) {
				vis.data.bins.ranges[bin] = {};
				vis.data.bins.ranges[bin].start = ind;
				vis.data.bins.start[bin] = ind;
				binSize = H[ind];
				s = leftElements / (vis.data.bins.k - bin);
				while ((ind < n - 1) && (binSize + H[ind + 1] <= s)) {
					ind++;
					binSize += H[ind];
				}
				vis.data.bins.end[bin] = ind;
				vis.data.bins.ranges[bin].end = ind;
				leftElements -= binSize;
				ind++;
			}

			vis.helpers.classifyBinData();

			console.log("bins initialized ", vis.data.bins);
		},
		classifyBinData: function() {
			var gridData = vis.helpers.transpose(vis.data.fullGrid);
			for (var i = 0; i < vis.data.bins.k; i++) {
				var counter = vis.data.bins.start[i];
				while (counter <= vis.data.bins.end[i]) {
					if (typeof vis.data.bins.data[i] === "undefined") {
						vis.data.bins.data[i] = [];
					}
					vis.data.bins.data[i].push(gridData[counter]);
					counter++;
				}
			}
		}
	};

	return vis;

})(SetVis || {});