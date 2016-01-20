//just a test
.on("mouseover", function(d, i) {
  console.log("d ", d);
  var that = this;

  //delay mouseover event for 500ms
  delay = setTimeout(function() {
    console.log("TOOLTIP WIDTH :: ", self.tooltip.getWidth());

    var xPos = parseFloat($(that).offset().left) - (self.tooltip.getWidth()/2 + self.getTotalSetWidth()/2 - self.settings.subset.r/2),
      yPos = parseFloat($(that).offset().top) + 3 * self.settings.subset.r;

    //tooltip showing text and highlighted segment
    if (d3.select(that).classed("segment-tooltip")) {

      /* deprecated */
      //var segment_percentage = vis.helpers.calcSegmentPercentage(self.selectedSubset, d) * 100;

      /* deprecated */
      /*
       if (self.selectedSubset) {
       //var segment_percentage = d.count / self.selectedSubset.count * 100;
       var segment_percentage = vis.helpers.calcSegmentPercentage(d.elements, self.selectedSubset.elements) * 100;

       } else if (self.selectedAggregate) {

       var segment_percentage = vis.helpers.calcSegmentPercentage(d.elements, self.selectedAggregate.getElements()) * 100;
       }
       */

      var segment_percentage = vis.helpers.calcSegmentPercentage(d.elements, self.currentSelection.elements) * 100;

      self.tooltip.update({
        subset: d,
        segmentPercentage: self.scales.radianToPercent(segment_percentage),
        subsetFill: d3.select(that).attr("fill")
      }, "subset_highlight")
        .show(xPos, yPos);

      //tooltip with text only
    } else {

      /* deprecated */
      /*
       self.tooltip.update({
       subset: d
       }, "subset")
       .show(xPos, yPos);
       */

      self.tip
        .offset([0, 0])
        .html(function() {
          var text = d.degree > 1 ? ("Items shared with " + d.degree + " other sets: " + d.count) : ("Unique items in this set: " + d.count);
          return text;
        })
        .show();

    }

  }, 500);
})