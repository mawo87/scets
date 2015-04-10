(function($) {

	//global namespace
	scats.data = {
		sets: [],
		elements: [],
		aggregates: [],
		grid: [],
		fullGrid: [],
		degreeVector: [],
		max: 0,
		min: 0,
		maxDegree: 0,
		bins: {
			k: 5,
			data: [],
			ranges: []
		}
	};

	var scatsApi = {
			baseUrl: function() {
				return "http://localhost:8080/api";
			},
			getExampleList: function () {
				var self = this,
					deferred = $.Deferred();

				$.ajax({
					type: "GET",
					dataType: "json",
					url: self.baseUrl() + "/examples",
					success: function (resp) {
						deferred.resolve(resp);
					}
				});

				return deferred.promise();
			},
			loadExample: function (fileName) {
				var self = this,
					deferred = $.Deferred();

				$.ajax({
					type: "GET",
					dataType: "json",
					url: self.baseUrl() + "/examples/" + fileName,
					success: function (resp) {
						deferred.resolve(resp);
					},
					error: function (err) {
						deferred.reject(err);
					}
				});

				return deferred.promise();
			},
			upload: function (data) {
				var self = this,
					deferred = $.Deferred();

				$.ajax({
					type: "POST",
					url: self.baseUrl() + "/upload",
					data: data,
					success: function(resp) {
						console.log("getVisData success :: ", resp);
						deferred.resolve(resp);
					},
					error: function(err) {
						console.log("getVisData error :: ", err);
						deferred.reject(err);
					}
				});

				return deferred.promise();
			}
	};

	function DataNavigator(initializer) {
		this.container = initializer.container;
		this.loader = initializer.loader;
		this.dataSets = initializer.dataSets || [];
		this.onLoadedCallback = initializer.onLoadedCallback || $.noop();
		this.templates = {
			main: function(dataSets) {
				var sorted = _.sortBy(dataSets, "title"),
					html = "<div class='data-navigator lg'>";
				html += '<h3>Select a data set<h3>';
				html += "<select class='form-control' id='fileSelect'>";
				_.each(sorted, function(d, i) {
					html += "<option value='" + d.name + "'>" + d.title + "</option>";
				});
				html += "</select>";
				html += "<button class='btn btn-primary' id='loadBtn'>Load</button>"
				html += "</div>";
				return html;
			},
			small: function() {

			}
		};
		this.init();
	}

	DataNavigator.prototype.init = function() {
		var self = this;
		scatsApi.getExampleList()
			.done(function(resp) {
				console.log("GOT EXAMPLES :: ", resp);

				if (resp.success) {
					self.setDataSets(resp.result);

					$(self.loader).hide();

					self.render(self.dataSets, "main");
				}
			});
	};

	DataNavigator.prototype.setDataSets = function(dataSets) {
		this.dataSets = dataSets;
	};

	DataNavigator.prototype.render = function(dataSets, templateName) {
		if (this.templates[templateName]) {
			$(this.container)
				.empty()
				.html(this.templates[templateName](dataSets));

			$(this.container).show();
		}

		this.attachEventHandler();

		return this;
	};

	DataNavigator.prototype.attachEventHandler = function() {
		var self = this;
		$(this.container).find("#loadBtn").click(function(e) {
			e.preventDefault();

			var file = $("#fileSelect").val();
			self.loadFile(file);
		});
	};

	DataNavigator.prototype.loadFile = function(file) {
		var self = this;

		$(this.container).hide();
		$(this.loader).show();

		scatsApi.loadExample(file)
			.done(function(resp) {

				$(self.loader).hide();

				if (resp.result && resp.result) {

					globalOnLoadHandler(resp);

					if (self.onLoadedCallback) {
						self.onLoadedCallback.call(self, resp);
					}
				}

			});
	};

	function globalOnLoadHandler (resp) {
		if (resp.result && resp.result) {
			var sets = resp.result.sets,
				elements = resp.result.elements,
				tmp = {sets: [], elements: []};

			//extend the global scats variable and delete sets and elements as we create new instances below
			$.extend(scats.data, resp.result);
			delete scats.data.sets;
			delete scats.data.elements;

			console.log("scats.data :: ", scats.data);

			//create sets
			for (var i = 0, len = sets.length, s; i < len; i++) {
				s = new scats.Set(sets[i].name);
				s.count = sets[i].count;
				tmp.sets.push(s);
			}

			//create elements
			for (var i = 0, len = elements.length, e; i < len; i++) {
				e = new scats.Element(elements[i].id, elements[i].name);
				e.sets = elements[i].sets;
				e.degree = elements[i].degree;
				tmp.elements.push(e);
			}

			$.extend(scats.data, tmp);

			console.log("scats.data :: after adding sets and elements ", scats.data);

			//initialize bins
			scats.data.bins.k = scats.data.grid.length >= scats.data.bins.k ? scats.data.bins.k : scats.data.grid.length;
			scats.data.bins.ranges = scats.helpers.initBins(scats.data.grid, scats.data.bins.k);

			//classify bin data
			scats.helpers.classifyBinData(this.data);
		}
	}

	/* DataLoader */
	function DataLoader(initializer) {
		this.onLoadedCallback = initializer.onLoadedCallback || $.noop();
		this.dataUrl = "../data";
	}

	DataLoader.prototype = {
		load: function(url) {
			var self = this;
			$.getJSON(self.dataUrl + "/" + url, function(json) {
				self.onSetDescriptionLoaded(json);
			});
		},
		onSetDescriptionLoaded: function(setDescription) {
			var self = this;
			d3.text(self.dataUrl + "/" + setDescription.file, "text/csv", function(data) {
				self.getVisData(setDescription, data);
			});
		},
		getVisData: function(setDescription, rawText) {
			var self = this,
				data = { set_description: setDescription, data: rawText };

			scatsApi.upload(data)
				.done(function(resp) {
					if (resp && resp.success) {
						self.onSuccess(resp);
					}
				});
		},
		onSuccess: function(resp) {
			if (resp.result && resp.result) {

				globalOnLoadHandler(resp);

				if (this.onLoadedCallback) {
					this.onLoadedCallback.call(this);
				}
			}
		}
	};

	$(function() {

		$('#loader').show();
		//$('#main').hide()

		var dataNavigator = new DataNavigator({
			container: "#dataNavigator",
			loader: "#loader",
			onLoadedCallback: function() {
				$(this.loader).velocity("transition.fadeOut");
				$('#main').velocity("transition.slideUpIn", {
					complete: function () {
						var renderer = new scats.Renderer();
						renderer.render();
					}
				});
			}
		});

		var dataLoader = new DataLoader({
			onLoadedCallback: function() {

				console.log("ONLOADEDCALLBACK CALLED");

				$('#loader').velocity("transition.fadeOut");
				$('#main').velocity("transition.slideUpIn", {
					complete: function () {
						var renderer = new scats.Renderer();
						renderer.render();
					}
				});
			}
		});

		//dataLoader.load("skillmat.json");
		//dataLoader.load("skillmatrix_final.json");
		//dataLoader.load("movies.json");

	});

})(jQuery);