/**
 * Created by martinwortschack on 05/11/14.
 */
var SetVis = (function(vis) {

    vis.helpers = {
        //creates an array of length n, starting from 0 to n
        createZeroToNArray: function(n) {
            return Array.apply(null, {length: n}).map(Number.call, Number);
        },
        chunk: function(arr, chunk_size) {
            var groups = arr.map( function(e, i) {
                return i % chunk_size === 0 ? arr.slice(i , i + chunk_size) : null;
            }).filter(function(e) { return e; });
            return groups;
        }
    };

    return vis;

})(SetVis || {});