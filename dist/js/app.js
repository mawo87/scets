(function($) {

    $(function() {

        //SetVis.init();

        var parser = new SetVis.Parser();

        parser.loadSet("../data/skillmat.json")
        //parser.loadSet("../data/movies.json")
        //parser.loadSet("../data/skillmatrix_final.json")
            .done(function(setFile) {
                parser.parseFile(setFile.data);

                var renderer = new SetVis.Renderer();
                renderer.render();
            })
            .fail(function(error) {
                console.log("error ", error);
            });

    });

})(jQuery);