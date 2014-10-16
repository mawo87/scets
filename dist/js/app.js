/**
 * Created by martinwortschack on 12.10.14.
 */

/*
d3.text('../data/movies.csv', function(datasetText) {
    var parsedCSV = d3.csv.parseRows(datasetText);

    var sampleHTML = d3.select('#main')
        .append('table')
        .style('border-collapse', 'collapse')
        .style('border', '2px solid black')

        .selectAll('tr')
        .data(parsedCSV)
        .enter().append('tr')

        .selectAll('td')
        .data(function(d) { return d; })
        .enter().append('td')

        .text(function(d) { return d; });

    console.log('test');
});
*/

(function($) {

    function loadCSV() {
        d3.csv("../data/skillmatrix.csv", function(data) {
            console.log(data[0]);
            //console.log(d3.entries(data[0]));

            for (var i = 0, len = data.length; i < len; i++) {
                data[i].skills = data[i].skills.split('|');
            }

            console.log(data);
        });
    }

    $(function() {
        console.log("document ready");

        loadCSV();

    });

})(jQuery);