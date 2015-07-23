var config = {

  /* settings for example files and excludes files */
  data: {
    dir: "./data/",
    uploads: "./uploads",
    excludedFiles: ["skillmatrix_final", "skillmatrix_final_small", "skillmatrix_small"]
  },

  /* settings for the Node.js server */
  server: {
    port: 8080
  },

  /* settings for local webserver */
  localhost: {
    url: "http://localhost",
    port: 8005
  }
};

module.exports = config;