//var http = require('http');
var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);

var crypto = require('crypto');
var credentials = require('./credentials.js');

//hide server information
app.disable('x-powered-by');

//database connection
require('./lib/mongo_connect.js').createConnection(app, credentials);
//fill in dummy database data
//require('./dummy/fill_vacations.js')();
var Vacation = require('./models/vacation.js');


//Mongo session
var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({ url:
credentials.mongo.development.connectionString });
//cookie parser npm install --save cookie-parser
app.use(require('cookie-parser')(credentials.cookieSecret));
//using express-session npm install --save express-session
app.use(require('express-session')({
    secret: credentials.cookieSecret,
    name: "mead_session",
    //store: sessionStore, // connect-mongo session store
    //proxy: true,
    resave: true,
    saveUninitialized: true,
    store: sessionStore //use Mongoose for session
}));



////////////////////start server here

function startServer() {
	app.listen(app.get('port'), function(){
		console.log( 'Express started in ' + app.get('env') +
			' mode on http://localhost:' + app.get('port') +
			'; press Ctrl-C to terminate.' );
	});
}
//switch to cluster 
if(require.main === module){
	// application run directly; start app server
	startServer();
	} else {
	// application imported as a module via "require": export function
	// to create server
	module.exports = startServer;
	//adding cluster middle-ware for multi-cluster
	app.use(function(req,res,next){
		var cluster = require('cluster');
		if(cluster.isWorker) console.log('Worker %d received request',
			cluster.worker.id);
			next();
	});
}
//////////////////////////////////////




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



// //enable logging

// switch(app.get('env')){
// 	case 'development':
// 		// compact, colorful dev logging
// 		app.use(require('morgan')('dev'));
// 		break;
// 	case 'production':
// 		// module 'express-logger' supports daily log rotation
// 		app.use(require('express-logger')({
// 			path: __dirname + '/log/requests.log'
// 		}));
// 		break;
// }



// //node mailer
// var nodemailer = require('nodemailer');
// var mailTransport = nodemailer.createTransport('SMTP',{
// 	service: 'Gmail',
// 	auth: {
// 		user: credentials.gmail.user,
// 		pass: credentials.gmail.password,
// 	}
// });

