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

	function DataLoader(initializer) {
		this.url = initializer.url;
		this.onLoadedCallback = initializer.onLoadedCallback || $.noop();
	}

	DataLoader.prototype = {
		load: function() {
			var self = this;
			$.getJSON(this.url, function(json) {
				self.onSetDescriptionLoaded(json);
			});
		},
		onSetDescriptionLoaded: function(setDescription) {
			var self = this;
			d3.text(setDescription.file, "text/csv", function(data) {
				self.getVisData(setDescription, data);
			});
		},
		getVisData: function(setDescription, rawText) {
			var self = this,
				url = "http://localhost:8080/api",
				data = { set_description: setDescription, data: rawText };

			$.ajax({
				type: "POST",
				url: url + "/upload",
				data: data,
				success: function(resp) {
					console.log("getVisData success :: ", resp);
					if (resp && resp.success) {
						self.onSuccess(resp);
					}
				},
				error: function(err) {
					console.log("getVisData error :: ", err);
				}
			});
		},
		onSuccess: function(resp) {
			if (resp.result && resp.result) {
				var sets = resp.result.sets,
					elements = resp.result.elements,
					tmp = { sets: [], elements: [] };

				//extend the global scats variable and delete sets and elements as we create new instances below
				$.extend(scats.data, resp.result);
				delete scats.data.sets;
				delete scats.data.elements;

				console.log("scats.data :: ", scats.data);

				//create sets
				for (var i = 0, len = sets.length; i < len; i++) {
					tmp.sets.push(new scats.Set(sets[i].name, sets[i].count));
				}

				//create elements
				for (var i = 0, len = elements.length, e; i < len; i++) {
					var e = new scats.Element(elements[i].id, elements[i].name);
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

				if (this.onLoadedCallback) {
					this.onLoadedCallback.call(this);
				}

			}
		}
	};

	$(function() {

		$('#loader').show();
		$('#main').hide();

		var dataLoader = new DataLoader({
			url: "../data/skillmat.json",
			//url: "../data/skillmatrix_final.json",
			onLoadedCallback: function() {
				$('#loader').fadeOut();
				$('#main').fadeIn();

				var renderer = new scats.Renderer();
				renderer.render();
			}
		});

		dataLoader.load();

	});

})(jQuery);