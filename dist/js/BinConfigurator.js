var scets = (function(vis) {

	/**
	 * @class BinConfigurator
	 * @classDesc The BinConfigurator component allows users to change the default bin settings
	 * @memberOf scets
	 *
	 * @property {string} container - The container where the binning view will be rendered in
	 * @property {array} bins - An array of bins.
	 * @property {function} onSaveCallback - A callback function getting executed when the save button is clicked
	 * @property {object} templates - The separate template pieces to be rendered
	 * @params {object} initializer - A settings object
	 */
  function BinConfigurator(initializer) {
    this.container = initializer.container;
    this.bins = initializer.bins;
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

		/**
		 * Initializes the BinConfigruator:<br/>
		 * - creates ranges for all bins<br/>
		 * - creates a save button<br/>
		 * - attaches event handlers<br/>
		 *
		 * @memberOf scets.BinConfigurator
		 * @method init
		 */
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
		/**
		 * Adds a new row to the configurator
		 *
		 * @memberOf scets.BinConfigurator
		 * @method appendBinRow
		 * @param {int} index - The index of the bin
		 * @param {object} bin - The bin object to be added
		 */
    appendBinRow: function(index, bin) {
      $(this.container).find('#binForm').append(this.templates.binRow.call(this, index, bin.start, bin.end));
    },
		/**
		 * Attaches click handler to the form elements.
		 *
		 * @memberOf scets.BinConfigurator
		 * @method attachEventHandler
		 */
    attachEventHandler: function() {
      var self = this;

	    //input for k
	    $(this.container).find('.bin-count').on('change', function() {
		    if (parseInt($(this).val()) !== self.bins.k) {
					self.bins.k = parseInt($(this).val());
			    self.bins.ranges = [];
					self.bins.ranges = vis.helpers.initBins(vis.data.grid, self.bins.k);
			    self.redrawBinRanges();
		    }
	    });

	    //save button
      $(this.container).find('#saveBtn').on("click", function() {
				var ranges = [];

				console.log("save button clicked");

				self.removeErrors();

				$(self.container).find('.bin-range').each(function(k, v) {
					var start = parseInt($(this).find('input.bin-start').val()) - 1,
						end = parseInt($(this).find('input.bin-end').val()) - 1;

					ranges.push({ start: start, end: end });
				});

				var errors = self.validate(ranges);

				if (errors.length > 0) {
					self.showErrors(errors);
					return;
				}

				//update bin ranges
				self.updateBinRanges(ranges);

				//update number of bins
				vis.data.bins.k = $(self.container).find('.bin-range').length;
				vis.helpers.classifyBinData();

				console.log("ranges ", ranges);

				if (self.onSaveCallback) {
					self.onSaveCallback.call(self);
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
    },
		/**
		 * Removes all existing ranges and appends a new row in the form for each bin range.
		 *
		 * @memberOf scets.BinConfigurator
		 * @method redrawBinRanges
		 */
		redrawBinRanges: function () {
			$(this.container).find('#binForm')
				.empty();

			for (var i = 0; i < this.bins.ranges.length; i++) {
				this.appendBinRow(i, this.bins.ranges[i]);
			}
		},
		/**
		 * @method
		 * @name updateBinRanges
		 * @description Updates the bin ranges of the global vis.data.bins.ranges object.
		 * @memberOf scets.BinConfigurator
		 * @param {array} ranges - The ranges array.
		 */
		updateBinRanges: function(ranges) {
			if (ranges && ranges.length > 0) {
				vis.data.bins.ranges = ranges;
			}
		},
		validate: function(ranges) {
			var errors = [],
				errorText = [
					"'From' cannot be greater than 'to' index.",
					"Overlapping bin ranges are not allowed ('from' has to be greater than previous 'start' index)",
					"Overlapping bin ranges are not allowed ('to' has to be greater than previous 'to' index)."
				];
			_.each(ranges, function(range, idx) {
				console.log("range :: ", range, idx);

				if (range.start > range.end) {
					errors.push({ text: errorText[0] });
				}

				//check start and end values
				_.each(ranges, function(r, i) {
					if (idx > i && range.start <= r.start) {
						errors.push({ text: errorText[1] });
					} else if (idx > i && range.end <= r.end) {
						errors.push({ text: errorText[2] });
					}
				});
			});

			return errors;
		},
		showErrors: function(errors) {
			var $errorDiv = $("<div class='alert alert-danger error-container'><strong>Error</strong>:" + errors[0].text + "</div>");
			$errorDiv.insertBefore("#saveBtn");
		},
		removeErrors: function() {
			$(this.container).find(".error-container").remove();
		}
  };

	/*
  function Bin() {

  }
  */

  vis.BinConfigurator = BinConfigurator;

  return vis;

})(scets || {});