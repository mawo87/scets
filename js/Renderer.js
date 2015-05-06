var scats = (function(vis) {

	/**
	 * @class Renderer
	 * @classDesc The visualization's rendering component
	 * @memberOf scats
	 *
	 * @property {object} settings - The default setting values
	 * @property {object} settings.canvas - The default settings for our canvas
	 * @property {object} settings.canvas.margin - The default settings for our canvas
	 * @property {int} max_sets_per_group - The max number of sets per row
	 * @property {int} no_set_groups - The number of set groups in the layout
	 * @property {array} aggregated_bin_data - The data aggregated by bins
	 * @property {object} scales - A scales object
	 * @property {d3.scale} scales.x - The x scale used for the visualization
	 * @property {d3.scale} scales.y - The y scale used for the visualization
	 * @property {d3.scale} scales.color - The color scale used for coloring aggregates and sets based on the number of elements
	 * @property {d3.scale} scales.radianToPercent - The scale for converting percentage to radians
	 * @property {array} sortedValues - An array of unique values (elements per aggregate and elements per set) sorted ascending
	 * @property {subset} selectedSubset  - The currently selected subset.
	 * @property {table} table - The table object that shows the active selection
	 * @property {array} data_y_axis - A two-dimensional array. First dimension are the bins, second dimension the degrees per bin.
	 * @property {tooltip} tooltip - The tooltip object.
	 */
	function Renderer() {
		this.settings = {
			canvas: {
				margin: {
					top: 60,
					right: 80,
					bottom: 10,
					left: 80
				},
				width: 900,
				height: 700
			},
			set: {
				margin: { right: 2 },
				width: 16,
				height: 16,
				stroke: 1
			},
			subset: {
				r: 6
			},
			colors: colorbrewer.Oranges[9],
			labelButton: {
				width: 14,
				height: 14,
				rx: 5,
				ry: 5,
				margin: {
					right: 4,
					left: 4
				}
			}
		};
		this.max_sets_per_group = 0;
		this.no_set_groups = 0;
		this.aggregated_bin_data = [];
		this.scales = {
			x: undefined,
			y: undefined,
			color: undefined,
			radianToPercent: d3.scale.linear().domain([0, 100]).range([0, 2 * Math.PI])
		};
		this.sortedValues = [];
		this.currentSelection = undefined;
		this.table = undefined;
		this.tooltip = undefined;
		this.data_y_axis = [];
		this.user_expanded_bins = []; //bins expanded by user (click)
		this.auto_expanded_bins = []; //bins expanded automatically (e.g., through search)
		this.init();
	}

	Renderer.prototype = {
		/**
		 * Initializes the Renderer, i.e., common place for calling initialization tasks.
		 *
		 * @memberOf scats.Renderer
		 * @method init
		 */
		init: function() {
			var self = this;

			//check if data exists
			if (vis.data.grid.length == 0) {
				console.error("no grid data");
				return;
			}

			this.computeWidth();

			//this.data = new vis.Parser().helpers.transpose(vis.data.grid);
			//this.data = vis.data.fullGrid;
			this.max_sets_per_group = Math.ceil(this.settings.canvas.width / this.getTotalSetWidth());

			this.binningView = new vis.BinningView({
				setRenderer: this,
				container: "#binningViewModal"
			});

			this.aggregated_bin_data = vis.helpers.createAggregatedData(vis.data.bins.data);

			this.sortedValues = vis.helpers.computeSortedValuesArray(vis.data.elements, vis.data.aggregates);

			//sets y axis data
			this.data_y_axis = this.createYAxisLabelData();

			this.setupControls();

			initScales();

			this.setupLegend();

			//initialize table
			this.table = new vis.Table({ container: "#element-table", tableClass: "table table-bordered" });

			//initialize tooltip
			this.tooltip = new vis.Tooltip({
				container: "#tooltip"
			});

			function initScales() {
				self.scales.x = d3.scale.ordinal()
					.rangeBands([0, self.settings.canvas.width])
					.domain(d3.range(self.max_sets_per_group));

				self.scales.y = d3.scale.ordinal()
					.rangeBands([0, self.getSetInnerHeight()])
					.domain(d3.range(vis.data.bins.k));

				/*
				self.scales.color = d3.scale.linear()
					.domain([vis.data.min, vis.data.max])
					.range([0, self.settings.colors.length - 1]);
				*/

				/*
				self.scales.color = d3.scale.quantize()
					.domain([vis.data.min, vis.data.max])
					.range(self.settings.colors);
				*/


				/*
				 * see more about color scales:
				 * http://bl.ocks.org/mbostock/4573883
				 * http://stackoverflow.com/questions/19258996/what-is-the-difference-between-d3-scale-quantize-and-d3-scale-quantile
				 * http://stackoverflow.com/questions/17671252/d3-create-a-continous-color-scale-with-many-strings-inputs-for-the-range-and-dy

				 * http://stackoverflow.com/questions/10579944/how-does-d3-scale-quantile-work (!!)
				 * example: http://jsfiddle.net/euSfG/2/
				 */
				self.scales.color = d3.scale.quantile()
					.domain(self.sortedValues)
					.range(self.settings.colors);

			}

			return this;
		},
		/**
		 * Computes the available width of the canvas
		 *
		 * @memberOf scats.Renderer
		 * @method computeWidth
		 */
		computeWidth: function() {
			var $container = $(".ui-layout-center"),
				containerWidth = $container.width(),
				padding = {
					left: parseInt($container.css("padding-left").replace("px", "")),
					right: parseInt($container.css("padding-right").replace("px", ""))
				};

			this.settings.canvas.width = containerWidth - this.settings.canvas.margin.left + padding.left + padding.right;
		},
		/**
		 * Unbinds all event handlers for the UI control elements
		 *
		 * @memberOf scats.Renderer
		 * @method unbindEventHandlers
		 */
		unbindEventHandlers: function() {
			$('.ui-controls .btn-edit-binning').unbind('click');
			$('.ui-controls .btn-expand-all').unbind('click');
			$('.ui-controls .btn-collapse-all').unbind('click');
			$('.ui-controls .btn-remove-selection').unbind('click');
		},
		/**
		 * Binds click events to the UI control elements
		 *
		 * @memberOf scats.Renderer
		 * @method setupControls
		 */
		setupControls: function() {
			var self = this;

			this.unbindEventHandlers();

			//setup modal window for binning
			$('#binningViewModal').modal({ show: false });

			$('.ui-controls .btn-edit-binning').on("click", function() {
				console.log("Edit Binning clicked");
				self.binningView.render();
				$('#binningViewModal').modal('show');
			});

			//setup expand-all button
			$('.ui-controls .btn-expand-all').on("click", function() {
				d3.select('.set-group').selectAll('.y-label-group').each(function(d, i) {
					if (!d3.select(this).classed("expanded")) {
						self.clearSelection();
						self.expandRowIndex(i, true);
					}
				});
			});

			//setup collapse-all button
			$('.ui-controls .btn-collapse-all').on("click", function() {
				d3.select('.set-group').selectAll('.y-label-group').each(function(d, i) {
					if (d3.select(this).classed("expanded")) {
						self.clearSelection();
						self.collapseRowIndex(i, true);

						//empty all bins
						self.user_expanded_bins = [];
						self.auto_expanded_bins = [];
					}
				})
			});

			//setup clear selection button
			$('.ui-controls .btn-remove-selection').on("click", function() {
				self.currentSelection = undefined;

				//toggle status
				$(this)
					.toggleClass("disabled", true)
					.toggleClass("enabled", false);

				self.clearSelection();
				self.table.clear();
			});

			//setup search
			$('#searchInput').on("keyup", onSearchKeyup);

			function onSearchKeyup(ev) {
				if (onSearchKeyup.timeout) {
					clearTimeout(onSearchKeyup.timeout);
				}

				var target = this;

				onSearchKeyup.timeout = setTimeout(function() {
					doSearch.call(target, ev);
				}, 500);
			}

			function doSearch(ev) {
				var text = $(ev.currentTarget).val(),
					regex = new RegExp(text, "i"), //ignore case sensitive
					result = [];

				if (text !== "") {

					for (var i = 0, len = vis.data.elements.length, entry = undefined; i < len; i++) {
						entry = vis.data.elements[i];
						if (regex.test(entry.name)) {
							console.log("Search :: found : ", entry.name);
							result.push(entry);
						}
					}

					console.log("Search :: result : ", result);

					//clear selection first
					self.clearSelection();

					self.createSelection(result, "search", undefined, undefined, undefined);

				}
			}

		},
		/**
		 * @method createSelection
		 * @description - Creates the set occurrence map for the given elements and calls the createSegmentSelection method
		 * @param elements - an array of elements
		 * @param type - the type of selection, can be one of the following: subset, aggregate, search (will be passed to createSegmentSelection)
		 * @param rowIndex - an optional rowIndex (only for aggregate selection)
		 */
		createSelection: function (elements, type, subset, aggregate, rowIndex) {
			var self = this,
				el = undefined, //vars for iterations
				degree = -1,
				binIndex = -1;

			//clear selection first otherwise selection gets messed up during row expanding
			//this.clearSelection();

			this.currentSelection = new vis.Selection({
				type: type,
				elements: elements,
				subset: subset,
				aggregate: aggregate,
				rowIndex: rowIndex
			});

			for (var i = 0, len = elements.length; i < len; i++) {
				el = elements[i];
				degree = el.degree;

				console.log("createSelection :: element : ", el);
				console.log("createSelection :: degree : ", degree);

				//1. check which row includes the degree
				binIndex = this.getBinIndex(degree);

				console.log("createSelection :: binIndex : ", binIndex);

				//2. check if the row from (1) is already expanded
				if (this.isBinExpanded(binIndex)) {
					//yes, proceed to 3
				} else {
					//no, call expand row function with bin index that has to be expanded
					this.expandRowIndex(binIndex);
				}
			}

			//create a set occurrence map
			var set_occurrence_map = vis.helpers.getElementsGroupedBySetAndDegree(elements);

			console.log("createSelection :: set_occurrence_map : ", set_occurrence_map);

			//if subset, then highlight subset first
			if (type === "subset") {
				/* deprecated */
				//var subset = d3.select('.set#' + self.selectedSubset.set_name + ' .subset[data-degree="' + self.selectedSubset.degree + '"]').node();

				var subset = d3.select('.set#' + self.currentSelection.subset.set_name + ' .subset[data-degree="' + self.currentSelection.subset.degree + '"]').node();
				d3.select(subset).classed("selected", true);

			//if aggregate, then highlight aggregate first
			} else if (type === "aggregate") {
					/* deprecated */
					//var aggregate = d3.select('.set#' + self.selectedAggregate.subsets[0].set_name + ' .aggregate[data-bin="' + rowIndex + '"]').node();

					var aggregate = d3.select('.set#' + self.currentSelection.aggregate.subsets[0].set_name + ' .aggregate[data-bin="' + self.currentSelection.rowIndex + '"]').node();
					d3.select(aggregate).classed("selected", true);
			}

			//reduce opacity for all elements that are not selected (focus with context)
			d3.selectAll(".subset:not(.selected), .aggregate:not(.selected)")
				.style("opacity", 0.3);

			this.createSegmentSelection(set_occurrence_map, type, elements);

			self.table.update(elements);

			//toggle button status
			$('.ui-controls .btn-remove-selection')
				.toggleClass("disabled", false)
				.toggleClass("enabled", true);
		},
		/**
		 * @method createSegmentSelectio
		 * @description - Creates the circle segments for the given occurrence map
		 * @param set_occurrence_map - a map of sets and the degrees within theses sets that need to be highlighted
		 * @param type - the type of selection, can be one of the following: subset, aggregate, search. The type will be used to determine the reference for the segment
		 * @param elements - an array of elements
		 */
		createSegmentSelection: function(set_occurrence_map, type, elements) {
			var self = this,
				highlighted_set_labels = [],
				highlighted_degrees = [],
				arc = d3.svg.arc();

			console.log("createSegmentSelection :: type : ", type);

			_.each(set_occurrence_map, function(entry, idx) {
				//4. select the subset

				var setName = entry.set;

				highlighted_set_labels.push(parseInt(d3.select('.set#' + setName).attr("data-set")));

				_.each(entry.degrees, function(degreeItem) {
					var subset = d3.select('.set#' + setName + ' .subset[data-degree="' + degreeItem.degree + '"]').node(),
						subset_data = d3.select('.set#' + setName + ' .subset[data-degree="' + degreeItem.degree + '"]').data()[0],
						segment_percentage = undefined;

					console.log("createSegmentSelection :: entry : ", entry);
					console.log("createSegmentSelection :: subset data : ", subset_data);

					highlighted_degrees.push(degreeItem.degree);

					/* deprecated */
					/*
					if (type === "search") {
						console.log("createSegmentSelection :: TYPE SEARCH : current ", subset_data);
						console.log("createSegmentSelection :: TYPE SEARCH : reference ", degreeItem);

						//segment_percentage = degreeItem.count / subset_data.count * 100; //e.g., 33.3
						segment_percentage = vis.helpers.calcSegmentPercentage(subset_data.elements, elements) * 100;

					} else if (type === "aggregate") {
						console.log("createSegmentSelection :: TYPE AGGREGATE : current ", subset_data);
						console.log("createSegmentSelection :: TYPE AGGREGATE : reference ", elements);
						console.log("createSegmentSelection :: TYPE AGGREGATE : segment_percentage ", vis.helpers.calcSegmentPercentage(subset_data.elements, elements));

						segment_percentage = vis.helpers.calcSegmentPercentage(subset_data.elements, elements) * 100;
					} else if (type === "subset") {
						console.log("createSegmentSelection :: TYPE SUBSET : current ", subset_data);
						console.log("createSegmentSelection :: TYPE SUBSET : reference ", elements);
						console.log("createSegmentSelection :: TYPE SUBSET : segment_percentage ", vis.helpers.calcSegmentPercentage(subset_data.elements, elements));

						segment_percentage = vis.helpers.calcSegmentPercentage(subset_data.elements, elements) * 100;
					}
					*/

					//segment_percentage = degreeItem.count / subset_data.count * 100; //e.g., 33.3
					segment_percentage = vis.helpers.calcSegmentPercentage(subset_data.elements, elements) * 100;

					//if the current subset is not the selected one, create a circle segment
					if (!d3.select(subset).classed("selected")) {

						var cx = d3.select(subset).attr("cx"),
							cy = d3.select(subset).attr("cy"),
							r = d3.select(subset).attr("r");

						//add additional class for advanced tooltip and reduce opacity for not selected subsets
						d3.select(subset)
							.classed("segment-tooltip", true)
							.style("opacity", 0.3);

						arc
							.innerRadius(4)
							.outerRadius(6)
							.startAngle(0)
							.endAngle(self.scales.radianToPercent(segment_percentage));

						d3.select(subset.parentNode).append("path")
							.attr("d", arc)
							.attr("class", "highlight-segment")
							.attr("transform", "translate(8," + cy + ")");
					}

				});
			});

			//highlight set and degree labels
			this.highlightSetLabels(_.uniq(highlighted_set_labels));

			this.highlightDegreeLabels(_.uniq(highlighted_degrees));
		},
		/**
		 * @method restoreSelection
		 * @description re-adds selection if one exists
		 */
		restoreSelection: function() {
			if (this.currentSelection) {

				switch (this.currentSelection.type) {
					case "subset":
						this.createSelection(this.currentSelection.elements, "subset", this.currentSelection.subset, undefined, undefined);
						break;
					case "aggregate":
						this.createSelection(this.currentSelection.elements, "aggregate", undefined, this.currentSelection.aggregate, this.currentSelection.rowIndex);
						break;
					case "search":
						this.createSelection(this.currentSelection.elements, "search", undefined, undefined, undefined);
						break;
				}

			}
		},
		/**
		 * Creates the HTML for the legend based on the scales.color object
		 *
		 * @memberOf scats.Renderer
		 * @method setupLegend
		 */
		setupLegend: function() {
			var self = this;

			/*
			console.log("colors.quantiles() ", this.scales.color.quantiles());
			console.log("colors(3) ", this.scales.color(3));
			*/

			//empty container first
			$('#legend').empty();

			d3.select("#legend")
				.append("h5")
				.text("No. of elements:");

			var legend = d3.select("#legend")
				.append("ul")
				.attr("class", "list-inline");

			var keys = legend.selectAll("li.key")
				.data(this.scales.color.range())
				.enter()
				.append("li")
				.attr("class", "key")
				.style("border-top-color", String)
				.style("width", 100/this.settings.colors.length + "%")
				.text(function(d) {
					var r = self.scales.color.invertExtent(d);
					//console.log("r ", r);
					return "≥ " + Math.round(r[0]);
				});

		},
		/**
		 * Renders the visualization data, common place for drawing the canvas and calling the renderSets method
		 *
		 * @memberOf scats.Renderer
		 * @method render
		 */
		render: function() {
			var self = this,
				width = this.settings.canvas.width,
				height = this.settings.canvas.height;

			//empty canvas first and append tooltip container
			$('#canvas')
				.empty()
				.append('<div id="tooltip" class="hidden"></div>');

			this.svg = d3.select('#canvas').append("svg")
				.attr("width", width + self.settings.canvas.margin.left)
				.attr("height", height)
				.style("margin-left", -self.settings.canvas.margin.left + "px")
				.append("g")
				.attr("transform", "translate(" + self.settings.canvas.margin.left + "," + self.settings.canvas.margin.top + ")");

			this.renderSets();

			var no_of_set_groups = Math.ceil(vis.data.fullGrid.length / this.max_sets_per_group),
				canvasHeight = (this.getSetOuterHeight() + this.settings.canvas.margin.top) * no_of_set_groups;

			this.setCanvasHeight(canvasHeight);
		},
		/**
		 * Computes the total outer width of a set rectangle
		 *
		 * @memberOf scats.Renderer
		 * @method getTotalSetWidth
		 * @returns {int} - The total outer width of a set rectangle
		 */
		getTotalSetWidth: function() {
			return this.settings.set.width + 2 * this.settings.set.stroke + this.settings.set.margin.right;
		},
		/**
		 * Computes the inner height of a set rectangle
		 *
		 * @memberOf scats.Renderer
		 * @method getSetInnerHeight
		 * @returns {int} - The inner height of a set rectangle (without the border)
		 */
		getSetInnerHeight: function() {
			return vis.data.bins.k * this.settings.set.height;
		},
		/**
		 * Computes the outer height of a set rectangle
		 *
		 * @memberOf scats.Renderer
		 * @method getSetOuterHeight
		 * @returns {int} - The outer height of a set rectangle (including the border)
		 */
		getSetOuterHeight: function() {
			return this.getSetInnerHeight() + 2 * this.settings.set.stroke;
		},
		/**
		 * Clears the current selection.
		 *
		 * @memberOf scats.Renderer
		 * @method clearSelection
		 */
		clearSelection: function() {
			console.log("clearSelection");

			//remove circle segments
			d3.selectAll('.highlight-segment').remove();

			//remove highlighted class from selected and highlighted subsets
			d3.selectAll('.subset.selected').classed("selected", false);
			d3.selectAll('.subset.highlighted').classed("highlighted", false);

			//remove highlighted class from x-axis labels and degree labels
			d3.selectAll('.x-label.highlighted').classed("highlighted", false);
			d3.selectAll('.degree-label.highlighted').classed("highlighted", false);

			//remove segment-tooltip class from all highlighted subsets
			d3.selectAll('.subset.segment-tooltip').classed("segment-tooltip", false);

			//set opacity to 1 for subsets, aggregates and x-axis labels
			d3.selectAll('.subset').style("opacity", 1);
			d3.selectAll('.aggregate').style("opacity", 1);
			d3.selectAll('.x-label').style("opacity", 1);

			//remove highlighted class from selected aggregates
			d3.selectAll('.aggregate.selected').classed("selected", false);
		},
		selectAggregate: function(aggregate, rowIndex) {
			console.log("selectAggregate :: aggregate ", aggregate, "rowIndex ", rowIndex);

			//first unselect all previously highlighted elements
			this.clearSelection();

			//expand row (if not expanded yet) and unselect all previously highlighted elements
			if (!this.isBinExpanded(rowIndex)) {
				this.expandRowIndex(rowIndex);
			}

			console.log("selectAggregate :: elementsArray : ", aggregate.getElements());

			//clear selection first
			this.clearSelection();

			this.createSelection(aggregate.getElements(), "aggregate", undefined, aggregate, rowIndex);
		},
		getBinIndex: function(degree) {
			for (var i = 0, len = vis.data.bins.ranges.length, b = undefined, start = 0, end = 0; i < len; i++) {
				b = vis.data.bins.ranges[i];
				start = b.start + 1; //ranges start from 0, need to add 1
				end = b.end + 1;
				if (start <= degree && degree <= end) {
					return i;
				}
			}
			return -1;
		},
		selectSubset: function(subset) {
			console.log("selectSubset :: subset ", subset);

			//clear selection first
			this.clearSelection();

			this.createSelection(subset.elements, "subset", subset, undefined, undefined);
		},
		/**
		 * Computes the height of the canvas
		 *
		 * @memberOf scats.Renderer
		 * @method getCanvasHeight
		 * @return {int} - The height of the canvas
		 */
		getCanvasHeight: function() {
			return parseInt(d3.select('#canvas svg').attr("height"));
		},
		/**
		 * Sets the height of the canvas
		 *
		 * @memberOf scats.Renderer
		 * @method setCanvasHeight
		 * @param {int} height - The height value to be set.
		 */
		setCanvasHeight: function(height) {
			d3.select('#canvas svg').attr("height", height);
		},
		arrangeLabels: function() {
			var self = this,
				yLabelGroups = d3.selectAll('.y-label-group.expanded');

			d3.selectAll('.degree-label')
				.remove();

			yLabelGroups.each(function(d, i) {
				var lbl = this;
				d3.select(this.parentNode).selectAll('.degree-label' + ' bin-' + (i + 1))
					.data(d3.select(this).data()[0])
					.enter()
					.append("text")
					.attr("class", "degree-label bin-" + (i+1))
					.attr("x", -6)
					.attr("y", function(d, i) {
						return parseInt(d3.transform(d3.select(lbl).attr("transform")).translate[1]) + (i + 1) * self.settings.set.height;
					})
					.attr("dy", ".32em")
					.attr("text-anchor", "end")
					.text(function(d, i) { return d; });

			});
		},
		expandRowIndex: function (rowIndex, isUserAction) {
			var bin = vis.data.bins.ranges[rowIndex],
				num_of_degrees = bin.end - bin.start + 1,
				additional_height = this.settings.set.height * num_of_degrees,
				setGroup = d3.select(".set-group"),
				yLabelGroups = setGroup.selectAll(".y-label-group"),
				label_yPos = d3.transform(d3.select(yLabelGroups[0][rowIndex]).attr("transform")).translate[1];

			//clear selection first otherwise selection gets messed up during row expanding
			//this.clearSelection();

			d3.selectAll('.set-background')
				.attr("height", function(d, i) {
					return parseInt(d3.select(this).attr("height")) + additional_height;
				});

			d3.selectAll('.set-group')
				.attr("transform", function(d, i) {
					var prev = d3.transform(d3.select(this).attr("transform")).translate[1];

					if (i > 0) {
						return "translate(0," + (prev + i * additional_height) + ")";
					} else {
						return "translate(0," + prev + ")";
					}
				});

			d3.selectAll('.y-label-group')
				.attr("transform", function(d, i) {
					var prev = d3.transform(d3.select(this).attr("transform")).translate[1];

					if (prev > label_yPos) {
						return "translate(0," + (prev + additional_height) + ")";
					} else {
						return "translate(0," + prev + ")";
					}
				})
				.attr("class", function(d, i) {
					//sets the expanded resp. collapsed class for the given bin in all set groups
					if (Math.abs(rowIndex - i - vis.data.bins.k) % vis.data.bins.k == 0) {
						return "y-label-group expanded";
					} else {
						return d3.select(this).attr("class");
					}
				});

			this.arrangeLabels();

			var aggregates = d3.selectAll('.aggregate')
				.attr("cy", function(d, i) {
					if (parseInt(d3.select(this).attr("cy")) > label_yPos) {
						return parseInt(d3.select(this).attr("cy")) + additional_height;
					} else {
						return parseInt(d3.select(this).attr("cy"));
					}
				})
				.attr("class", function(d, i) {
					if (parseInt(d3.select(this).attr("data-bin")) == rowIndex && d.count > 0) {
						var isExpanded = d3.select(this).classed("expanded");
						if (!isExpanded) {
							d3.select(this).classed("expanded", true);
						}
					}
					return d3.select(this).attr("class");
				});

			this.appendSubsets();

			//update canvas height
			this.setCanvasHeight(this.getCanvasHeight() + this.no_set_groups * additional_height);

			//update status of expanded bins
			if (isUserAction) {
				this.updateExpandedBins(rowIndex, this.user_expanded_bins);
			} else {
				this.updateExpandedBins(rowIndex, this.auto_expanded_bins);
			}

			//re-add selection if one exists
			this.restoreSelection();

		},
		collapseRowIndex: function (rowIndex, isUserAction) {
			var bin = vis.data.bins.ranges[rowIndex],
				num_of_degrees = bin.end - bin.start + 1,
				additional_height = this.settings.set.height * num_of_degrees,
				setGroup = d3.select(".set-group"),
				yLabelGroups = setGroup.selectAll(".y-label-group"),
				label_yPos = d3.transform(d3.select(yLabelGroups[0][rowIndex]).attr("transform")).translate[1];

			console.log("collapseRowIndex :: label_yPos : ", label_yPos);

			d3.selectAll('.set-background')
				.attr("height", function(d, i) {
					return parseInt(d3.select(this).attr("height")) - additional_height;
				});

			d3.selectAll('.set-group')
				.attr("transform", function(d, i) {
					var prev = d3.transform(d3.select(this).attr("transform")).translate[1];

					if (i > 0) {
						return "translate(0," + (prev - i * additional_height) + ")";
					} else {
						return "translate(0," + prev + ")";
					}
				});

			d3.selectAll('.y-label-group')
				.attr("transform", function(d, i) {
					var prev = d3.transform(d3.select(this).attr("transform")).translate[1];

					if (prev > label_yPos) {
						return "translate(0," + (prev - additional_height) + ")";
					} else {
						return "translate(0," + prev + ")";
					}
				})
				.attr("class", function(d, i) {
					if (Math.abs(rowIndex - i - vis.data.bins.k) % vis.data.bins.k == 0) {
						return "y-label-group collapsed";
					} else {
						return d3.select(this).attr("class");
					}
				});

			this.arrangeLabels();

			d3.selectAll('.aggregate')
				.attr("cy", function(d, i) {
					if (parseInt(d3.select(this).attr("cy")) > label_yPos) {
						return parseInt(d3.select(this).attr("cy")) - additional_height;
					} else {
						return parseInt(d3.select(this).attr("cy"));
					}
				})
				.attr("class", function(d, i) {
					if (parseInt(d3.select(this).attr("data-bin")) == rowIndex && d.count > 0) {
						var isExpanded = d3.select(this).classed("expanded");
						if (isExpanded) {
							d3.select(this).classed("expanded", false);
						}
					}
					return d3.select(this).attr("class");
				});

			this.appendSubsets();

			this.setCanvasHeight(this.getCanvasHeight() - additional_height);

			//update status of expanded bins
			if (isUserAction) {
				this.updateExpandedBins(rowIndex, this.user_expanded_bins);
			} else {
				this.updateExpandedBins(rowIndex, this.auto_expanded_bins);
			}

			//re-add selection if one exists
			this.restoreSelection();

		},
		isBinExpanded: function(binIndex) {
			//var idx = this.user_expanded_bins.indexOf(binIndex);

			//checks both user and auto expanded bins if the given binIndex is included
			var idx = _.indexOf(_.union(this.user_expanded_bins, this.auto_expanded_bins), binIndex);
			return idx > -1;
		},
		updateExpandedBins: function(binIndex, binArray) {
			var idx = _.indexOf(binArray, binIndex);

			//remove binIndex from array
			if (idx > -1) {
				binArray.splice(idx, 1);
			} else {
				//add binIndex to array
				binArray.push(binIndex);
			}

			console.log("updateExpandedBins :: expanded bins : ", binArray);
		},
		appendSubsets: function() {
			var self = this;

			d3.selectAll('.subset')
				.remove();

			d3.selectAll('.aggregate.expanded').each(function(d, i) {

				var subset_y_pos = parseInt(d3.select(this).attr("cy")),
					subset_x_pos = parseInt(d3.select(this).attr("cx")),
					bin_entries = d3.select(this).data()[0].subsets,
					binIndex = parseInt(d3.select(this).attr("data-bin"));

				//console.log("this ", this);
				//console.log("bin_entries ", bin_entries);
				//console.log("data-bin :: ", d3.select(this).attr("data-bin"));

				//level is the index of the bin the parent aggregate belongs to (starting from 0)
				d3.select(this.parentNode).selectAll('.subset.level-' + binIndex)
					.data(bin_entries)
					.enter()
					.append("circle")
					.attr("class", "subset level-" + binIndex)
					.attr("cx", subset_x_pos)
					.attr("cy", function(d, i) { return subset_y_pos + (i + 1) * self.settings.set.height; })
					.attr("r", function(d) { return d.count > 0 ? self.settings.subset.r * 0.75 : 0; }) //set radius to 0 for subsets with 0 elements
					.attr("display", function(d) { return d.count > 0 ? null : "none"; }) //don't show subsets with 0 elements
					//.attr("fill", function(d) { return d.count > 0 ? self.settings.colors[Math.ceil(self.scales.color(d.count))] : "#FFFFFF"; });
					.attr("fill", function(d) { return d.count > 0 ? self.scales.color(d.count) : "#FFFFFF"; })
					.attr("data-degree", function(d, i) { return d.degree; });
			});

			//handler for appended subsets
			d3.selectAll('.subset')
				.on("mouseover", function(d, i) {
					console.log("d ", d);
					var that = this;

					//delay mouseover event for 500ms
					delay = setTimeout(function() {
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

							self.tooltip.update({
								subset: d
							}, "subset")
							.show(xPos, yPos);
						}

					}, 500);
				})
				.on("mouseout", function(d, i) {
					clearTimeout(delay);
					self.tooltip.hide();
				})
				.on("click", onClickHandler);

			function onClickHandler(subset) {
				console.log("clicked subset ", subset);

				//first unselect all previously highlighted elements
				self.clearSelection();

				self.selectSubset(subset);
			}

		},
		highlightSetLabels: function(set_ids) {
			d3.selectAll('.x-label')
				.attr("class", function(d, i) {
					if (_.contains(set_ids, i)) {
						d3.select(this).classed("highlighted", true);
					}
					return d3.select(this).attr("class");
				});

			//reduce opacity for remaining labels
			d3.selectAll('.x-label:not(.highlighted)')
				.style("opacity", 0.3);
		},
		highlightDegreeLabels: function (degreeArray) {
			d3.selectAll('.degree-label')
				.attr("class", function(d) {
					if (_.contains(degreeArray, d)) {
						d3.select(this).classed("highlighted", true);
					}
					return d3.select(this).attr("class");
				});
		},
		createYAxisLabelData: function () {
			var result = [];
			for (var i = 0; i < vis.data.bins.k; i++) {
				var arr = [],
					counter = vis.data.bins.ranges[i].start;
				while (counter <= vis.data.bins.ranges[i].end) {
					arr.push(counter+1);
					counter++;
				}
				result.push(arr);
			}

			return result;
		},
		renderSets: function() {

			//TODO: remove --> just added for testing
			//this.max_sets_per_group = 10;

			var self = this,
				transposed = vis.helpers.transpose(this.aggregated_bin_data),
				data_per_setGroup = vis.helpers.chunk(transposed, Math.ceil(this.max_sets_per_group))

			console.log("aggregated_bin_data ", this.aggregated_bin_data);

			console.log("vis.data.bins ", vis.data.bins);

			console.log("aggregated bin data ", this.aggregated_bin_data);

			//set number of set groups
			this.no_set_groups = data_per_setGroup.length;

			console.log("data_per_setGroup ", data_per_setGroup);

			var setGroups = this.svg.selectAll('.set-group')
				.data(data_per_setGroup)
				.enter().append("g")
				.attr("class", "set-group")
				.attr("data-set-group", function(d, i) { return i; })
				.attr("transform", function(d, i) {
					var top_offset = self.settings.canvas.margin.top;
					return "translate(0," + (i * (self.getSetOuterHeight() + top_offset)) + ")";
				});

			setGroups.each(renderSets);
			setGroups.each(renderXaxisLabels);
			setGroups.each(renderYaxisLabels);

			function renderSets(d, i) {
				var setGroup = i;
				var sets = d3.select(this).selectAll(".set")
					.data(data_per_setGroup[i])
					.enter().append("g")
					.attr("class", "set")
					.attr("id", function(d, i) { return vis.data.sets[i + (setGroup * self.max_sets_per_group)].name; })
					.attr("transform", function(d, i) {
						//console.log("d ", d, "i ", i);
						return "translate(" + self.scales.x(i) + ", 0)";
					})
					.attr("data-set", function(d, i) {
						//console.log("d ", d, "i ", i);
						return i + (setGroup * self.max_sets_per_group);
					});

				sets.each(drawSets);
				sets.each(drawAggregates);
			}

			function drawSets(d, i) {
				d3.select(this)
					.append("rect")
					.attr("class", "set-background")
					.attr("x", 0)
					.attr("width", self.settings.set.width)
					.attr("height", vis.data.bins.k * self.settings.set.height);
			}

			function drawAggregates(aggregate, idx) {
				var delay,
					circle = d3.select(this).selectAll('.aggregate')
					.data(aggregate)
					.enter()
					.append("circle")
					.attr("class", "aggregate")
					.attr("cx", self.settings.set.width/2)
					.attr("cy", function(d, i) { return self.scales.y(i) + self.settings.set.height / 2; })
					.attr("r", function(d) { return d.count > 0 ? self.settings.subset.r : 0; }) //set radius to 0 for aggregates with 0 elements
					.attr("display", function(d) { return d.count > 0 ? null : "none"; }) //don't show aggregates with 0 elements
					.attr("data-bin", function(d, i) { return i; })
					//.style("fill", function(d) { return self.settings.colors[Math.ceil(self.scales.color(d.getTotalElements()))]; })
					.style("fill", function(d) { return self.scales.color(d.count); })
					.on("mouseover", onMouseover)
					.on("mouseout", onMouseout)
					.on("click", function(aggregate, rowIndex) {

							self.selectAggregate(aggregate, rowIndex);
					});

				function onMouseover(d, i) {
					//console.log("d ", d);

					var that = this;

					//delay mouseover event for 500ms
					delay = setTimeout(function() {
						var xPos = parseFloat($(that).offset().left) - (self.tooltip.getWidth()/2 + self.getTotalSetWidth()/2 - self.settings.subset.r/2),
							yPos = parseFloat($(that).offset().top) + 3 * self.settings.subset.r;

						self.tooltip.update({
							aggregate: d
						}, "aggregate")
							.show(xPos, yPos);

					}, 500);
				}

				function onMouseout() {
					clearTimeout(delay);
					self.tooltip.hide();
				}

			}

			function renderXaxisLabels(setGroup, index) {
				//x axis data depends on set group whereas the y labels remain the same for each set group
				var data_x_axis = vis.data.sets.slice(index * self.max_sets_per_group, index * self.max_sets_per_group + self.max_sets_per_group);

				//render labels for x axis
				d3.select(this).selectAll('.x-label')
					.data(data_x_axis)
					.enter().append("text")
					.attr("class", "x-label")
					.attr("transform", function(d, i) {
						return "rotate(-90)";
					})
					.attr("x", 6)
					.attr("y", function(d, i) { return self.scales.x(i) + 7; })
					.attr("dy", ".32em")
					.attr("text-anchor", "start")
					.text(function(d, i) { return d.name; });
			}

			function renderYaxisLabels(setGroup, index) {
				var labelGroups = d3.select(this).selectAll('.y-label-group')
					.data(self.data_y_axis)
					.enter().append("g")
					.attr("class", "y-label-group collapsed")
					.attr("data-set-group", function(d) { return index; })
					.attr("transform", function(d, i) {
						return "translate(0," + (i * self.settings.set.height + self.settings.subset.r + 2) + ")";
					});

				labelGroups.each(function(group, idx) {
					//console.log("group ", group, "idx ", idx);

					//append button background
					d3.select(this).append("rect")
						.attr("class", "btn-background")
						.attr("width", self.settings.labelButton.width)
						.attr("height", self.settings.labelButton.height)
						.attr("x", -(self.settings.labelButton.width + self.settings.labelButton.margin.right))
						.attr("y", -(self.settings.labelButton.width/2))
						.attr("rx", self.settings.labelButton.rx)
						.attr("ry", self.settings.labelButton.ry);

					//append expand icon
					d3.select(this).append("text")
						.attr("class", "icon-expand")
						.attr("x", -(self.settings.labelButton.width + self.settings.labelButton.margin.right - 4))
						.attr("y", 3)
						.html("&#xf067");

					//append collapse icon
					d3.select(this).append("text")
						.attr("class", "icon-collapse")
						.attr("x", -(self.settings.labelButton.width + self.settings.labelButton.margin.right - 4))
						.attr("y", 3)
						.html("&#xf068");

					//append label text
					d3.select(this).append("text")
						.attr("class", "y-label")
						.attr("x", -(self.settings.labelButton.width + self.settings.labelButton.margin.right + self.settings.labelButton.margin.left))
						.attr("y", 0)
						.attr("dy", ".32em")
						.attr("text-anchor", "end")
						.text(function(d, i) { return "[" + group[0] + " - " + group[d.length - 1] + "]" ; });

				});

				//attach click handler
				labelGroups.on("click", function(bin, idx) {
					console.log("bin ", bin, "idx ", idx);

					//expand row
					if (!d3.select(this).classed("expanded")) {
						self.clearSelection();
						self.expandRowIndex(idx, true);

					} else {
						//collapse row
						self.clearSelection();
						self.collapseRowIndex(idx, true);
					}
				});

			}

		}
	};

	vis.Renderer = Renderer;

	return vis;

})(scats || {});