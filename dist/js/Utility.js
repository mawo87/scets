/**
 * Created by martinwortschack on 05/11/14.
 */
var SetVis = (function(vis) {

    vis.helpers = {
        /*
         * creates an array of length n, starting from 0 to n
         */
        createZeroToNArray: function(n) {
            return Array.apply(null, {length: n}).map(Number.call, Number);
        },
        /*
         * splits array into chunks of size n
         * see: http://stackoverflow.com/questions/8495687/split-array-into-chunks/10456644#10456644
         */
        chunk: function(arr, chunk_size) {
            var groups = arr.map( function(e, i) {
                return i % chunk_size === 0 ? arr.slice(i , i + chunk_size) : null;
            }).filter(function(e) { return e; });
            return groups;
        },
        getElementsGroupedBySetAndDegree: function (subset) {
            var elements = subset.elements,
                set_occurrence_map = {};

            for (var i = 0, len = elements.length; i < len; i++) {
                var el = elements[i];
                for (var j = 0, l = el.sets.length; j < l; j++) {
                    var set_name = el.sets[j];
                    if (typeof set_occurrence_map[set_name] === "undefined") {
                        set_occurrence_map[set_name] = { set: set_name, count: 1 };
                    } else {
                        set_occurrence_map[set_name].count++;
                    }

                    if (typeof set_occurrence_map[set_name][el.degree] === "undefined") {
                        set_occurrence_map[set_name][el.degree] = { degree: el.degree, count: 1 };
                    } else {
                        set_occurrence_map[set_name][el.degree].count ++;
                    }
                }
            }

            return set_occurrence_map;
        },
        getElementsPerDegree: function(arr) {
            var result = [],
                maxEntriesCount = 0,
                sum;

            for (var i = 0, len = arr.length; i < len; i++) {
                sum = 0;
                for (var j = 0, l = arr[i].length; j < l; j++) {
                    sum += arr[i][j];
                }

                if (sum > maxEntriesCount) {
                    maxEntriesCount = sum;
                }

                result.push(sum);
            }

            return {
                getList: function() { return result; },
                getMaxEntriesCount: function() { return maxEntriesCount; }
            };
        }
    };

    return vis;

})(SetVis || {});