var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);
//hide server information
app.disable('x-powered-by');


//setting handlebars
var handlebars = require('express-handlebars');
//handlebars function for sections usage
var hbs = handlebars.create({
	defaultLayout: 'main',
	extname: '.hbs',
    // Specify helpers which are only registered on this instance.
    helpers: {
    	section: function(name, options){
    		if(!this._sections) this._sections = {};
    		this._sections[name] = options.fn(this);
    		return null;
    	}
    }
});
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');






app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
		app.get('port') + '; press Ctrl-C to terminate.' );
});



//temp globals

var fortune = require('./lib/fortune.js');

function getWeatherData(){
	return {
		locations: [
		{
			name: 'Portland',
			forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
			iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
			weather: 'Overcast',
			temp: '54.1 F (12.3 C)',
		},
		{
			name: 'Bend',
			forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
			iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
			weather: 'Partly Cloudy',
			temp: '55.0 F (12.8 C)',
		},
		{
			name: 'Manzanita',
			forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
			iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
			weather: 'Light Rain',
			temp: '55.0 F (12.8 C)',
		},
		],
	};
}

app.use(function(req, res, next){
	if(!res.locals.partials) res.locals.partials = {};
	res.locals.partials.weather = getWeatherData();
	next();
});

app.use(function(req, res, next){
	res.locals.showTests = app.get('env') !== 'production' &&
	req.query.test === '1';
	next();
});

app.use(express.static(__dirname + '/public'));


//routing
	app.get('/', function(req, res){
	//res.type('text/plain');
	res.render("home");
	});

	app.get('/about', function(req, res){
		//res.type('text/plain');
		res.render('about', { 
			fortune: fortune.getFortune(),
			pageTestScript: '/qa/tests-about.js'
		 });
	});

	app.get('/jquery-test', function(req, res){
	res.render('jquery-test');
	});

	//tours folder :

	app.get('/tours/hood-river', function(req, res){
	res.render('tours/hood-river');
	});

	app.get('/tours/oregon-coast', function(req, res){
	res.render('tours/oregon-coast');
	});

	app.get('/tours/request-group-rate', function(req, res){
	res.render('tours/request-group-rate');
	});

//learning - view browser headers
app.get('/headers', function(req,res){
	res.set('Content-Type','text/plain');
	var s = '';
	for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
		res.send(s);
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

