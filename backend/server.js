var express = require("express");
var parse = require("csv-parse");
var fs = require("fs");
var multer = require("multer");
var config = require("./modules/config.js");
var scatsParser = require("./modules/parser.js");
var walker = require("./modules/walker.js");

var app = express();

//upload specific
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.data.dir + "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});
var upload = multer({ storage: storage });
var cpUpload = upload.fields([{ name: 'dataFile', maxCount: 1 }, { name: 'descriptionFile', maxCount: 1 }]);

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

var port = process.env.PORT || config.server.port; //set the port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); // get an instance of the express Router

// middleware to use for all requests
router.use(function(req, res, next) {
  // do logging
  //console.log('Something is happening.');
  next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

/**
 * @api {get} /examples
 * @apiDescription Request a list of sample files.
 * @apiGroup Examples
 * @apiVersion 0.1.0
 *
 * @apiSuccess {Boolean} success True if the example list was loaded successfully. False otherwise.
 * @apiSuccess {Object[]} result List of example files.
 * @apiSuccess {String} result.title The file title.
 * @apiSuccess {String} result.path The file path.
 */
router.route('/examples')
  .get(function(req, res) {
    res.contentType('application/json');

    //console.log("Now give me the examples");

    walker.walk(config.data.dir, function(err, resp) {
      //console.log("WALK DONE :: resp : ", resp);

      var responseData = [],
        remaining = resp.length;

      resp.forEach(function(file) {

        //console.log("READ FILE :: ", file);

        fs.readFile(file, 'utf-8', function (fileErr, data) {

          if (fileErr) {
            console.log("Error ", fileErr);
          }

          var parsedData = JSON.parse(data),
            tmp = file.lastIndexOf('data/'),
            path = file.substring(tmp + 5).replace(/\.[^/.]+$/, ""); //without extension (.json)

          responseData.push({ title: parsedData.name, path: path });

          remaining -= 1;

          //done reading files, return response
          if (remaining == 0) {
            res.json({ success: true, result: responseData });
            //console.log("WALK DONE :: responseData : ", responseData);
          }

        });
      });

    });

  });

/**
 * @api {get} /example?file=fileName
 * @apiDescription Gets a single example.
 * @apiGroup Examples
 * @apiVersion 0.1.0
 * @apiParam {String} file The name of the file to be loaded.
 *
 * @apiSuccess {Boolean} success True if the example list was loaded successfully. False otherwise.
 * @apiSuccess {Object[]} result List of example files.
 * @apiSuccess {Object[]} result.sets Array of sets.
 * @apiSuccess {Object[]} result.elements Array of elements.
 * @apiSuccess {Array} result.grid An array (cols x rows) containing the degrees.
 * @apiSuccess {Array} result.fullGrid Similar to the grid but the grid cells contain more information than just the degree, i.e., subsets with degree and elements.
 * @apiSuccess {Array} result.degreeVector Array of degrees
 * @apiSuccess {Integer} result.max
 * @apiSuccess {Integer} result.min
 * @apiSuccess {Integer} result.maxDegree The max value in the degreeVector.
 */
router.route('/example')
  .get(function(req, res) {
    res.contentType('application/json');

    //console.log("Now give me the example file " + req.query.file);

    var fs = require('fs'),
      fileName = req.query.file + ".json";

    //read description file first
    fs.readFile(config.data.dir + fileName, 'utf8', function (err, data) {
      if (err) throw err;

      var setDescription = JSON.parse(data);

      //console.log("setDescription loaded :: setDescription : ", setDescription);

      onSetDescriptionLoaded(setDescription);
    });

    function onSetDescriptionLoaded(setDescription) {

      var isUploadedFile = fileName.indexOf("uploads/") !== -1;

      //then read CSV file
      fs.readFile(config.data.dir + (isUploadedFile ? "uploads/" : "") + setDescription.file, 'utf8', function (err, data) {
        if (err) throw err;

        onCSVDataLoaded(setDescription, data, function(data) {
          res.json({ success: true, result: data });
        });
      });
    }

  });

/**
 * @api {post} /upload
 * @apiDescription Uploads a CSV and a description file to the server.
 * @apiGroup Examples
 * @apiVersion 0.1.0
 * @apiParam {String} file The name of the file to be loaded.
 *
 * @apiSuccess {Boolean} success True if the example list was loaded successfully. False otherwise.
 * @apiSuccess {Object[]} result List of example files.
 * @apiSuccess {String} result.title The file title.
 * @apiSuccess {String} result.path The file path.
 */
router.route('/upload')
  .post(cpUpload, function(req, res) {
    res.contentType('application/json');

    //console.log("File uploaded :: ", req.files);

    var fileName = req.files.descriptionFile[0].originalname.replace(/\.[^/.]+$/, ""), //without extension (.json)
      path = "uploads/" + fileName;

    res.json({ success: true, result: path });

  });

function onCSVDataLoaded(setDescription, csvData, cb) {
  var output = [];
  // Create the parser

  //var parser = parse({delimiter: ':'});
  var parser = parse({delimiter: setDescription.separator });

  // Use the writable stream api
  parser.on('readable', function(){
    while(record = parser.read()){
      console.log("record ", record);
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
//console.log('Magic happens on port ' + port);