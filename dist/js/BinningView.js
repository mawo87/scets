var scats = (function(vis) {

  /**
   * @class BinningView
   * @classdesc The BinningView consists of a histogram view and the configurator for manipulating bin settings.
   * @memberof scats
   *
   * @property {scats.Renderer} setRenderer - A reference to the renderer instance
   * @property {string} container - The container where the binning view will be rendered in
   * @property {scats.BinConfigurator} binConfigurator - The BinConfigurator instance
   */
  function BinningView(initializer) {
    var self = this;
    this.setRenderer = initializer.setRenderer;
    this.container = initializer.container;
    this.binConfigurator = new vis.BinConfigurator({
      container: '.custom-bins',
      bins: vis.data.bins,
      onSaveCallback: function () {
        console.log("save callback with renderer ", self.setRenderer);

        self.setRenderer
          .init()
          .render();
      }
    });
  }

  BinningView.prototype = {

    /**
     * Renders the HTML into the provided container.
     * It also appends a histogram and initializes the BinConfigurator.
     *
     * @memberof scats.BinningView
     * @method render
     */
    render: function () {
      var html = '<div class="modal-dialog modal-lg">' +
        '<div class="modal-content">' +
        '<div class="modal-header">' +
        '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
        '<h4 class="modal-title">Edit <span class="semi-bold">Binning</span></h4>' +
        '</div>' +
        '<div class="modal-body">' +
        '<div class="ui-container">' +
        '<div class="ui-row">' +
        '<div class="ui-column degree-hist"><h5>Elements <span class="semi-bold">per Degree</span></h5></div>' +
        '<div class="ui-column custom-bins"></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      $(this.container)
        .empty()
        .html(html);

      this.binConfigurator.init();

      this.renderHistogram();
    },

    /**
     * Renders a histogram of elements per degree.
     *
     * @memberof scats.BinningView
     * @method renderHistogram
     */
    renderHistogram: function () {
      var elements_per_degree = vis.helpers.getElementsPerDegree(vis.data.grid),
        data = elements_per_degree.getList();

      var margin = {left: 20, top: 10},
        width = 420,
        barHeight = 20,
        height = barHeight * data.length;

      var xScale = d3.scale.linear()
        .domain([0, d3.max(data)])
        .range([0, width - margin.left]);

      var yScale = d3.scale.linear()
        .domain([0, data.length])
        .range([0, height]);

      var chart = d3.select(".degree-hist")
        .append("svg")
        .attr("width", width)
        .attr("height", barHeight * data.length + margin.top)
        .append("g")
        .attr("transform", function (d, i) {
          return "translate(" + margin.left + ", " + margin.top + ")";
        });

      var bar = chart.selectAll("g")
        .data(data)
        .enter().append("g")
        .attr("transform", function (d, i) {
          return "translate(0," + i * barHeight + ")";
        });

      bar.append("rect")
        .attr("width", xScale)
        .attr("height", barHeight - 1)
        .attr("y", -barHeight / 2);

      bar.append("text")
        .attr("x", function (d) {
          return xScale(d) - 3;
        })
        .attr("dy", ".35em")
        .text(function (d) {
          return d > 0 ? d : "";
        });

      var yAxis = d3.svg.axis()
        .orient('left')
        .scale(yScale)
        .tickSize(2)
        .tickFormat(function (d, i) {
          return i + 1;
        })
        .tickValues(d3.range(data.length));

      chart.append('g')
        .attr("transform", "translate(0,0)")
        .attr('class', 'yaxis')
        .call(yAxis);

    }
  };

  return $.extend(vis, {
    BinningView: BinningView
  });

})(scats || {});