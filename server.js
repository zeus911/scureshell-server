var express = require('express'),
	app = express(),
	mongoose = require('mongoose'),
	Environment = require('./api/models/environmentModel'),
	Request = require('./api/models/requestModel'),
	routes = require('./api/routes'),
	morgan = require('morgan'),
	config = require('config'),
	fileHelper = require('./helpers/file'),
	bodyParser = require('body-parser');

// Set basedir global for user in other modules
global.__basedir = __dirname;

// Init mongoose instance
mongoose.Promise = global.Promise;
mongoose.connect(config.DBHost).then(
	() => { 
		console.log('Mongoose is connected to ' + config.DBHost);
		app.emit("db_connected"); // Intercepted by testing
	},
	err => {console.log('Mongoose was not able to connect to ' + config.DBHost + err)}
);


var db = mongoose.connection;
//Connection events
db.on('error', (err) => {
	console.error('MongoDB connection error: ' + err);
	process.exit(1);
});

db.on('disconnected', () => {
	console.error('MongoDB default connection disconnected');
	process.exit(0);
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {  
  mongoose.connection.close(function () { 
    console.log('Mongoose default connection disconnected through app termination'); 
    process.exit(0); 
  }); 
}); 

process.on('unhandledRejection', error => {
	console.log('unhandledRejection: ', error.message);
});

// Make sure cert directory exists
/*fileHelper.checkDir(config.CertDirectory).then((isDir) => {
	if (isDir) {
		console.log('Cert dir exists');
		exports.certDirectory = config.CertDirectory;
	} else {
		console.error('Cert dir does not exist or is not accessible by scureshell');
		process.exit(1);
	}
}).catch((err) => {
	console.error('Error while reading cert dir: ', err);
	process.exit(1);
});*/

// We need to do this synchronsly because we don't want to start the server without it
if (!fileHelper.checkDirExistsSync(config.CertDirectory)) {
	console.error('Cert dir does not exist or is not accessible by scureshell');
	process.exit(1);
} else {
	exports.certDirectory = config.CertDirectory;
}
//Don't show morgan log in test env
if(config.util.getEnv('NODE_ENV') !== 'test' && config.util.getEnv('NODE_ENV') !== 'docker-test') {
	// Use morgan to log at cli
	app.use(morgan('combined'));
}

app.use(bodyParser.urlencoded({ extended: true  }));
app.use(bodyParser.json());

// register routes
app.use('/', routes);
app.listen(config.Port);
console.log('scureshell server started, API listening on: ' + config.Port);

module.exports = app; // for testing
