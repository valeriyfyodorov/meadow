var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);

var handlebars = require('express-handlebars')
app.engine('handlebars', handlebars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');


app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
		app.get('port') + '; press Ctrl-C to terminate.' );
});


var fortune = require('./lib/fortune.js');

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
//res.type('text/plain');
res.render("home");
});

app.get('/about', function(req, res){
//res.type('text/plain');
res.render('about', { fortune: fortune.getFortune() })
});

// custom 404 page
app.use(function(req, res, next){
//res.type('text/plain');
res.status(404);
res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next){
	console.error(err.stack);
	//res.type('text/plain');
	res.status(500);
	res.render('500');
});

