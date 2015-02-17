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

	$(function() {

		//var parser = new scats.Parser();

		(function() {
			//$.getJSON("../data/skillmatrix_final.json", function(json) {
			$.getJSON("../data/skillmat.json", function(json) {
				onSetDescriptionLoaded(json);
			});

			function onSetDescriptionLoaded(setDescription) {
				d3.text(setDescription.file, "text/csv", function(data) {
					getVisData(setDescription, data);
				});
			}

			function getVisData(setDescription, rawText) {
				var url = "http://localhost:8080/api",
					data = { set_description: setDescription, data: rawText };

				$.ajax({
					type: "POST",
					url: url + "/upload",
					data: data,
					success: function(resp) {
						console.log("getVisData success :: ", resp);
						if (resp && resp.success) {
							onSuccess(resp);
						}
					},
					error: function(err) {
						console.log("getVisData error :: ", err);
					}
				});
			}

			function onSuccess(resp) {
				if (resp.result && resp.result) {
					var sets = resp.result.sets,
						elements = resp.result.elements,
						tmp = { sets: [], elements: [] };

					$.extend(scats.data, resp.result);
					delete scats.data.sets;

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

					var renderer = new scats.Renderer();
					renderer.render();

					var renderer = new scats.Renderer();
					renderer.render();

				}
			}
		})();

		/*
		parser.loadSet("../data/skillmat.json")
		//parser.loadSet("../data/movies.json")
		//parser.loadSet("../data/skillmatrix_final.json")
			.done(function(setFile) {
				parser.parseFile(setFile.data);

				var renderer = new scats.Renderer();
				renderer.render();
			})
			.fail(function(error) {
				console.log("error ", error);
			});
		*/

	});

})(jQuery);