//sending mail
// var emailService = require('./lib/email.js')(credentials);






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
            //console.log(now);
            jqupload.fileHandler({
                uploadDir: function () {
                    return __dirname + '/public/uploads/' + now;
                },
                uploadUrl: function () {
                    return '/uploads/' + req.sessionID;
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




//using flash middleware for flash message before routing
app.use(function(req, res, next){
	// if there's a flash message, transfer
	// it to the context, then clear it
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
});

//routing

	//define global session variable
	var sessionVar = {};
	//helper function for session to make sure it is saved
	var checkEqualLongRequest = function (item1, item2){
		//make sure it is saved
		var areEqual = (item1 == item2);
		var sessionTimeOut = setTimeout(function () {
			areEqual = true;
		}, 5000);

		//trying to get session updated
		while (!areEqual) {
			if (item1 == item2){
				clearTimeout(sessionTimeOut);
				break;
			}
		}
		return true;
	};



	app.get('/set-currency/:currency', function(req,res){

		sessionVar.currency = req.params.currency;
		req.session.currency = sessionVar.currency;
		
		res.redirect(303, '/vacations');
		//console.log('set - ' + req.session.currency);
	});
	function convertFromUSD(value, currency){
		switch(currency){
			case 'USD': return value * 1;
			case 'GBP': return value * 0.6;
			case 'BTC': return value * 0.0023707918444761;
			default: return NaN;
		}
	}
	app.get('/vacations', function(req, res){
		Vacation.find({ available: true }, function(err, vacations){
			var currency = req.session.currency || 'USD';
			//double load
			if (sessionVar.currency && (sessionVar.currency != currency)) {
				currency = sessionVar.currency || 'USD';
			}
			var context = {
				currency: currency,
				vacations: vacations.map(function(vacation){
					return {
						sku: vacation.sku,
						name: vacation.name,
						description: vacation.description,
						inSeason: vacation.inSeason,
						price: convertFromUSD(vacation.priceInCents/100, currency),
						qty: vacation.qty,
					};
				})
			};
			switch(currency){
				case 'USD': context.currencyUSD = 'selected'; break;
				case 'GBP': context.currencyGBP = 'selected'; break;
				case 'BTC': context.currencyBTC = 'selected'; break;
			}
			res.render('vacations', context);
			//console.log('get - ' + currency);
		});
	});


	var VacationInSeasonListener = require('./models/vacationInSeasonListener.js');
	app.get('/notify-me-when-in-season', function(req, res){
		res.render('notify-me-when-in-season', { sku: req.query.sku });
	});
	app.post('/notify-me-when-in-season', function(req, res){
		VacationInSeasonListener.update(
			{ email: req.body.email },
			{ $push: { skus: req.body.sku } },
			{ upsert: true },
			function(err){
				if(err) {
					console.error(err.stack);
					req.session.flash = {
						type: 'danger',
						intro: 'Ooops!',
						message: 'There was an error processing your request.',
					};
					return res.redirect(303, '/vacations');
				}
				req.session.flash = {
					type: 'success',
					intro: 'Thank you!',
					message: 'You will be notified when this vacation is in season.',
				};
				return res.redirect(303, '/vacations');
			}
			);
	});




	// app.post('/cart/checkout', function(req, res){
	// 	var cart = req.session.cart;
	// 	if(!cart) next(new Error('Cart does not exist.'));
	// 	var name = req.body.name || '', email = req.body.email || '';
	// // input validation
	// if(!email.match(VALID_EMAIL_REGEX))
	// 	return res.next(new Error('Invalid email address.'));
	// // assign a random cart ID; normally we would use a database ID here
	// cart.number = Math.random().toString().replace(/^0\.0*/, '');
	// cart.billing = {
	// 	name: name,
	// 	email: email,
	// };
	// res.render('email/cart-thank-you',
	// 	{ layout: null, cart: cart }, function(err,html){
	// 		if( err ) console.log('error in email template');
	// 		mailTransport.sendMail({
	// 			from: '"Meadowlark Travel": info@meadowlarktravel.com',
	// 			to: cart.billing.email,
	// 			subject: 'Thank You for Book your Trip with Meadowlark',
	// 			html: html,
	// 			generateTextFromHtml: true
	// 		}, function(err){
	// 			if(err) console.error('Unable to send confirmation: ' +err.stack);
	// 		});
	// 	}
	// 	);
	// 	res.render('cart-thank-you', { cart: cart });
	// });


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


	//loading external route file
	require('./routes.js')(app);

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

	app.post('/newsletter', function(req, res){
		var name = req.body.name || '', email = req.body.email || '';
		// input validation
		if(!email.match(VALID_EMAIL_REGEX)) {
			if(req.xhr) return res.json({ error: 'Invalid name email address.' });
			req.session.flash = {
				type: 'danger',
				intro: 'Validation error!',
				message: 'The email address you entered was not valid.',
			};
			return res.redirect(303, '/newsletter/archive');
		}
		new NewsletterSignup({ name: name, email: email }).save(function(err){
			if(err) {
				if(req.xhr) return res.json({ error: 'Database error.' });
				req.session.flash = {
					type: 'danger',
					intro: 'Database error!',
					message: 'There was a database error; please try again later.',
				};
				return res.redirect(303, '/newsletter/archive');
			}
			if(req.xhr) return res.json({ success: true });
			req.session.flash = {
				type: 'success',
				intro: 'Thank you!',
				message: 'You have now been signed up for the newsletter.',
			};
			return res.redirect(303, '/newsletter/archive');
		});
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

//auto routes
var autoViews = {};
var fs = require('fs');
app.use(function(req,res,next){
	var path = req.path.toLowerCase();
	// check cache; if it's there, render the view
	if(autoViews[path]) return res.render(autoViews[path]);
	// if it's not in the cache, see if there's
	// a .handlebars file that matches
	if(fs.existsSync(__dirname + '/views' + path + '.hbs')){
		autoViews[path] = path.replace(/^\//, '');
		return res.render(autoViews[path]);
	}
	// no view found; pass on to 404 handler
	next();
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

