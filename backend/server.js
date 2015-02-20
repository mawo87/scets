var express = require("express");
var bodyParser = require("body-parser");
var parse = require("csv-parse");
var fs = require("fs");
var config = require("./modules/config.js");
var scatsParser = require("./modules/parser.js");

var app = express();

// Add headers (for CORS)
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', config.localhost.url);

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

// configure app to use bodyParser()
// this will let us get the data from a POST
// increase limit according to: http://stackoverflow.com/questions/19917401/node-js-express-request-entity-too-large
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

var port = process.env.PORT || config.server.port; //set the port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); // get an instance of the express Router

// middleware to use for all requests
router.use(function(req, res, next) {
  // do logging
  console.log('Something is happening.');
  next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

// on routes that end in /upload
// ----------------------------------------------------
router.route('/upload')
  .post(function(req, res) {
    res.contentType('application/json');

    //console.log("POST /upload req.body ", req.body);

    var fs = require('fs'),
      setDescription = req.body.set_description,
      csvData = req.body.data;

    //read the set description asynchronously
    //fs.readFile('data/skillmatrix_final.json', 'utf8', function (err, data) {
    /*
    fs.readFile('data/skillmat.json', 'utf8', function (err, data) {
      if (err) throw err;
      onSetDescriptionLoaded(JSON.parse(data), csvData);
    });
    */

    if (setDescription && csvData) {
      onSetDescriptionLoaded(setDescription, csvData);
    }

    function onSetDescriptionLoaded(setDescription, csvData) {
      var output = [];
      // Create the parser

      var parser = parse({delimiter: ':'}),
        record;

      // Use the writable stream api
      parser.on('readable', function(){
        while(record = parser.read()){
          output.push(record);
        }
      });

      // Catch any error
      parser.on('error', function(err){
        console.log(err.message);
      });

      // When we are done, test that the parsed output matched what expected
      parser.on('finish', function() {
        var file = [],
          data = {};

        for (var i = 0, len =output.length; i < len; i++) {
          file.push(output[i][0].split(setDescription.separator));
        }

        var myScatsParser = new scatsParser.Parser();

        var data = myScatsParser.parseFile(file, setDescription);

        //console.log("scatsParser.parseFile :: result : ", data);

        res.json({ success: true, result: data });
      });

      // Now that setup is done, write data to the stream
      parser.write(csvData);

      // Close the readable stream
      parser.end();
    }

  });

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);