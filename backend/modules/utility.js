module.exports = {
  initBins: function(data, k) {
    var elements_per_degree = this.getElementsPerDegree(data),
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

    console.log("bins initialized");

    return result;
  },
  classifyBinData: function(data) {

    //reset bin data first
    data.bins.data = [];

    var gridData = this.transpose(data.fullGrid);
    for (var i = 0; i < data.bins.k; i++) {
      var counter = data.bins.ranges[i].start;
      while (counter <= data.bins.ranges[i].end) {
        if (typeof data.bins.data[i] === "undefined") {
          data.bins.data[i] = [];
        }
        data.bins.data[i].push(gridData[counter]);
        counter++;
      }
    }
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
  transpose: function(a) {
    return Object.keys(a[0]).map(
      function (c) { return a.map(function (r) { return r[c]; }); }
    );
  }
}