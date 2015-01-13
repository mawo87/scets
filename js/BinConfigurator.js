/**
 * Created by martinwortschack on 13.01.15.
 */
var SetVis = (function(vis) {
  function BinConfigurator(initializer) {
    this.container = initializer.container;
    this.bins = initializer.bins;
    this.templates = {
      "binRow": function() {
        var html = '<div>' +
          '<input type="text" value=""/>' +
          '<';
      }
    };
  }

  BinConfigurator.prototype = {
    initialize: function() {
      for (var i = 0; i < this.bins.length; i++) {

      }
    }
  };

  function Bin() {

  }

  vis.BinConfigurator = BinConfigurator;

  return vis;

})(SetVis || {});