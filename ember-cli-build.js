/* global require, module */
var EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  var app = new EmberApp(defaults);

  app.import('vendor/dancer.js');
  app.import('bower_components/bootstrap-sass/assets/javascripts/bootstrap/tooltip.js');
  app.import('bower_components/bootstrap-sass/assets/javascripts/bootstrap/dropdown.js');
  app.import('bower_components/JavaScript-ID3-Reader/dist/id3-minimized.js');
  app.import('bower_components/jquery-mousewheel/jquery.mousewheel.js');
  app.import('bower_components/locallyjs/dist/locally.min.js');
  app.import('bower_components/intro.js/intro.js');
  app.import('bower_components/intro.js/introjs.css');

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  return app.toTree();
};