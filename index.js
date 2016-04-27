
// node modules
var express = require('express');

// express server
var app = express();
var port = process.env.PORT || 5001;

app.use(express.static(__dirname + '/src'));

app.listen(port, function(){
	console.log('listening on port ' + port);
});


