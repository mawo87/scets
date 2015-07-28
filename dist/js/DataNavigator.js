var scats = (function (vis) {

  var scatsApi = {
    baseUrl: function() {
      return "http://localhost:8080/api";
    },
    getExampleList: function () {
      var self = this,
        deferred = $.Deferred();

      $.ajax({
        type: "GET",
        dataType: "json",
        url: self.baseUrl() + "/examples",
        success: function (resp) {
          deferred.resolve(resp);
        }
      });

      return deferred.promise();
    },
    loadExample: function (fileName) {
      var self = this,
        deferred = $.Deferred();

      $.ajax({
        type: "GET",
        dataType: "json",
        url: self.baseUrl() + "/examples/" + fileName,
        success: function (resp) {
          deferred.resolve(resp);
        },
        error: function (err) {
          deferred.reject(err);
        }
      });

      return deferred.promise();
    }
  };

  /**
   * @class DataNavigator
   * @classDesc The Data Navigator retrieves sample files from the backend and enables users to upload new data sets
   * @memberOf scats
   */
  function DataNavigator(initializer) {
    var self = this;
    this.container = initializer.container;
    this.loader = initializer.loader;
    this.dataSets = initializer.dataSets || [];
    this.selectedFile = initializer.selectedFile;
    this.size = initializer.size || "large";
    this.onSelectCallback = initializer.onSelectCallback || $.noop();
    this.onLoadedCallback = initializer.onLoadedCallback || $.noop();
    this.templates = {
      main: function(dataSets) {
        var sorted = _.sortBy(dataSets, "title");

        var html = '<div class="data-navigator lg">';
        html += '<div id="selectForm">';
        html += '<h4>Select a data set</h4>';
        html += '<div class="row">';
        html += '<div class="col-md-8">';
        html += '<select class="form-control" id="fileSelect">';
        _.each(sorted, function(d, i) {
          html += '<option value="' + d.name + '" ' + (d.name === self.selectedFile ? "selected" : "") + '>' + d.title + '</option>';
        });
        html += '</select></div>';
        html += '<div class="col-md-4"><button class="btn btn-primary" id="loadBtn">Load</button></div>';
        html += '</div><br/>';
        html += '<a href="javascript:void(0);" id="toggleUploadForm">or upload a file <i class="fa fa-upload"></i></a>';
        html += '</div></div>';
        return html;
      },
      small: function(dataSets) {
        var sorted = _.sortBy(dataSets, "title");

        var html = '<div class="data-navigator sm">';
        html += '<form class="form-horizontal">';
        html += '<div id="selectForm" class="form-group">';
        html += '<label class="col-sm-4 control-label">Data sets</label>';
        html += '<div class="col-sm-8">';
        html += '<select class="form-control" id="fileSelect">';
        _.each(sorted, function(d, i) {
          html += '<option value="' + d.name + '" ' + (d.name  === self.selectedFile? "selected" : "") + '>' + d.title + '</option>';
        });
        html += '</select>';
        html += '</div>';
        html += '</form>';
        html += '</div>';
        return html;
      },
      uploadForm: function() {
        var html = '<form id="uploadForm" action="' + scatsApi.baseUrl() + "/upload" + '" method="post" class="init-hide">';
        html += '<h4>Upload a file</h4>';
        html += '<div class="row"><div class="col-md-12"><span class="help-block">Select a (.csv) file</span></div></div>';
        html += '<div class="row"><div class="col-md-12">';
        html += '<div class="input-group">';
        html += '<span class="input-group-btn"><span class="btn btn-primary btn-file">Browse&hellip; <input type="file" name="dataFile" id="dataFile" accept=".csv"></span></span>';
        html += '<input type="text" class="form-control" readonly>';
        html += '</div>';
        html += '<div class="alert alert-danger init-hide error-dataFile">You must submit a CSV file</div>';
        html += '<div class="row"><div class="col-md-12"><span class="help-block">Select a description (.json) file</span></div></div>';
        html += '<div class="input-group">';
        html += '<span class="input-group-btn"><span class="btn btn-primary btn-file">Browse&hellip; <input type="file" name="descriptionFile" id="descriptionFile" accept=".json"></span></span>';
        html += '<input type="text" class="form-control" readonly>';
        html += '</div>';
        html += '<div class="alert alert-danger init-hide error-descriptionFile">You must submit a description file</div>';
        html += '<br/>';
        html += '<div class="row"><div class="col-md-12"><input type="submit" class="btn btn-primary" id="uploadBtn" value="Upload" />&nbsp;<button class="btn btn-default" id="cancelUploadBtn">Cancel</button></div></div>';
        html += '</div></div>';
        html += '</form>';
        return html;
      }
    };
    this.init();
  }

  /**
   * The sample list is retrieved from the server and initialization tasks will be performed
   *
   * @memberOf scats.DataNavigator
   * @method init
   */
  DataNavigator.prototype.init = function() {
    console.log("DataNavigator :: init : ", this);
    var self = this;
    scatsApi.getExampleList()
      .done(function(resp) {
        console.log("GOT EXAMPLES :: ", resp);

        if (resp.success) {
          self.setDataSets(resp.result);

          $(self.loader).hide();

          if (self.size === "large") {
            self.render(self.dataSets, "main");
            self.initUploadForm();
            self.attachFormEventHandlers();
          } else if (self.size === "small") {
            self.render(self.dataSets, "small");
          }
        }
      });
  };

  /**
   * The template for the upload form will be rendered and event handlers get attached
   *
   * @memberOf scats.DataNavigator
   * @method initUploadForm
   */
  DataNavigator.prototype.initUploadForm = function () {

    var self = this;

    //attach upload form first
    $(this.container).find("#selectForm")
      .after(this.templates.uploadForm());

    //setup jquery form for async upload
    $("#uploadForm").submit(function() {

      var errors = self.validateUploadForm();

      console.log("uploadBtn clicked :: errors : ", errors);

      self.hideErrors();

      //validate inputs
      if (errors.length > 0) {
        self.showErrors(errors);
      } else {

        //no errors from here on
        $(self.container).hide();
        $(self.loader).show();

        $(this).ajaxSubmit({

          error: function(xhr) {
            $(self.loader).hide();

            status('Error: ' + xhr.status);
          },

          success: function(resp) {
            $(self.loader).hide();

            if (resp.result && resp.result) {

              if (self.onLoadedCallback) {
                self.onLoadedCallback.call(self, resp);
              }
            }
          }
        });
      }

      //Very important line, it disable the page refresh.
      return false;
    });

  };

  /**
   * Attached Event handlers to the upload form
   *
   * @memberOf scats.DataNavigator
   * @method attachFormEventHandlers
   */
  DataNavigator.prototype.attachFormEventHandlers = function() {
    console.log("initEventHandlers");

    var self = this;
    $(this.container).find("#toggleUploadForm").click(function() {
      console.log("show upload form");

      self.toggleUploadForm();
    });

    $(self.container).find("#cancelUploadBtn").click(function() {
      console.log("cancelUploadBtn clicked :: ");
      self.toggleUploadForm();
    });

    $(document).on("change", ".btn-file :file", function() {
      var input = $(this),
        numFiles = input.get(0).files ? input.get(0).files.length : 1,
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
      input.trigger("fileselect", [numFiles, label]);
    });

    $(".btn-file :file").on("fileselect", function(event, numFiles, label) {
      var input = $(this).parents('.input-group').find(':text'),
        log = numFiles > 1 ? numFiles + " files selected" : label;

      if (input.length) {
        input.val(log);
      } else {
        if( log ) alert(log);
      }
    });
  };

  /**
   * Validates the input of the upload form
   *
   * @memberOf scats.DataNavigator
   * @method validateUploadForm
   */
  DataNavigator.prototype.validateUploadForm = function () {
    var errors = [];

    if ($(this.container).find("#dataFile").val() === "") {
      errors.push("dataFile");
    }

    if ($(this.container).find("input#descriptionFile").val() === "") {
      errors.push("descriptionFile");
    }

    return errors;
  };

  /**
   * Displays error messages on the upload form
   *
   * @memberOf scats.DataNavigator
   * @method showErrors
   */
  DataNavigator.prototype.showErrors = function (errors) {
    var self = this;
    _.each(errors, function(err) {
      $(self.container).find(".error-" + err).show();
    });
  };

  /**
   * Hides error messages on the upload form
   *
   * @memberOf scats.DataNavigator
   * @method hideErrors
   */
  DataNavigator.prototype.hideErrors = function () {
    $(this.container).find(".alert-danger").hide();
  };

  /**
   * Toggles the upload form
   *
   * @memberOf scats.DataNavigator
   * @method toggleUploadForm
   */
  DataNavigator.prototype.toggleUploadForm = function () {
    if ($(this.container).find("#uploadForm").is(":visible")) {
      $(this.container).find("#uploadForm").hide();

      $(this.container).find("#selectForm")
        .show()
        .velocity("transition.slideUpIn");
    } else {
      this.hideErrors();

      $(this.container).find("#selectForm").hide();

      $(this.container).find("#uploadForm")
        .hide()
        .velocity("transition.slideUpIn");
    }
  };

  /**
   * Sets data sets
   *
   * @memberOf scats.DataNavigator
   * @method setDataSets
   * @param {array} dataSets - An array of data sets.
   */
  DataNavigator.prototype.setDataSets = function(dataSets) {
    this.dataSets = dataSets;
  };

  /**
   * Renders a template with the given data sets
   *
   * @memberOf scats.DataNavigator
   * @method render
   * @param {array} dataSets - An array of data sets.
   * @param {string} templateName - The name of the template to be rendered.
   */
  DataNavigator.prototype.render = function(dataSets, templateName) {
    console.log("DataNavigator render :: ", dataSets, templateName);
    if (this.templates[templateName]) {
      console.log("DataNavigator render :: template found : ", $(this.container));
      $(this.container)
        .empty()
        .html(this.templates[templateName](dataSets));

      $(this.container).show();
    }

    this.attachEventHandler();

    return this;
  };

  /**
   * Attaches event handlers to the select box
   *
   * @memberOf scats.DataNavigator
   * @method attachEventHandler
   */
  DataNavigator.prototype.attachEventHandler = function() {
    var self = this;

    if (this.size === "large") {
      $(this.container).find("#loadBtn").click(function(e) {
        e.preventDefault();

        var file = $("#fileSelect").val();

        self.selectedFile = file;

        if (self.onSelectCallback) {
          self.onSelectCallback.call(self, { file: file });
        }

        self.loadFile(file);
      });
    } else if (this.size === "small") {
      $(this.container).find("#fileSelect").on("change", function(e) {
        e.preventDefault();

        var file = $(this).val();

        console.log("loadFile :: ", file);

        self.selectedFile = file;

        if (self.onSelectCallback) {
          self.onSelectCallback.call(self, { file: file });
        }

        self.loadFile(file);
      });
    }
  };

  /**
   * Loads sample files from the server
   *
   * @memberOf scats.DataNavigator
   * @method loadFile
   */
  DataNavigator.prototype.loadFile = function(file) {
    var self = this;

    $(this.container).hide();
    $(this.loader).show();

    scatsApi.loadExample(file)
      .done(function(resp) {

        $(self.loader).hide();

        if (resp.result && resp.result) {

          if (self.onLoadedCallback) {
            self.onLoadedCallback.call(self, resp);
          }
        }

      });
  };

  vis.DataNavigator = DataNavigator;

  return vis;

})(scats || {});