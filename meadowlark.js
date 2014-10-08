var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);

var crypto = require('crypto');

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

//use formidable
var formidable = require('formidable');


app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
		app.get('port') + '; press Ctrl-C to terminate.' );
});


//use jqupload middleware
var jqupload = require('jquery-file-upload-middleware');

jqupload.configure({
		imageVersions: {
            thumbnail: {
                width: 80,
                height: 80
            }
        }
    });

app.use('/upload', function (req, res, next) {
            // imageVersions are taken from upload.configure()
            var now = Date.now() + (crypto.randomBytes(20).toString('hex'));
            console.log(now);
            jqupload.fileHandler({
                uploadDir: function () {
                    return __dirname + '/public/uploads/' + now
                },
                uploadUrl: function () {
                    return '/uploads/' + req.sessionID
                }
            })(req, res, next);
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
//provide weather partial
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

//add middleware

app.use(require('body-parser').urlencoded({
	extended: true
}));
app.use(express.static(__dirname + '/public'));


//routing

app.get('/contest/vacation-photo',function(req,res){
	var now = new Date();
	res.render('contest/vacation-photo', {
		year: now.getFullYear(), month: now.getMonth()
	});
});
app.get('/photo-jqfu',function(req,res){
	res.render('photo-jqfu');
});
app.post('/contest/vacation-photo/:year/:month', function(req, res){
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files){
		if(err) return res.redirect(303, '/error');
		console.log('received fields:');
		console.log(fields);
		console.log('received files:');
		console.log(files);
		res.redirect(303, '/thank-you');
	});
});

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

	//test of both normal and jquery methods for nurse-rhyme page

	app.get('/nursery-rhyme', function(req, res){
		res.render('nursery-rhyme');
	});
	app.get('/data/nursery-rhyme', function(req, res){
		res.json({
			animal: 'squirrel',
			bodyPart: 'tail',
			adjective: 'bushy',
			noun: 'heck',
		});
	});


	//newsletter form
	app.get('/newsletter', function(req, res){
		// we will learn about CSRF later...for now, we just
		// provide a dummy value
		res.render('newsletter', { csrf: 'CSRF token goes here' });
	});
	
	app.post('/process', function(req, res){
		if(req.xhr || req.accepts('json,html')==='json'){
			// if there were an error, we would send { error: 'error description' }
			res.send({ success: true });
		} else {
			// if there were an error, we would redirect to an error page
			console.log('Form (from querystring): ' + req.query.form);
			console.log('CSRF token (from hidden form field): ' + req.body._csrf);
			console.log('Name (from visible form field): ' + req.body.name);
			console.log('Email (from visible form field): ' + req.body.email);
			res.redirect(303, '/thank-you');
		}
	});

	app.get('/thank-you', function(req, res){
		res.type('text/plain');
		res.send('Thank you');
	});
	app.get('/error', function(req, res){
		res.type('text/plain');
		res.send('Custom error routing');
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

