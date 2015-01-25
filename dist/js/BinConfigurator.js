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
      "binRow": function(binIndex, startIdx, endIdx) {
        return '<div class="bin-range">' +
          '<span class="">' + (binIndex + 1) + '</span>' +
          '<input class="bin-start" type="text" value="' + (startIdx + 1) + '"/>' +
          '<input class="bin-end" type="text" value="' + (endIdx + 1) + '">' +
          '</div>';
      }
    };
  }

  BinConfigurator.prototype = {
    init: function() {
      var binRanges = createBinRanges(this.bins);

      function createBinRanges(bins) {
        var result = [];
        for (var i = 0, len = bins.start.length, range; i < len; i++) {
          range = {};
          range.start = bins.start[i];
          range.end = bins.end[i];
          result.push(range);
        }
        return result;
      }

      console.log("binRanges ", binRanges);

      $(this.container).append("<strong>TODO: add bin size (k)</strong>");

      for (var i = 0; i < binRanges.length; i++) {
        this.appendBinRow(i, binRanges[i]);
      }

      //save and cancel buttons
      $(this.container).append("<button class='btn btn-primary btn-sm' id='saveBtn'>Save Changes</button><button class='btn btn-sm btn-default' id='resetBtn'>Reset</button>");

      //attach handler
      this.attachEventHandler();
    },
    appendBinRow: function(index, bin) {
      $(this.container).append(this.templates.binRow.call(this, index, bin.start, bin.end));
    },
    attachEventHandler: function() {
      var self = this;

      $(this.container).find('#saveBtn').on("click", function() {
        var startArr = [],
            endArr = [];

        console.log("save button clicked");

        $(self.container).find('.bin-range').each(function(k, v) {
          var start = parseInt($(this).find('input.bin-start').val()) - 1,
              end = parseInt($(this).find('input.bin-end').val()) - 1;

          startArr.push(start);
          endArr.push(end);
        });

        //update bin ranges
        vis.helpers.updateBinRanges(startArr, endArr);

        //update number of bins
        vis.data.bins.k = $(self.container).find('.bin-range').length;
        vis.helpers.classifyBinData();

        console.log("startArr ", startArr, "endArr ", endArr);

        if (self.onSaveCallback) {
          self.onSaveCallback.call(this);
        }

        //close modal window
        $('#binningViewModal').modal('hide');

      });

      $(this.container).find('#resetBtn').on("click", function() {
        //reset to default values
        
      });
    }
  };

  function Bin() {

  }

  vis.BinConfigurator = BinConfigurator;

  return vis;

})(SetVis || {});