/**
 * Created by martinwortschack on 05/11/14.
 */
var SetVis = (function(vis) {

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
			colors: colorbrewer.Reds[9],
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
		this.selectedSubset = undefined;
		this.init();
	}

	Renderer.prototype = {
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

			this.binningView = new BinningView({
				setRenderer: this,
				container: "#binningViewModal"
			});

			this.aggregated_bin_data = vis.helpers.createAggregatedData(vis.data.bins.data);

			this.sortedValues = vis.helpers.computeSortedValuesArray(vis.data.elements, vis.data.aggregates);

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

				self.scales.color = d3.scale.quantile()
					.domain(self.sortedValues)
					.range(self.settings.colors);

			}

			return this;
		},
		computeWidth: function() {
			var $container = $(".ui-layout-center"),
				containerWidth = $container.width(),
				padding = {
					left: parseInt($container.css("padding-left").replace("px", "")),
					right: parseInt($container.css("padding-right").replace("px", ""))
				};

			this.settings.canvas.width = containerWidth - this.settings.canvas.margin.left + padding.left + padding.right;
		},
		unbindEventHandlers: function() {
			$('.ui-controls .btn-edit-binning').unbind('click');
			$('.ui-controls .btn-expand-all').unbind('click');
			$('.ui-controls .btn-collapse-all').unbind('click');
			$('.ui-controls .btn-remove-selection').unbind('click');
		},
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
						self.expandRow.call(this, d, i, self);
					}
				});
			});

			//setup collapse-all button
			$('.ui-controls .btn-collapse-all').on("click", function() {
				d3.select('.set-group').selectAll('.y-label-group').each(function(d, i) {
					if (d3.select(this).classed("expanded")) {
						self.collapseRow.call(this, d, i, self);
					}
				})
			});

			//setup clear selection button
			$('.ui-controls .btn-remove-selection').on("click", function() {
				self.selectedSubset = undefined;
				self.clearSelection();
				self.table.clear();
			});
		},
		setupLegend: function() {
			var self = this;

			/*
			console.log("colors.quantiles() ", this.scales.color.quantiles());
			console.log("colors(3) ", this.scales.color(3));
			*/

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
		getTotalSetWidth: function() {
			return this.settings.set.width + 2 * this.settings.set.stroke + this.settings.set.margin.right;
		},
		getSetInnerHeight: function() {
			return vis.data.bins.k * this.settings.set.height;
		},
		getSetOuterHeight: function() {
			return this.getSetInnerHeight() + 2 * this.settings.set.stroke;
		},
		clearSelection: function() {
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
		},
		selectAggregate: function(aggregate) {
			console.log("aggregate ", aggregate);
		},
		selectSubset: function(subset) {
			console.log("subset ", subset);

			var self = this,
				set_occurrence_map = vis.helpers.getElementsGroupedBySetAndDegree(subset),
				arc = d3.svg.arc(),
				cx = 0,
				cy = 0,
				r = 0,
				segment_percentage = 0,
				set_ids = [];

			console.log("set_occurrence_map ", set_occurrence_map);

			//first unselect all previously highlighted elements
			this.clearSelection();

			//update selection in table
			this.table.update(subset.elements);

			d3.selectAll('.set-group').selectAll('.subset').each(function(d, i) {
				//console.log("d ", d, "i ", i);

				cx = d3.select(this).attr("cx");
				cy = d3.select(this).attr("cy");
				r = d3.select(this).attr("r");

				//mark the clicked element as selected
				if (d.set_name == subset.set_name && d.degree == subset.degree) {
					d3.select(this)
						.classed("selected", true);

					set_ids.push(parseInt(d3.select(this.parentNode).attr("data-set")));
				} else {
					if (typeof set_occurrence_map[d.set_name] !== "undefined" && typeof set_occurrence_map[d.set_name][d.degree] !== "undefined") {
						//console.log("is ok ", this);

						//add additional class for advanced tooltip
						d3.select(this).classed("segment-tooltip", true);

						segment_percentage = vis.helpers.calcSegmentPercentage(subset, d) * 100;

						arc
							.innerRadius(4)
							.outerRadius(6)
							.startAngle(0)
							.endAngle(self.scales.radianToPercent(segment_percentage));

						d3.select(this.parentNode).append("path")
							.attr("d", arc)
							.attr("class", "highlight-segment")
							.attr("transform", "translate(8," + cy + ")");

						set_ids.push(parseInt(d3.select(this.parentNode).attr("data-set")));
					}
				}

			});

			this.highlightSetLabels(set_ids);
			this.highlightDegreeLabel(subset.degree);
		},
		getCanvasHeight: function() {
			return parseInt(d3.select('#canvas svg').attr("height"));
		},
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
		expandRow: function(d, i, renderer) {
			var degree_count = d.length,
				label_yPos = d3.transform(d3.select(this).attr("transform")).translate[1],
				binIndex = i,
				additional_height = renderer.settings.set.height * degree_count;

			//console.log("additional_height ", additional_height);

			//clear selection first otherwise selection gets messed up during row expanding
			renderer.clearSelection();

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

			var yLabelGroups = d3.selectAll('.y-label-group')
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
					if (Math.abs(binIndex - i - vis.data.bins.k) % vis.data.bins.k == 0) {
						return "y-label-group expanded";
					} else {
						return d3.select(this).attr("class");
					}
				});

			renderer.arrangeLabels();

			var aggregates = d3.selectAll('.aggregate')
				.attr("cy", function(d, i) {
					if (parseInt(d3.select(this).attr("cy")) > label_yPos) {
						return parseInt(d3.select(this).attr("cy")) + additional_height;
					} else {
						return parseInt(d3.select(this).attr("cy"));
					}
				})
				.attr("class", function(d, i) {
					if (parseInt(d3.select(this).attr("data-bin")) == binIndex && d.count > 0) {
						var isExpanded = d3.select(this).classed("expanded");
						if (!isExpanded) {
							d3.select(this).classed("expanded", true);
						}
					}
					return d3.select(this).attr("class");
				});

			renderer.appendSubsets();

			//update canvas height
			renderer.setCanvasHeight(renderer.getCanvasHeight() + renderer.no_set_groups * additional_height);

			//re-add selection if one exists
			if (renderer.selectedSubset) {
				renderer.selectSubset(renderer.selectedSubset);
			}
		},
		appendSubsets: function() {
			var self = this;

			d3.selectAll('.subset')
				.remove();

			d3.selectAll('.aggregate.expanded').each(function(d, i) {

				var subset_y_pos = parseInt(d3.select(this).attr("cy")),
					subset_x_pos = parseInt(d3.select(this).attr("cx")),
					bin_entries = d3.select(this).data()[0].subsets;

				//console.log("this ", this);
				//console.log("bin_entries ", bin_entries);

				d3.select(this.parentNode).selectAll('.subset.level-' + i)
					.data(bin_entries)
					.enter()
					.append("circle")
					.attr("class", "subset level-" + i)
					.attr("cx", subset_x_pos)
					.attr("cy", function(d, i) { return subset_y_pos + (i + 1) * self.settings.set.height; })
					.attr("r", function(d) { return d.count > 0 ? self.settings.subset.r * 0.75 : 0; }) //set radius to 0 for subsets with 0 elements
					.attr("display", function(d) { return d.count > 0 ? null : "none"; }) //don't show subsets with 0 elements
					//.attr("fill", function(d) { return d.count > 0 ? self.settings.colors[Math.ceil(self.scales.color(d.count))] : "#FFFFFF"; });
					.attr("fill", function(d) { return d.count > 0 ? self.scales.color(d.count) : "#FFFFFF"; });
			});

			//handler for appended subsets
			d3.selectAll('.subset')
				.on("mouseover", function(d, i) {
					//console.log("d ", d);
					var that = this;

					//delay mouseover event for 500ms
					delay = setTimeout(function() {
						var xPos = parseFloat($(that).offset().left) - (self.tooltip.getWidth()/2 + self.getTotalSetWidth()/2 - self.settings.subset.r/2),
							yPos = parseFloat($(that).offset().top) + 3 * self.settings.subset.r;

						//tooltip showing text and selection
						if (d3.select(that).classed("segment-tooltip")) {
							var segment_percentage = vis.helpers.calcSegmentPercentage(self.selectedSubset, d) * 100;

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
				.on("click", function(subset) {
					self.selectedSubset = subset;
					self.selectSubset(subset);
				});

		},
		collapseRow: function(d, i, renderer) {
			var degree_count = d.length,
				label_yPos = d3.transform(d3.select(this).attr("transform")).translate[1],
				binIndex = i,
				additional_height = renderer.settings.set.height * degree_count;

			//clear selection first otherwise selection gets messed up during row expanding
			renderer.clearSelection();

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

			var yLabelGroups = d3.selectAll('.y-label-group')
				.attr("transform", function(d, i) {
					var prev = d3.transform(d3.select(this).attr("transform")).translate[1];

					if (prev > label_yPos) {
						return "translate(0," + (prev - additional_height) + ")";
					} else {
						return "translate(0," + prev + ")";
					}
				})
				.attr("class", function(d, i) {
					if (Math.abs(binIndex - i - vis.data.bins.k) % vis.data.bins.k == 0) {
						return "y-label-group collapsed";
					} else {
						return d3.select(this).attr("class");
					}
				});

			renderer.arrangeLabels();

			d3.selectAll('.aggregate')
				.attr("cy", function(d, i) {
					if (parseInt(d3.select(this).attr("cy")) > label_yPos) {
						return parseInt(d3.select(this).attr("cy")) - additional_height;
					} else {
						return parseInt(d3.select(this).attr("cy"));
					}
				})
				.attr("class", function(d, i) {
					if (parseInt(d3.select(this).attr("data-bin")) == binIndex && d.count > 0) {
						var isExpanded = d3.select(this).classed("expanded");
						if (isExpanded) {
							d3.select(this).classed("expanded", false);
						}
					}
					return d3.select(this).attr("class");
				});

			renderer.appendSubsets();

			renderer.setCanvasHeight(renderer.getCanvasHeight() - additional_height);

			//re-add selection if one exists
			if (renderer.selectedSubset) {
				renderer.selectSubset(renderer.selectedSubset);
			}
		},
		highlightSetLabels: function(set_ids) {
			d3.selectAll('.x-label')
				.attr("class", function(d, i) {
					if ($.inArray(i, set_ids) != -1) {
						d3.select(this).classed("highlighted", true);
					}
					return d3.select(this).attr("class");
				});
		},
		highlightDegreeLabel: function(degree) {
			d3.selectAll('.degree-label')
				.attr("class", function(d) {
					if (d == degree) {
						d3.select(this).classed("highlighted", true);
					}
					return d3.select(this).attr("class");
				});
		},
		renderSets: function() {

			//TODO: remove --> just added for testing
			//this.max_sets_per_group = 10;

			var self = this,
				transposed = vis.helpers.transpose(this.aggregated_bin_data),
				data_per_setGroup = vis.helpers.chunk(transposed, Math.ceil(this.max_sets_per_group)),
				data_y_axis = createYAxisLabelData();

			console.log("aggregated_bin_data ", this.aggregated_bin_data);

			function createYAxisLabelData() {
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
			}

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
				var sets = d3.select(this).selectAll(".set")
					.data(data_per_setGroup[i])
					.enter().append("g")
					.attr("class", "set")
					.attr("transform", function(d, i) {
						//console.log("d ", d, "i ", i);
						return "translate(" + self.scales.x(i) + ", 0)";
					})
					.attr("data-set", function(d, i) {
						//console.log("d ", d, "i ", i);
						return i + parseInt(d3.select(this.parentNode).attr("data-set-group")) * self.max_sets_per_group;
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

			function drawAggregates(aggregate) {
				var delay;
				var circle = d3.select(this).selectAll('.aggregate')
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
					.style("fill", function(d) { return self.scales.color(d.getTotalElements()); })
					.on("mouseover", onMouseover)
					.on("mouseout", onMouseout)
					.on("click", selectHandler);

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

				function selectHandler(aggregate, rowIndex) {
					//console.log("aggregate ", aggregate, "rowIndex ", rowIndex);

					var degree = rowIndex + 1;
					//var elements = subset.getElementNames();

					self.selectAggregate(aggregate, degree);
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
					.data(data_y_axis)
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
					//console.log("bin ", bin, "idx ", idx);

					//expand row
					if (!d3.select(this).classed("expanded")) {
						self.expandRow.call(this, bin, idx, self);
					} else {
						//collapse row
						self.collapseRow.call(this, bin, idx, self);
					}
				});

			}

		}
	};

	function BinningView(initializer) {
		var self = this;
		this.setRenderer = initializer.setRenderer;
		this.container = initializer.container;
		this.binConfigurator = new vis.BinConfigurator({
			container: '.custom-bins',
			bins: vis.data.bins,
			onSaveCallback: function() {
				console.log("save callback with renderer ", self.setRenderer);

				self.setRenderer
					.init()
					.render();
			}
		});
	}

	BinningView.prototype = {
		render: function() {
			var html = '<div class="modal-dialog modal-lg">' +
				'<div class="modal-content">' +
				'<div class="modal-header">' +
				'<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
				'<h4 class="modal-title">Edit <span class="semi-bold">Binning</span></h4>' +
				'</div>' +
				'<div class="modal-body">' +
				'<div class="ui-container">' +
				'<div class="ui-row">' +
				'<div class="ui-column degree-hist"><h5>Elements <span class="semi-bold">per Degree</span></h5></div>'+
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
		renderHistogram: function() {
			var elements_per_degree = vis.helpers.getElementsPerDegree(vis.data.grid),
				data = elements_per_degree.getList();

			var margin = { left: 20, top: 10  },
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
				.attr("transform", function(d, i) { return "translate(" + margin.left + ", " + margin.top + ")"; });

			var bar = chart.selectAll("g")
				.data(data)
				.enter().append("g")
				.attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

			bar.append("rect")
				.attr("width", xScale)
				.attr("height", barHeight - 1)
				.attr("y", -barHeight / 2);

			bar.append("text")
				.attr("x", function(d) { return xScale(d) - 3; })
				.attr("dy", ".35em")
				.text(function(d) { return d > 0 ? d : ""; });

			var	yAxis = d3.svg.axis()
				.orient('left')
				.scale(yScale)
				.tickSize(2)
				.tickFormat(function(d, i){ return i + 1; })
				.tickValues(d3.range(data.length));

			chart.append('g')
				.attr("transform", "translate(0,0)")
				.attr('class','yaxis')
				.call(yAxis);

		}
	};

	vis.Renderer = Renderer;

	return vis;

})(SetVis || {});