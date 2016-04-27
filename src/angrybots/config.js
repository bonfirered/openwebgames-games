
// connect to canvas
// @todo: better document these options
var Module = {
	key: 'angrybots',
	needsFakeMonotonouslyIncreasingTimer: false,
	testUsesEmscriptenHTML5API: true,
	TOTAL_MEMORY: 268435456,
	filePackagePrefixURL: 'Release/',
	memoryInitializerPrefixURL: 'Release/',
	preRun: (function(){
		return (location.search.indexOf('cpuprofiler') != -1) ? [cpuprofiler_add_hooks] : [];
	})(),
	postRun: [],
	print: (function(){
		return function(text) {
			console.log (text);
		};
	})(),
	printErr: function(text) {
		console.error (text);
	},
	canvas: document.getElementById('canvas'),
	progress: null,
	setStatus: function(text){
		console.log('setting status', text);
		if (this.progress == null){
			if (typeof UnityProgress != 'function')
				return;
			this.progress = new UnityProgress (canvas);
		}
		if (!Module.setStatus.last)
			Module.setStatus.last = { time: Date.now(), text: '' };
		if (text === Module.setStatus.text)
			return;
		this.progress.SetMessage (text);
		var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
		if (m)
			this.progress.SetProgress (parseInt(m[2])/parseInt(m[4]));
		if (text === '')
			this.progress.Clear()
	},
	totalDependencies: 0,
	monitorRunDependencies: function(left){
		this.totalDependencies = Math.max(this.totalDependencies, left);
		Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
	}
};
Module.setStatus('Downloading (0.0/1)');

