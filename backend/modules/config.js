var config = {

  /* settings for example files and excludes files */
  data: {
    dir: "./data/",
    excludedDir: ["deprecated"]
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