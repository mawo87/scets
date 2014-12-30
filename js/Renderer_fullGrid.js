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
                    left: 60
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
            color: {
                range: ['#FFF7FB', '#023858']
            }
        };
        this.max_sets_per_group = 0;
        this.no_set_groups = 0;
        this.xScale = undefined;
        this.yScale = undefined;
        this.colorScale = undefined;
        this.data = [];
	      this.degreeHist = [];
	      this.bins = {
		        k: 5, //number of desired bins
		        start: [],
		        end: [],
		        data: []
	      };
        this.init();
    }

    Renderer.prototype = {
        init: function() {
            var self = this;
            //this.data = new vis.Parser().helpers.transpose(vis.data.grid);
            this.data = vis.data.fullGrid;
            this.max_sets_per_group = this.settings.canvas.width / this.getTotalSetWidth();

	          //compute degree histogram
	          var elements_per_degree = vis.helpers.getElementsPerDegree(vis.data.grid);
		        this.degreeHist = elements_per_degree.getList();

	          //initialize bins
	          this.initializeBins();

            this.binningView = new BinningView({
                setRenderer: this,
                container: "#binningViewModal"
            });

            this.setupControls();

            initScales();

            function initScales() {
                self.colorScale = d3.scale.linear()
                    .domain([vis.data.min, vis.data.max])
                    .range(self.settings.color.range);

                self.xScale = d3.scale.ordinal()
                    .rangeBands([0, self.settings.canvas.width])
                    .domain(d3.range(self.max_sets_per_group));

                self.yScale = d3.scale.ordinal()
                    .rangeBands([0, self.getSetInnerHeight()])
                    .domain(d3.range(self.bins.k));
            }
        },
	      initializeBins: function() {
						var H = this.degreeHist, //histogram data
								n = H.reduce(function(a, b) { return a + b; }), //total number of elements across all degrees
								b = vis.data.maxDegree; //max degree in histogram data

		        //console.log("H ", H, "n ", n , "b ", b);

		        var ind = 0,
			          leftElements = n,
			          binSize,
			          s;

		        for (var bin = 0; bin < this.bins.k; bin++) {
			          this.bins.start[bin] = ind;
			          binSize = H[ind];
			          s = leftElements / (this.bins.k - bin);
			          while ((ind < n - 1) && (binSize + H[ind + 1] <= s)) {
				            ind++;
				            binSize += H[ind];
			          }
			          this.bins.end[bin] = ind;
			          leftElements -= binSize;
			          ind++;
		        }

		        this.classifyData();

		        console.log("bins initialized ", this.bins);
	      },
	      classifyData: function() {
			      var gridData = vis.helpers.transpose(vis.data.fullGrid);
			      for (var i = 0; i < this.bins.k; i++) {
				        var counter = this.bins.start[i];
				        while (counter <= this.bins.end[i]) {
					          if (typeof this.bins.data[i] === "undefined") {
						            this.bins.data[i] = [];
					          }
					          this.bins.data[i].push(gridData[counter]);
					          counter++;
				        }
		        }
	      },
        setupControls: function() {
            var self = this;

            //setup modal window for binning
            $('#binningViewModal').modal({ show: false });

            $('.ui-controls .btn-edit-binning').on("click", function() {
                self.binningView.render();
                $('#binningViewModal').modal('show');
            });
        },
        render: function() {
            var self = this,
                width = this.settings.canvas.width,
                height = this.settings.canvas.height;

            this.svg = d3.select('#canvas').append("svg")
                .attr("width", width + self.settings.canvas.margin.left)
                .attr("height", height)
                .style("margin-left", -self.settings.canvas.margin.left + "px")
                .append("g")
                .attr("transform", "translate(" + self.settings.canvas.margin.left + "," + self.settings.canvas.margin.top + ")");

            this.renderSets();

            var no_of_set_groups = Math.ceil(this.data.length / this.max_sets_per_group),
                canvasHeight = (this.getSetOuterHeight() + this.settings.canvas.margin.top) * no_of_set_groups;

            this.setCanvasHeight(canvasHeight);
        },
        getTotalSetWidth: function() {
            return this.settings.set.width + 2 * this.settings.set.stroke + this.settings.set.margin.right;
        },
        getSetInnerHeight: function() {
            return this.bins.k * this.settings.set.height;
        },
        getSetOuterHeight: function() {
            return this.getSetInnerHeight() + 2 * this.settings.set.stroke;
        },
        clearSelection: function() {
            d3.selectAll('.subset.selected').remove();
            d3.selectAll('.subset.hidden').classed("hidden", false);
        },
	      selectAggregate: function(aggregate) {
		        console.log("aggregate ", aggregate);
	      },
        selectSubset: function(subset) {
	          console.log("subset ", subset);

            var set_occurrence_map = vis.helpers.getElementsGroupedBySetAndDegree(subset),
                table = new vis.Table({ container: "#element-table", tableClass: "table table-bordered" });

            //console.log("vis.helpers.getElementsGroupedBySetAndDegree ", vis.helpers.getElementsGroupedBySetAndDegree(subset));

            //first unselect all previously selected elements
            this.clearSelection();

            table.update(subset.elements);

            d3.selectAll('.set-group').selectAll('.subset').each(function(d, i) {
                //console.log("d ", d, "i ", i);

                if (typeof set_occurrence_map[d.set_name] !== "undefined" && typeof set_occurrence_map[d.set_name][d.degree] !== "undefined") {
                    //console.log("is ok ", this);

                    var cx = d3.select(this).attr("cx"),
                        cy = d3.select(this).attr("cy"),
                        r = d3.select(this).attr("r");

                    d3.select(this).classed("hidden", true);

                    d3.select(this.parentNode)
                        .append("circle")
                        .attr("class", "subset selected")
                        .attr("cx", cx)
                        .attr("cy", cy)
                        .attr("r", r);
                }

            });
        },
        getCanvasHeight: function() {
            return parseInt(d3.select('#canvas svg').attr("height"));
        },
        setCanvasHeight: function(height) {
            d3.select('#canvas svg').attr("height", height);
        },
	      arrangeLabels: function() {
		      var self = this,
			        yLabels = d3.selectAll('.y-label.expanded');

		      d3.selectAll('.degree-label')
			        .remove();

		      yLabels.each(function(d, i) {
			        var lbl = this;
				      d3.select(this.parentNode).selectAll('.degree-label' + ' bin-' + (i + 1))
					        .data(d3.select(this).data()[0])
						      .enter()
						      .append("text")
						      .attr("class", "degree-label bin-" + (i+1))
					        .attr("x", -6)
					        .attr("y", function(d, i) {
						          return parseInt(d3.select(lbl).attr("y")) + (i + 1) * self.settings.set.height;
					        })
					        .attr("dy", ".32em")
					        .attr("text-anchor", "end")
					        .text(function(d, i) { return d; });

			      });
	      },
	      expandRow: function(d, i, renderer) {
	          var degree_count = d.length,
			          label_yPos = parseInt(d3.select(this).attr("y")),
			          labelIndex = i,
			          additional_height = renderer.settings.set.height * degree_count;

		        console.log("additional_height ", additional_height);

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


			      var yLabels = d3.selectAll('.y-label')
					      .attr("y", function(d, i) {
						        if (parseInt(d3.select(this).attr("y")) > label_yPos) {
							          return parseInt(d3.select(this).attr("y")) + additional_height;
						        } else {
							          return parseInt(d3.select(this).attr("y"));
						        }
					      })
					      .attr("class", function(d, i) {
						        //sets the expanded resp. collapsed class for the given bin in all set groups
						        if (Math.abs(labelIndex - i - renderer.bins.k) % renderer.bins.k == 0) {
							          return "y-label expanded";
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
										if (parseInt(d3.select(this).attr("data-bin")) == labelIndex && d.count > 0) {
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
				            .attr("r", function(d) { return d.count > 0 ? self.settings.subset.r : 0; }) //set radius to 0 for subsets with 0 elements
				            .attr("display", function(d) { return d.count > 0 ? null : "none"; }) //don't show subsets with 0 elements
				            .attr("fill", function(d) { return d.count > 0 ? self.colorScale(d.count) : "#FFFFFF"; });
		        });

		        //click handler for newly added subsets
		        d3.selectAll('.subset').on("click", function(subset){
				        self.selectSubset(subset);
			      });

	      },
	      collapseRow: function(d, i, renderer) {
		        var degree_count = d.length,
			          label_yPos = parseInt(d3.select(this).attr("y")),
			          labelIndex = i,
			          additional_height = renderer.settings.set.height * degree_count;

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

			      d3.selectAll('.y-label')
				        .attr("y", function(d, i) {
					          console.log("i ", i);
					          if (parseInt(d3.select(this).attr("y")) > label_yPos) {
						            return parseInt(d3.select(this).attr("y")) - additional_height;
					          } else {
						            return parseInt(d3.select(this).attr("y"));
					          }
				        })
				        .attr("class", function(d, i) {
					          if (Math.abs(labelIndex - i - 5) % 5 == 0) {
						            return "y-label collapsed";
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
						        if (parseInt(d3.select(this).attr("data-bin")) == labelIndex && d.count > 0) {
							          var isExpanded = d3.select(this).classed("expanded");
							          if (isExpanded) {
								            d3.select(this).classed("expanded", false);
							          }
						        }
						        return d3.select(this).attr("class");
					      });

		        renderer.appendSubsets();

			      renderer.setCanvasHeight(renderer.getCanvasHeight() - additional_height);
	      },
        renderSets: function() {

            //TODO: remove --> just added for testing
            //this.max_sets_per_group = 10;

            var self = this,
	              aggregated_bin_data = createAggregatedData(this.bins.data),
	              transposed = vis.helpers.transpose(aggregated_bin_data),
	              data_per_setGroup = vis.helpers.chunk(transposed, Math.ceil(this.max_sets_per_group)),
	              data_y_axis = createYAxisLabelData();

	          console.log("aggregated_bin_data ", aggregated_bin_data);

	          function createYAxisLabelData() {
		            var result = [];
		            for (var i = 0; i < self.bins.k; i++) {
			              var arr = [],
				                counter = self.bins.start[i];
			              while (counter <= self.bins.end[i]) {
				                arr.push(counter+1);
				                counter++;
			              }
			              result.push(arr);
		            }

		            return result;
	          }

	          console.log("this.bins ", this.bins);

	          function createAggregatedData(data) {
		            function Aggregate() {
			              this.count = 0;
			              this.subsets = [];
		            }

		            Aggregate.prototype = {
			              addSubset: function(subset) {
				                this.subsets.push(subset);
				                this.count += subset.count;
			              }
		            };

		            var gridData = vis.helpers.transpose(vis.data.fullGrid),
			              result = d3.range(data.length).map(function(i) {
				                return Array.apply(null, new Array(gridData[0].length)).map(function(d) {
					                  return new Aggregate();
				                });
		                });

		            console.log("data ", data);

		            for (var i = 0, len = data.length, current_block; i < len; i++) {
										current_block = data[i];
			              for (var j = 0, l = current_block.length; j < l; j++) {
				                for (var x = 0, innerLength = current_block[j].length; x < innerLength; x++) {
					                  result[i][x].addSubset(current_block[j][x]);
				                }
			              }
		            }

		            return result;
	          }

	          console.log("createAggregatedData ", createAggregatedData(this.bins.data));

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
            setGroups.each(renderLabels);

            function renderSets(d, i) {
                var sets = d3.select(this).selectAll(".set")
                    .data(data_per_setGroup[i])
                    .enter().append("g")
                    .attr("class", "set")
                    .attr("transform", function(d, i) {
		                    //console.log("d ", d, "i ", i);
                        return "translate(" + self.xScale(i) + ", 0)";
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
                    .attr("height", self.bins.k * self.settings.set.height);
            }

            function drawAggregates(set) {
                var delay;
                var circle = d3.select(this).selectAll('.aggregate')
                    .data(set)
                    .enter()
                    .append("circle")
                    .attr("class", "aggregate")
                    .attr("cx", self.settings.set.width/2)
                    .attr("cy", function(d, i) { return self.yScale(i) + self.settings.set.height / 2; })
                    .attr("r", function(d) { return d.count > 0 ? self.settings.subset.r : 0; }) //set radius to 0 for aggregates with 0 elements
                    .attr("display", function(d) { return d.count > 0 ? null : "none"; }) //don't show aggregates with 0 elements
                    .attr("data-bin", function(d, i) { return i; })
                    .style("fill", function(d) { return self.colorScale(d.count); })
                    .on("mouseover", onMouseover)
                    .on("mouseout", onMouseout)
                    .on("click", selectHandler);

                function onMouseover(d, i) {
                    var that = this;

                    //delay mouseover event for 500ms
                    delay = setTimeout(function() {
                        var $tooltip = $('#tooltip'),
                            itemCount = d.count,
                            degree = i,
                            text = "",
                            xPos = parseFloat($(that).offset().left) - ($tooltip.width()/2 + self.getTotalSetWidth()/2 - self.settings.subset.r/2),
                            yPos = parseFloat($(that).offset().top) + 3 * self.settings.subset.r;

                        if (degree > 0) {
                            text = "Items shared with " + degree + " other sets: " + itemCount;
                        } else {
                            text = "Unique items in this set: " + itemCount;
                        }

                        //tooltips
                        d3.select('#tooltip')
                            .style("left", xPos + "px")
                            .style("top", yPos + "px")
                            .text(text)
                            .classed("hidden", false);

                    }, 500);
                }

                function onMouseout() {
                    clearTimeout(delay);
                    d3.select('#tooltip')
                        .classed("hidden", true);
                }

                function selectHandler(aggregate, rowIndex) {
		                //console.log("aggregate ", aggregate, "rowIndex ", rowIndex);

		                var degree = rowIndex + 1;
	                  //var elements = subset.getElementNames();

		                self.selectAggregate(aggregate, degree);
                }

            }

            function renderLabels(setGroup, index) {
                var data_x_axis = vis.data.sets.slice(index * self.max_sets_per_group, index * self.max_sets_per_group + self.max_sets_per_group);

                //render labels for y axis (add labels to given group)
                d3.select(this).selectAll('.y-label')
                    .data(data_y_axis)
                    .enter().append("text")
                    .attr("class", "y-label")
                    .classed("collapsed", true)
                    .attr("x", -6)
                    .attr("y", function(d, i) { return i * self.settings.set.height + self.settings.subset.r + 3; })
                    .attr("dy", ".32em")
                    .attr("text-anchor", "end")
                    .text(function(d, i) { return "[" + d[0] + " - " + d[d.length - 1] + "]" ; })
                    .on("click", binClickHandler);

                //render labels for x axis
                d3.select(this).selectAll('.x-label')
                    .data(data_x_axis)
                    .enter().append("text")
                    .attr("class", "x-label")
                    .attr("transform", function(d, i) {
                        return "rotate(-90)";
                    })
                    .attr("x", 6)
                    .attr("y", function(d, i) { return self.xScale(i) + 7; })
                    .attr("dy", ".32em")
                    .attr("text-anchor", "start")
                    .text(function(d, i) { return d.name; });

                function binClickHandler(d, i) {
                    //expand row
                    if (!d3.select(this).classed("expanded")) {
	                      self.expandRow.call(this, d, i, self);
                    } else {
										//collapse row
	                      self.collapseRow.call(this, d, i, self);
                    }
                }
            }

        }
    };

    function BinningView(initializer) {
        this.setRenderer = initializer.setRenderer;
        this.container = initializer.container;
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