(function($) {

	$(function() {

		var parser = new scats.Parser();

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

	});

})(jQuery);