var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === 'dev') {
      // Log every HTTP request. See https://github.com/expressjs/morgan for other
      // available formats.
      app.use(morgan('dev'));
    }
    app.use(serveStatic(path.resolve(__dirname, 'public')));

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    var count = 0;

    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    scServer.on('connection', function (socket) {

      // Some sample logic to show how to handle client events,
      // replace this with your own logic

      socket.on('sampleClientEvent', function (data) {
        count++;
        console.log('Handled sampleClientEvent', data);
        scServer.exchange.publish('sample', count);
      });

      socket.on('login', function (credentials, respond) {
          var password = credentials.password;

          var username = credentials.username;

          if (username === 'alice123' && password === 'thisisapassword654') {
              respond();

              // This will give the client a token so that they won't
              // have to login again if they lose their connection
              // or revisit the app at a later time.
              socket.setAuthToken({username: credentials.username});
          } else {
              // Passing string as first argument indicates error
              respond('Login failed');
          }

      });

    });

      scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, function (req, next) {
          var authToken = req.socket.authToken;

          if (authToken) {
              console.log('user is authorized and has data : ', req.data,' on channel: ',req.channel);
              next();
          } else {
              next('You are not authorized to publish to ' + req.channel);
          }
      });
  }
}

new Worker();
