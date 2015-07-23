var express = require("express");
var parse = require("csv-parse");
var fs = require("fs");
var multer = require("multer");
var config = require("./modules/config.js");
var scatsParser = require("./modules/parser.js");

var app = express();

var uploadDone = false;

// Add headers (for CORS)
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', config.localhost.url + ":" + config.localhost.port);

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

//configure app to use multer (for file upload)
app.use(multer({
  dest: config.data.uploads,
  rename: function (fieldname, filename) {
    return filename;
  },
  onFileUploadStart: function (file) {
    console.log(file.originalname + " is starting ...");
  },
  onFileUploadComplete: function (file) {
    console.log(file.fieldname + " uploaded to " + file.path);
    uploadDone = true;
  }
}));

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

// gets a list of sample files
// ----------------------------------------------------
router.route('/examples')
  .get(function(req, res) {
    res.contentType('application/json');

    console.log("Now give me the examples");

    var responseData = [];

    fs.readdir(config.data.dir, function(err, files) {
      if (err) {
        throw err;
      }

      var jsonFiles = [];

      //browse json files only and exclude files listed in config
      files.forEach(function(file) {
        if (file.match(/\.(json)$/) && config.data.excludedFiles.indexOf(file.replace(/\.[^/.]+$/, "")) == -1) {
          jsonFiles.push(file);
        }
      });

      //keep track of how many we have to go.
      var remaining = jsonFiles.length;

      //read all json files in the folder in parallel
      jsonFiles.forEach(function(file) {

        fs.readFile(config.data.dir + file, 'utf-8', function (fileErr, data) {

          if (fileErr) {
            console.log("Error ", fileErr);
          }

          var parsedData = JSON.parse(data),
            fileName = file.replace(/\.[^/.]+$/, ""); //without extension (.json)

          responseData.push({ name: fileName, title: parsedData.name });

          remaining -= 1;

          //done reading files, return response
          if (remaining == 0) {
            res.json({ success: true, result: responseData });
          }

        });

      });

    });
  });

// get a singe example
// ----------------------------------------------------
router.route('/examples/:file')
  .get(function(req, res) {
    res.contentType('application/json');

    console.log("Now give me the example file " + req.params.file);

    var fs = require('fs'),
      fileName = req.params.file + ".json";

    //read description file first
    fs.readFile(config.data.dir + fileName, 'utf8', function (err, data) {
      if (err) throw err;

      var setDescription = JSON.parse(data);

      console.log("setDescription loaded :: setDescription : ", setDescription);

      onSetDescriptionLoaded(setDescription);
    });

    function onSetDescriptionLoaded(setDescription) {

      //then read CSV file
      fs.readFile(config.data.dir + setDescription.file, 'utf8', function (err, data) {
        if (err) throw err;

        console.log("CSV loaded :: csv : ", data);

        onCSVDataLoaded(setDescription, data, function(data) {
          res.json({ success: true, result: data });
        });
      });
    }

  });

// uploads a CSV and a description file to the server
// ----------------------------------------------------
router.route('/upload')
  .post(function(req, res) {
    res.contentType('application/json');

    if (uploadDone === true) {

      console.log("File uploaded :: ", req.files);

      var fs = require('fs'),
        fileName = req.files.descriptionFile.originalname;

      uploadDone = false;

      //read description file first
      fs.readFile(config.data.uploads + "/" + fileName, 'utf8', function (err, data) {
        if (err) throw err;

        var setDescription = JSON.parse(data);

        console.log("setDescription loaded :: setDescription : ", setDescription);

        onSetDescriptionLoaded(setDescription);
      });

      function onSetDescriptionLoaded(setDescription) {

        //then read CSV file
        fs.readFile(config.data.uploads + "/" + setDescription.file, 'utf8', function (err, data) {
          if (err) throw err;

          console.log("CSV loaded :: csv : ", data);

          onCSVDataLoaded(setDescription, data, function(data) {
            res.json({ success: true, result: data });
          });
        });
      }
    }
  });

function onCSVDataLoaded(setDescription, csvData, cb) {
  var output = [];
  // Create the parser

  //var parser = parse({delimiter: ':'});
  var parser = parse({delimiter: setDescription.separator });

  // Use the writable stream api
  parser.on('readable', function(){
    while(record = parser.read()){
      //console.log("record ", record);
      output.push(record);
    }
  });

  // Catch any error
  parser.on('error', function(err){
    console.log(err.message);
  });

  // When we are done, test that the parsed output matched what expected
  parser.on('finish', function() {

    //console.log("parser on finish :: ", output);

    var data = {},
      myScatsParser = new scatsParser.Parser(),
      data = myScatsParser.parseFile(output, setDescription);

    //console.log("scatsParser.parseFile :: result : ", data);

    if (cb) {
      cb(data);
    }
  });

  // Now that setup is done, write data to the stream
  parser.write(csvData);

  // Close the readable stream
  parser.end();
}

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);