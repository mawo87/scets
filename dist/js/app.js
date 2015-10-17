(function($) {

	//global namespace
	scats.data = {
		selectedFile: "",
		sets: [],
		sets_default_sorted: [],
		elements: [],
		aggregates: [],
		grid: [],
		fullGrid: [],
		degreeVector: [],
		max: 0,
		min: 0,
		maxDegree: 0,
		sortType: "default", //default | name | quantity
		bins: {
			k: 5,
			data: [],
			ranges: []
		}
	};

	$(function() {

		$('#loader').show();
		//$('#main').hide();

		new scats.DataNavigator({
			container: "#dataNavigator",
			loader: "#loader",
			onSelectCallback: function (data) {
				scats.data.selectedFile = data.file;
			},
			onUploadCallback: function (data) {
				scats.data.selectedFile = data.file;
			},
			onLoadedCallback: function(resp) {

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

					//also save a copy of the raw/default sets we can use for sorting later on
					scats.data.sets_default_sorted = scats.data.sets;

					console.log("scats.data :: after adding sets and elements ", scats.data);

					//initialize bins
					scats.data.bins.k = scats.data.grid.length >= scats.data.bins.k ? scats.data.bins.k : scats.data.grid.length;
					scats.data.bins.ranges = scats.helpers.initBins(scats.data.grid, scats.data.bins.k);

					//classify bin data
					scats.helpers.classifyBinData(this.data);
				}

				$(this.loader).velocity("transition.fadeOut");
				$("#wrapper").velocity("transition.slideUpIn", {
					complete: function () {
						var renderer = new scats.Renderer();
						renderer.render();
					}
				});
			}
		});

	});

})(jQuery);