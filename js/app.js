(function($) {

	//global namespace
	scets.data = {
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

		new scets.DataNavigator({
			container: "#dataNavigator",
			loader: "#loader",
			onSelectCallback: function (data) {
				scets.data.selectedFile = data.file;
			},
			onUploadCallback: function (data) {
				scets.data.selectedFile = data.file;
			},
			onLoadedCallback: function(resp) {

				if (resp.result && resp.result) {
					var sets = resp.result.sets,
						elements = resp.result.elements,
						tmp = { sets: [], elements: [] };

					//extend the global scets variable and delete sets and elements as we create new instances below
					$.extend(scets.data, resp.result);
					delete scets.data.sets;
					delete scets.data.elements;

					console.log("scets.data :: ", scets.data);

					//create sets
					for (var i = 0, len = sets.length, s; i < len; i++) {
						s = new scets.Set(sets[i].name);
						s.count = sets[i].count;
						tmp.sets.push(s);
					}

					//create elements
					for (var i = 0, len = elements.length, e; i < len; i++) {
						e = new scets.Element(elements[i].id, elements[i].name);
						e.sets = elements[i].sets;
						e.degree = elements[i].degree;
						tmp.elements.push(e);
					}

					$.extend(scets.data, tmp);

					//create full grid
					scets.data.fullGrid = scets.helpers.createFullGrid();

					//also save a copy of the raw/default sets we can use for sorting later on
					scets.data.sets_default_sorted = scets.data.sets;

					console.log("scets.data :: after adding sets and elements ", scets.data);

					//initialize bins
					scets.data.bins.k = scets.data.grid.length >= scets.data.bins.k ? scets.data.bins.k : scets.data.grid.length;
					scets.data.bins.ranges = scets.helpers.initBins(scets.data.grid, scets.data.bins.k);

					//classify bin data
					scets.helpers.classifyBinData(this.data);
				}

				$(this.loader).velocity("transition.fadeOut");
				$("#wrapper").velocity("transition.slideUpIn", {
					complete: function () {
						var renderer = new scets.Renderer();
						renderer.render();
					}
				});
			}
		});

	});

})(jQuery);