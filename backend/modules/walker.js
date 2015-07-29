(function () {

  var fs = require("fs"),
      path = require('path'),
      config = require("./config.js");

  //recursive file walker
  var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var pending = list.length;
      if (!pending) return done(null, results);
      list.forEach(function(file) {
        file = path.resolve(dir, file);
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory() && config.data.excludedDir.indexOf(file.replace(/^.*[\\\/]/, '')) === -1) {
            walk(file, function(err, res) {
              results = results.concat(res);
              if (!--pending) done(null, results);
            });
          } else {
            if (file.match(/\.(json)$/)) {
              results.push(file);
            }
            if (!--pending) done(null, results);
          }
        });
      });
    });
  };

  module.exports = {
    walk: walk
  };

})();