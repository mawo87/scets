SetVis = (function(vis) {

	function Tooltip(initializer) {
		this.container = initializer.container;
		this.templates = {
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

				//tooltip position
				d3Tooltip
					.style("left", data.xPos + "px")
					.style("top", data.yPos + "px");
			},
			"subset": function(data) {
				var text = data.subset.degree > 0 ? ("Items shared with " + data.subset.degree + " other sets: " + data.subset.count) : ("Unique items in this set: " + data.subset.count);

				//tooltips
				d3.select(this.container)
					.style("left", data.xPos + "px")
					.style("top", data.yPos + "px")
					.text(text);
			}
		}
	}

	Tooltip.prototype = {
		update: function(data, template) {
			if (this.templates[template]) {
				$(this.container).empty();
				this.templates[template].call(this, data);
			} else {
				console.error("Template " + template + " does not exist");
			}

			return this;
		},
		show: function() {
			d3.select(this.container).classed("hidden", false);
			return this;
		},
		hide: function() {
			d3.select(this.container).classed("hidden", true);
			return this;
		},
		getWidth: function() {
			return $(this.container).width();
		}
	};

	return $.extend(vis, {
		Tooltip: Tooltip
	});

})(SetVis || vis);