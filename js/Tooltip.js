var scats = (function(vis) {


	/**
	 * @class Tooltip
	 * @classDesc The tooltip class
	 * @memberOf scats
	 *
	 * @property {string} container - The container where HTML code will be rendered in
	 * @property {object} templates - An object that maps template names to template functions. The following templates are supported: aggregate, subset, subset_highlight
	 * @params {object} initializer - An object to pass properties for initialization
	 */
	function Tooltip(initializer) {
		this.container = initializer.container;
		this.templates = {
			"set": function (data) {
				var text = "Total: " + data.data.count;
				d3.select(this.container)
					.text(text);
			},
			"aggregate": function(data) {
				var d3Tooltip = d3.select(this.container),
					maxValue = Math.max.apply(Math, data.aggregate.subsets.map(function(element) {
						return element.count;
					}));

				$(this.container)
					.append("<div class='shared-items-note'>Shared items / degree</div>");

				var list = d3Tooltip.append("ul")
					.attr("class", "list-unstyled");

				var bars = list.selectAll(".bar-horizontal")
					.data(data.aggregate.subsets)
					.enter()
					.append("li")
					.attr("class", function(d) { return d.count > 0 ? "bar-horizontal" : "bar-horizontal hidden"; });

				bars
					.append("em")
					.text(function(d) { return "Degree " + d.degree; });

				bars
					.append("span")
					.style("padding-right", function(d, i) { return (d.count / maxValue) * 50 + "%"; })
					.text(function(d) { return d.count; });
			},
			"subset": function(data) {
				var text = data.subset.degree > 1 ? ("Items shared with " + data.subset.degree + " other sets: " + data.subset.count) : ("Unique items in this set: " + data.subset.count);

				d3.select(this.container)
					.text(text);
			},
			"subset_highlight": function(data) {
				this.templates["subset"].call(this, data);

				$(this.container).append("<hr>");

				var width = this.getWidth(),
					height = 80,
					innerRadius = 20,
					outerRadius = 30,
					svg = d3.select(this.container)
						.append("svg")
						.attr("width", width)
						.attr("height", height);

				var arc = d3.svg.arc()
					.innerRadius(innerRadius)
					.outerRadius(outerRadius)
					.startAngle(0)
					.endAngle(data.segmentPercentage);

				//append circle
				svg.append("circle")
					.attr("class", "subset")
					.attr("cx", width / 2)
					.attr("cy", 40)
					.attr("r", innerRadius)
					.attr("fill", data.subsetFill);

				//append circle segment
				svg.append("path")
					.attr("d", arc)
					.attr("fill", "#2B8CBE")
					.attr("transform", "translate(" + (width / 2) + ", " + height / 2 + ")");
			}
		}
	}

	Tooltip.prototype = {

		/**
		 * Updates the Tooltip's HTML
		 *
		 * @memberOf scats.Tooltip
		 * @param {object} data - A data object which is passed to the template
		 * @param {string} template - The template name that will be used to update the tooltip.
		 * @returns {scats.Tooltip} - The tooltip object itself.
		 * @method update
		 */
		update: function(data, template) {
			if (this.templates[template]) {
				$(this.container).empty();
				this.templates[template].call(this, data);
			} else {
				console.error("Template " + template + " does not exist");
			}

			return this;
		},
		/**
		 * Shows the tooltip on a given position.
		 *
		 * @memberOf scats.Tooltip
		 * @param {int} x - The x position of the tooltip to be placed.
		 * @param {int} y - The y position of the tooltip to be placed.
		 * @returns {scats.Tooltip} - The tooltip object itself.
		 * @method show
		 */
		show: function(x, y) {
			this.position(x, y);
			d3.select(this.container).classed("hidden", false);
			return this;
		},
		/**
		 * Hides the tooltip.
		 *
		 * @memberOf scats.Tooltip
		 * @method hide
		 */
		hide: function() {
			d3.select(this.container).classed("hidden", true);
			return this;
		},
		/**
		 * Gets the tooltip's width
		 *
		 * @memberOf scats.Tooltip
		 * @returns {int} - The width of the tooltip in px.
		 * @method getWidth
		 */
		getWidth: function() {
			return $(this.container).width();
		},
		/**
		 * Gets the tooltip's height
		 *
		 * @memberOf scats.Tooltip
		 * @returns {int} - The height of the tooltip in px.
		 * @method getHeight
		 */
		getHeight: function() {
			return $(this.container).height();
		},
		/**
		 * Sets the tooltips x and y position
		 *
		 * @memberOf scats.Tooltip
		 * @param {int} left - The left offset in px.
		 * @param {int} top - The top offset in px.
		 * @method position
		 */
		position: function(left, top) {
			d3.select(this.container)
				.style("left", left + "px")
				.style("top", top + "px");

			return this;
		}
	};

	return $.extend(vis, {
		Tooltip: Tooltip
	});

})(scats || {});