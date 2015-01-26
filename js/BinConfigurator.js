/**
 * Created by martinwortschack on 13.01.15.
 */
var SetVis = (function(vis) {
  function BinConfigurator(initializer) {
    this.container = initializer.container;
    this.bins = initializer.bins;
    this.defaults = this.defaults || initializer.bins;
    this.onSaveCallback = initializer.onSaveCallback;
    this.templates = {
	    "totalBins": function(k) {
		    return '<div class="form-horizontal">' +
			    '<div class="form-group">' +
			      '<label class="col-md-5 control-label">Number of bins:</label>' +
			      '<div class="col-md-2">' +
			        '<input type="text" class="bin-count form-control" value="' + k + '"/>' +
			      '</div>' +
			    '</div>' +
		    '</div>';
	    },
	    "form": function() {
		    return '<div class="row">' +
			    '<div class="col-md-1"><label class="control-label">Bin</label></div>' +
			    '<div class="col-md-3"><label class="control-label">From</label></div>' +
			    '<div class="col-md-3"><label class="control-label">To</label></div>' +
		    '</div>' +
		    '<form class="form-horizontal" id="binForm"></form>';
	    },
      "binRow": function(binIndex, startIdx, endIdx) {
        return '<div class="form-group bin-range">' +
	        '<label class="col-md-1 control-label">' + (binIndex + 1) + '</label>' +
          '<div class="col-md-3">' +
            '<input class="bin-start form-control" type="text" value="' + (startIdx + 1) + '"/>' +
          '</div>' +
          '<div class="col-md-3">' +
            '<input class="bin-end form-control" type="text" value="' + (endIdx + 1) + '">' +
          '</div>' +
        '</div>';
      }
    };
  }

  BinConfigurator.prototype = {
    init: function() {

	    //append input for number of bins (k)
      $(this.container).append(this.templates.totalBins(this.bins.k));

	    //append input ranges for bins
	    $(this.container).append(this.templates.form());
      for (var i = 0; i < this.bins.ranges.length; i++) {
        this.appendBinRow(i, this.bins.ranges[i]);
      }

      //save and cancel buttons
      //$(this.container).append("<button class='btn btn-primary btn-sm' id='saveBtn'>Save Changes</button><button class='btn btn-sm btn-default' id='resetBtn'>Reset</button>");
	    $(this.container).append("<button class='btn btn-primary btn-sm' id='saveBtn'>Save Changes</button>");

      //attach handler
      this.attachEventHandler();
    },
    appendBinRow: function(index, bin) {
      $(this.container).find('#binForm').append(this.templates.binRow.call(this, index, bin.start, bin.end));
    },
    attachEventHandler: function() {
      var self = this;

	    //input for k
	    $(this.container).find('.bin-count').on('change', function() {
		    if (parseInt($(this).val()) !== self.bins.k) {
					self.bins.k = parseInt($(this).val());
			    self.bins.ranges = [];
			    initBins();
			    redrawBinRanges();
		    }
	    });

	    function initBins() {
		    var elements_per_degree = vis.helpers.getElementsPerDegree(vis.data.grid),
			    H = elements_per_degree.getList(), //histogram data
			    n = H.reduce(function(a, b) { return a + b; }), //total number of elements across all degrees
			    ind = 0,
			    leftElements = n,
			    binSize,
			    s;

		    //console.log("H ", H, "n ", n , "b ", b);

		    for (var bin = 0; bin < self.bins.k; bin++) {
			    self.bins.ranges[bin] = {};
			    self.bins.ranges[bin].start = ind;
			    binSize = H[ind];
			    s = leftElements / (self.bins.k - bin);
			    while ((ind < n - 1) && (binSize + H[ind + 1] <= s)) {
				    ind++;
				    binSize += H[ind];
			    }
			    self.bins.ranges[bin].end = ind;
			    leftElements -= binSize;
			    ind++;
		    }
	    }

	    function redrawBinRanges() {
		    $(self.container).find('#binForm')
			    .empty();

		    for (var i = 0; i < self.bins.ranges.length; i++) {
			    self.appendBinRow(i, self.bins.ranges[i]);
		    }
	    }

	    //save button
      $(this.container).find('#saveBtn').on("click", function() {
        var ranges = [];

        console.log("save button clicked");

        $(self.container).find('.bin-range').each(function(k, v) {
          var start = parseInt($(this).find('input.bin-start').val()) - 1,
              end = parseInt($(this).find('input.bin-end').val()) - 1;

	        ranges.push({ start: start, end: end });
        });

        //update bin ranges
        vis.helpers.updateBinRanges(ranges);

        //update number of bins
        vis.data.bins.k = $(self.container).find('.bin-range').length;
        vis.helpers.classifyBinData();

        console.log("ranges ", ranges);

        if (self.onSaveCallback) {
          self.onSaveCallback.call(this);
        }

        //close modal window
        $('#binningViewModal').modal('hide');

      });

	    //reset button
	    /*
      $(this.container).find('#resetBtn').on("click", function() {
        //reset to default values
        
      });
      */
    }
  };

  function Bin() {

  }

  vis.BinConfigurator = BinConfigurator;

  return vis;

})(SetVis || {});