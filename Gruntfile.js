module.exports = function(grunt){
// load plugins
[
'grunt-cafe-mocha',
'grunt-contrib-jshint',
'grunt-exec',
].forEach(function(task){
	grunt.loadNpmTasks(task);
});

//checking options
//run grunt --port=3001 for a different port
var port = grunt.option('port') || '3000';

// configure plugins
grunt.initConfig({
	cafemocha: {
		all: { src: 'qa/tests-*.js', options: { ui: 'tdd' }, }
	},
	jshint: {
		app: ['meadowlark.js', 'public/js/**/*.js',
		'lib/**/*.js'],
		qa: ['Gruntfile.js', 'public/qa/**/*.js', 'qa/**/*.js'],
	},
	exec: {
		linkchecker:
		{ cmd: 'linkchecker http://localhost:' + port }
	},
});
// register tasks
grunt.registerTask('default', ['cafemocha','jshint','exec']);
};