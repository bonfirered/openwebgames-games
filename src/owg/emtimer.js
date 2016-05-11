// emtimer.js
// This script contains the harness content that is embedded on each executed page.

// If an error occurs on the page, fast-quit execution and return to harness with an error.
window.onerror = function(msg, url, line, column, e) {
  // window.opener points to the test harness window if one exists. If a test page is opened outside the harness, window.opener
  // does not exist and as a result we don't auto-close on error (but show the error to user).
  // Also ignore InvalidStateError errors because those can occur in IndexedDB operations from file:// URLs, which we don't really care about.
  var testResults = null;
  if (msg == 'uncaught exception: exit') { // Normal exit from test
    var timeEnd = performance.realNow();
    var duration = timeEnd - Module['timeStart'];
    var cpuIdle = (duration - accumulatedCpuTime) / duration;
    var fps = numFramesToRender * 1000.0 / duration;
    testResults = {
      result: 'PASS',
      totalTime: Math.round(duration),
      wrongPixels: 0,
      cpuTime: Math.round(accumulatedCpuTime),
      cpuIdle: 0,
      fps: 0,
      pageLoadTime: pageLoadTime,
      numStutterEvents: 0
    };
  } else if (msg.indexOf('InvalidStateError') == -1) {
    testResults = {
      result: 'ERROR',
      error: msg
    };
  }
  top.postMessage({ msg: 'stopGame', key: Module.key, result: testResults }, '*');

  unloadAllEventHandlers();
  if (window.opener) {
    window.opener.postMessage(testResults, "*");
    window.close();
  }
}

// If true, the page is run in a record mode where user interactively runs the page, and input stream is captured. Use this in
// when authoring new tests to the suite.
var recordingInputStream = location.search.indexOf('record') != -1;

// If true, we are autoplaybacking a recorded input stream. If false, input is not injected (we are likely running in an interactive examination mode of a test)
var injectingInputStream = location.search.indexOf('playback') != -1;

// In test mode (injectingInputStream == true), we always render this many fixed frames, after which the test is considered finished.
// ?numframes=number GET parameter can override custom test length.
var numFramesToRender = Module['overrideNumFramesToRender'] > 0 ? Module['overrideNumFramesToRender'] : 2000;

if (location.search.indexOf('numframes=') != -1) {
  numFramesToRender = parseInt(location.search.substring(location.search.indexOf('numframes=') + 'numframes='.length));
}

// Currently executing frame.
var referenceTestFrameNumber = 0;

// Guard against recursive calls to referenceTestPreTick+referenceTestTick from multiple rAFs.
var referenceTestPreTickCalledCount = 0;

// Wallclock time denoting when the page has finished loading.
var pageLoadTime = null;

// Tallies up the amount of CPU time spent in the test.
var accumulatedCpuTime = 0;

// Some tests need to receive a monotonously increasing time counter, but can't pass real wallclock time, which would make the test timing-dependent, so instead
// craft an arbitrary increasing counter.
var fakedTime = 0;

// Tracks when Emscripten runtime has been loaded up. (main() called)
var runtimeInitialized = 0;

// Keeps track of performance stutter events. A stutter event occurs when there is a hiccup in subsequent per-frame times. (fast followed by slow)
var numStutterEvents = 0;

var registeredEventListeners = [];

// Don't call any application page unload handlers as a response to window being closed.
function ensureNoClientHandlers() {
  // This is a bit tricky to manage, since the page could register these handlers at any point,
  // so keep watching for them and remove them if any are added. This function is called multiple times
  // in a semi-polling fashion to ensure these are not overridden.
  if (window.onbeforeunload) window.onbeforeunload = null;
  if (window.onunload) window.onunload = null;
}

function unloadAllEventHandlers() {
  for(var i in registeredEventListeners) {
    var l = registeredEventListeners[i];
    l[0].removeEventListener(l[1], l[2], l[3]);
  }
  registeredEventListeners = [];

  // Make sure no XHRs are being held on to either.
  preloadedXHRs = {};
  numPreloadXHRsInFlight = 0;
  XMLHttpRequest = realXMLHttpRequest;

  ensureNoClientHandlers();

  try { // Suppress exceptions thrown on nonsupporting browsers.
    EventTarget.prototype.addEventListener = realAddEventListener;
  } catch(e) {}
}

// Mock performance.now() and Date.now() to be deterministic.
// Unfortunately looks like there does not exist a good feature test for this, so resort to user agent sniffing.. (sad :/)
var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isSafari) {
  realPerformance = performance;
  performance = {
    realNow: function() { return realPerformance.now(); },
    now: function() { return realPerformance.now(); }
  };
} else {
  performance.realNow = performance.now;
}

Date.realNow = Date.now;
if (injectingInputStream || recordingInputStream) {
  if (!Module['dontOverrideTime']) {
    var timeScale = (typeof Module['fakeTimeScale'] !== 'undefined') ? Module['fakeTimeScale'] : 1.0;
    if (Module['needsFakeMonotonouslyIncreasingTimer']) {
      Date.now = function() { fakedTime += timeScale; return fakedTime; }
      performance.now = function() { fakedTime += timeScale; return fakedTime; }
    } else {
      Date.now = function() { return fakedTime * 1000.0 * timeScale / 60.0; }
      performance.now = function() { return fakedTime * 1000.0 * timeScale / 60.0; }
    }
  }
  // This is an unattended run, don't allow window.alert()s to intrude.
  window.alert = function(msg) { console.error('window.alert(' + msg + ')'); }
  window.confirm = function(msg) { console.error('window.confirm(' + msg + ')'); return true; }

  // Replace Math.random() Custom LCG to be able to deterministically seed the random number generator.
  var randomState = 1;
  Math.random = function() {
    randomState = (((((1103515245 * randomState)>>>0) + 12345) >>> 0) % 0x80000000)>>>0;
    return randomState / 0x80000000;
  }
}

var realXMLHttpRequest = XMLHttpRequest;

// dictionary with 'responseType|url' -> finished XHR object mappings.
var preloadedXHRs = {};
var preloadXHRProgress = {};
var numStartupBlockerXHRsPending = 0; // The number of XHRs active that the game needs to load up before the test starts.
var numPreloadXHRsInFlight = 0; // The number of XHRs still active, via calls from preloadXHR().

var siteRoot = '';

function totalProgress() {
  var bytesLoaded = 0;
  var bytesTotal = 0;
  for(var i in preloadXHRProgress) {
    var x = preloadXHRProgress[i];
    if (x.bytesTotal > 0) {
      bytesLoaded += x.bytesLoaded;
      bytesTotal += x.bytesTotal;
    }
  }
  if (Module['demoAssetSizeInBytes']) {
    if (bytesTotal > Module['demoAssetSizeInBytes']) {
      console.error('Game downloaded ' + bytesTotal + ' bytes, expected demo size was only ' + Module['demoAssetSizeInBytes'] + '!');
      Module['demoAssetSizeInBytes'] = bytesTotal;
    }
    bytesTotal = Module['demoAssetSizeInBytes'];
  }
  if (bytesTotal == 0) return 1.0;
  return Math.min(1.0, bytesLoaded / bytesTotal);
}

// Use IndexedDB for caching, and kill IndexedDB from the site in question so that it doesn't persist savegame/progress data
// which might make subsequent runs different.
var realIndexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

function openDatabase(dbname, dbversion, callback, errback) {
  try { var openRequest = realIndexedDB.open(dbname, dbversion);
  } catch (e) { return errback(e); }

  openRequest.onupgradeneeded = function(event) {
    var db = event.target.result;
    if (db.objectStoreNames.contains('FILES')) db.deleteObjectStore('FILES');
    db.createObjectStore('FILES');
  };
  openRequest.onsuccess = function(event) { callback(event.target.result); };
  openRequest.onerror = function(error) { errback(error);};
};

function fetchCachedPackage(db, packageName, callback, errback) {
  if (!db) {
    errback('IndexedDB not available!');
    return;
  }
  try {
    var transaction = db.transaction(['FILES'], 'readonly');
    var packages = transaction.objectStore('FILES');
    var getRequest = packages.get("file/" + Module.key + '/' + packageName);
    getRequest.onsuccess = function(event) {
      if (event.target.result) {
        var len = event.target.result.byteLength || event.target.result.length;
        console.log('Loaded file ' + packageName + ' from IndexedDB cache, length: ' + len);
        callback(event.target.result);
      } else {
        // Succeeded to load, but the load came back with the value of undefined, treat that as an error since we never store undefined in db.
        errback();
      }
    };
    getRequest.onerror = function(error) { errback(error); };
  } catch(e) {
    errback(e);
  }
};

function cacheRemotePackage(db, packageName, packageData, callback, errback) {
  if (!db) {
    errback('cacheRemotePackage: IndexedDB not available!');
    return;
  }
  if (location.protocol.indexOf('file') != -1) {
    errback('Loading via file://, skipping caching to IndexedDB');
    return;
  }
  try {
    var transaction = db.transaction(['FILES'], 'readwrite');
    var packages = transaction.objectStore('FILES');
    var putRequest = packages.put(packageData, "file/" + Module.key + '/' + packageName);
    putRequest.onsuccess = function(event) {
      console.log('Stored file ' + packageName + ' to IndexedDB cache.');
      callback(packageName);
    };
    putRequest.onerror = function(error) {
      console.log('Failed to store file ' + packageName + ' to IndexedDB cache!');
      errback(error);
    };
  } catch(e) {
    errback(e);
  }
};

// Async operations that are waiting for the IndexedDB to become available.
idbOpenListeners = [];
var isIdbOpen = undefined; // undefined = not yet tried, false = tried but failed to open, true = available
var dbInstance = undefined;

function idbOpened(db) {
  dbInstance = db;
  isIdbOpen = true;
  for(var i in idbOpenListeners) {
    idbOpenListeners[i](db);
  }
  idbOpenListeners = [];
}
function idbError(e) {
  isIdbOpen = false;
  for(var i in idbOpenListeners) {
    idbOpenListeners[i](null);
  }
  idbOpenListeners = [];
}

if (Module['injectXMLHttpRequests']) {
  openDatabase(Module.xhrCacheName || 'xhrCache', Module.xhrCacheVersion || 2, idbOpened, idbError);
}

function withIndexedDb(func) {
  if (isIdbOpen !== undefined) func(dbInstance);
  else idbOpenListeners.push(func);
}

// dbName: The IndexedDB database name to delete. Default: 'xhrCache'
function clearIndexedDBCache(dbName, onsuccess, onerror, onblocked) {
  if (dbInstance) dbInstance.close();
  if (!dbName) dbName = 'xhrCache';
  var req = realIndexedDB.deleteDatabase(dbName);
  req.onsuccess = function() { console.log('Deleted IndexedDB cache ' + dbName + '!'); if (onsuccess) onsuccess(); }
  req.onerror = function() { console.error('Failed to delete IndexedDB cache ' + dbName + '!'); if (onerror) onerror(); }
  req.onblocked = function() { console.error('Failed to delete IndexedDB cache ' + dbName + ', DB was blocked!'); if (onblocked) onblocked(); }
}

// E.g. use the following function to load one by one (or do it somewhere else and set preloadedXHRs object)
// startupBlocker: If true, then this preload XHR is one without which the reftest game time should not progress. This is used to exclude the time
//                 that the game waits for the network to not count towards the test time.
function preloadXHR(url, responseType, onload, startupBlocker) {
  if (startupBlocker) ++numStartupBlockerXHRsPending; // Used to detect when game time should start.
  ++numPreloadXHRsInFlight; // Used to detect when the last preload XHR has finished and the game loading can start.
  top.postMessage({ msg: 'preloadGame', key: Module.key }, '*');

  function finished(xhrOrData) {
    if (xhrOrData instanceof realXMLHttpRequest) preloadedXHRs[responseType + '_' + url] = xhrOrData;
    else preloadedXHRs[responseType + '_' + url] = {
      response: xhrOrData,
      responseText: xhrOrData,
      status: 200,
      readyState: 4,
      responseURL: url,
      statusText: "200 OK",
      getAllResponseHeaders: function() { return "" },
    };
    preloadedXHRs[responseType + '_' + url].startupBlocker = startupBlocker;

    var len = preloadedXHRs[responseType + '_' + url].response.byteLength || preloadedXHRs[responseType + '_' + url].response.length;
    preloadXHRProgress[responseType + '_' + url] = {
      bytesLoaded: len,
      bytesTotal: len
    };
    top.postMessage({ msg: 'preloadProgress', key: Module.key, progress: totalProgress() }, '*');

    if (onload) onload();
    // Once all XHRs are finished, trigger the page to start running.
    if (--numPreloadXHRsInFlight == 0) {
      console.log('All preload XHRs finished!');
      window.postMessage('preloadXHRsfinished', '*');
    }
  }

  function idbFailed() {
    var xhr = new realXMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = responseType;
    xhr.onprogress = function(evt) {
      if (evt.lengthComputable) {
        preloadXHRProgress[responseType + '_' + url] = { bytesLoaded: evt.loaded, bytesTotal: evt.total};
        top.postMessage({ msg: 'preloadProgress', key: Module.key, progress: totalProgress() }, '*');
      }
    }
    xhr.onload = function() {
      console.log('preloaded XHR ' + url + ' finished!');

      // If the transfer fails, then immediately fire the onload handler, and don't event attempt to cache.
      if ((xhr.status != 200 && xhr.status != 0) || (!xhr.response || !(xhr.response.byteLength || xhr.response.length))) {
        finished(xhr);
      } else {
        // Store the downloaded data to IndexedDB cache.
        withIndexedDb(function(db) {
          function storeFinished() {
            finished(xhr);
          }
          cacheRemotePackage(db, url, xhr.response, storeFinished, storeFinished);
        });
      }
    }
    xhr.send();
  }

  withIndexedDb(function(db) {
    fetchCachedPackage(db, url, finished, idbFailed);
  });
}

if (!Module['providesRafIntegration']) {
  window.realRequestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = function(cb) {
    function hookedCb() {
      if (typeof Module !== 'undefined' && !Module['TOTAL_MEMORY'] && Module['preMainLoop']) Module['preMainLoop'](); // If we are running a non-Emscripten app, pump pre/post main loop handlers for cpu profiler (Module.TOTAL_MEMORY hints if this was Emscripten or not)
      if (typeof Module !== 'undefined' && Module['referenceTestPreTick']) Module['referenceTestPreTick']();
      cb();
      if (typeof Module !== 'undefined' && Module['referenceTestTick']) Module['referenceTestTick']();
      if (typeof Module !== 'undefined' && !Module['TOTAL_MEMORY'] && Module['postMainLoop']) Module['postMainLoop']();
    }
    window.realRequestAnimationFrame(hookedCb);
  }
}

// Hook into XMLHTTPRequest to be able to submit preloaded requests.
if (Module['injectXMLHttpRequests']) {
  XMLHttpRequest = function() {}
  XMLHttpRequest.prototype = {
    open: function(method, url, async) {
      // Don't yet do anything except store the params, since we don't know
      // whether we need to open a real XHR, or if we have a cached one waiting
      // (need the .responseType field for this)
      this.url_ = url;
      this.method_ = method;
      this.async_ = async;
    },

    send: function(data) {
      var this_ = this;
      var xhrKey = this_.responseType_ + '_' + this_.url_;
      this_.xhr_ = preloadedXHRs[xhrKey];
      if (!this.xhr_) {
        var base = document.getElementsByTagName('base');
        if (base.length > 0 && base[0].href) {
          var baseHref = document.getElementsByTagName('base')[0].href;
          var xhrKey = this_.responseType_ + '_' + baseHref + this_.url_;
          if (preloadedXHRs[xhrKey]) this_.xhr_ = preloadedXHRs[xhrKey];
        }
      }
        
      if (this.xhr_) {
        // This particular XHR URL has been downloaded up front. Serve the preloaded one.
        setTimeout(function() {
          if (this_.onprogress) this_.onprogress({ loaded: this_.response.length, total: this_.response.length });
          if (this_.onload) this_.onload();

          // Free up reference to this XHR to not leave behind used memory.
          try {
            if (preloadedXHRs[xhrKey].startupBlocker) --numStartupBlockerXHRsPending;
            delete preloadedXHRs[xhrKey];
          } catch(e) {}
        }, 1);
      } else {
        // To keep the execution coherent for the current set of demos, kill certain outbound XHRs so they don't stall the run.
        if (typeof Module['xhrFilter'] === 'function' && Module['xhrFilter'](this.url_)) return;

        // Attempt to download the asset from IndexedDB cache.
        function idbSuccess(data) {
          this_.xhr_ = {
            response: data,
            responseText: data,
            status: 200,
            readyState: 4,
            responseURL: this_.url_,
            statusText: "200 OK",
            getAllResponseHeaders: function() { return "" },
          };
          var len = data.byteLength || data.length;
          preloadXHRProgress[this_.responseType_ + '_' + this_.url_] = { bytesLoaded: len, bytesTotal: len };
          top.postMessage({ msg: 'preloadProgress', key: Module.key, progress: totalProgress() }, '*');
          if (this_.onprogress) {
            var len = data.byteLength || data.length;
            this_.onprogress({ loaded: len, total: len });
          }
          if (this_.onreadystatechange) this_.onreadystatechange();
          if (this_.onload) this_.onload();
        };
        function idbFail() {
          // The XHR has not been cached up in advance. Log a trace and do it now on demand.
          this_.xhr_ = new realXMLHttpRequest();
          this_.xhr_.onprogress = function(evt) {
            if (evt.lengthComputable) {
              preloadXHRProgress[this_.responseType_ + '_' + this_.url_] = { bytesLoaded: evt.loaded, bytesTotal: evt.total};
              top.postMessage({ msg: 'preloadProgress', key: Module.key, progress: totalProgress() }, '*');
            }
            if (this_.onprogress) this_.onprogress(evt);
          }
          if (this_.responseType_) this_.xhr_.responseType = this_.responseType_;
          this_.xhr_.open(this_.method_, this_.url_, this_.async_);
          this_.xhr_.onload = function() {
            if (preloadXHRProgress[this_.responseType_ + '_' + this_.url_]) preloadXHRProgress[this_.responseType_ + '_' + this_.url_].bytesLoaded = preloadXHRProgress[this_.responseType_ + '_' + this_.url_].bytesTotal;

            // If the transfer fails, then immediately fire the onload handler, and don't event attempt to cache.
            if ((this_.xhr_.status != 200 && this_.xhr_.status != 0) || (!this_.xhr_.response || !(this_.xhr_.response.byteLength || this_.xhr_.response.length))) {
              if (this_.onload) this_.onload();
            } else {
              // Store the downloaded data to IndexedDB cache.
              function onStored() {
                if (this_.onload) this_.onload();
              }
              withIndexedDb(function(db) {
                cacheRemotePackage(db, this_.url_, this_.xhr_.response, onStored, onStored);
              });
            }
          }
          this_.xhr_.send();
        };
        withIndexedDb(function(db) {
          fetchCachedPackage(db, this_.url_, idbSuccess, idbFail);
        });
      }
    },

    getAllResponseHeaders: function() { return this.xhr_.getAllResponseHeaders(); },
    setRequestHeader: function(h, v) { },
    addEventListener: function(s, f) { console.log(s); },
    get response() { return this.xhr_.response; },
    get responseText() { return this.xhr_.responseText; },
    get responseXML() { return this.xhr_.responseXML; },
    get responseType() { return this.responseType_; },
    set responseType(x) { this.responseType_ = x; },
    get status() { return this.xhr_.status; },
    get statusText() { return this.xhr_.statusText; },
    get timeout() { return this.xhr_.timeout; }
  };
}

// XHRs in the expected render output image, always 'reference.png' in the root directory of the test.
function loadReferenceImage() {
  var img = new Image();
  img.src = 'reference.png';
  // reference.png might come from a different domain than the canvas, so don't let it taint ctx.getImageData().
  // See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
  img.crossOrigin = 'Anonymous'; 
  img.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    Module['referenceImageData'] = ctx.getImageData(0, 0, img.width, img.height).data;
  }
  Module['referenceImage'] = img;
}

// Performs the per-pixel rendering comparison test.
function doReferenceTest() {
  var canvas;
  // Find Emscripten-specific location of the GL context that the page has been rendering to.
  if (typeof GLctx !== 'undefined') canvas = GLctx.canvas;
  else if (Module.ctx) canvas = Module.ctx.canvas;
  else if (Module['canvas']) canvas = Module['canvas'];
  else throw 'Cannot find application canvas!';

  // Grab rendered WebGL front buffer image to a JS-side image object.
  var actualImage = new Image();

  function reftest() {
    var timeEnd = performance.realNow();
    var duration = timeEnd - Module['timeStart'];
    var cpuIdle = (duration - accumulatedCpuTime) / duration;
    var fps = numFramesToRender * 1000.0 / duration;
    var wrong = Infinity;
    var testResult = 'FAIL';

    try {
      var img = Module['referenceImage'];
      var div = document.createElement('div');
      
      var actualCanvas = document.createElement('canvas');
      actualCanvas.width = actualImage.width;
      actualCanvas.height = actualImage.height;
      var actualCtx = actualCanvas.getContext('2d');
      actualCtx.drawImage(actualImage, 0, 0);
      var actual = actualCtx.getImageData(0, 0, actualImage.width, actualImage.height).data;
      
      var total = 0;
      var width = img.width;
      var height = img.height;
      var expected = Module['referenceImageData'];
      // Compute per-pixel error diff.
      for (var x = 0; x < width; x++) {
        for (var y = 0; y < height; y++) {
          total += Math.abs(expected[y*width*4 + x*4 + 0] - actual[y*width*4 + x*4 + 0]);
          total += Math.abs(expected[y*width*4 + x*4 + 1] - actual[y*width*4 + x*4 + 1]);
          total += Math.abs(expected[y*width*4 + x*4 + 2] - actual[y*width*4 + x*4 + 2]);
        }
      }

      // Hide all other elements on the page, only show the expected and observed rendered images.
      /* **Disabled: we don't want to change the visual presentation of the child iframe after the test **
      var cn = document.body.childNodes;
      for(var i = 0; i < cn.length; ++i) {
        if (cn[i] && cn[i].style) cn[i].style.display = 'none';
      }
      */

      wrong = Math.floor(total / (img.width*img.height*3)); // floor, to allow some margin of error for antialiasing

      if (wrong < 1000) { // Allow a bit of leeway.
        testResult = 'PASS';
      /* **Disabled: we don't want to change the visual presentation of the child iframe after the test **
        div.innerHTML = 'TEST PASSED. Timescore: ' + duration.toFixed(2) + '. (lower is better)';
        div.style.color = 'green';
        document.body.appendChild(div);
        document.body.appendChild(actualImage); // to grab it for creating the test reference
        */
      } else {
        testResult = 'FAIL';
      /* **Disabled: we don't want to change the visual presentation of the child iframe after the test **
        document.body.appendChild(img); // for comparisons
        div.innerHTML = 'TEST FAILED! The expected and actual images differ on average by ' + wrong + ' units/pixel. ^=expected, v=actual. Timescore: ' + duration.toFixed(3) + '. (lower is better)';
        div.style.color = 'red';
        document.body.appendChild(div);
        document.body.appendChild(actualImage); // to grab it for creating the test reference
        */
      }

    } catch(e) {
      console.error(e);
    }

    var testResults = {
      totalTime: Math.round(duration),
      wrongPixels: wrong,
      result: testResult,
      cpuTime: Math.round(accumulatedCpuTime),
      cpuIdle: cpuIdle,
      fps: fps,
      pageLoadTime: pageLoadTime,
      numStutterEvents: numStutterEvents
    };
    console.log('reftest finished, diff: ' + wrong);

    top.postMessage({ msg: 'stopGame', key: Module.key, results: testResults }, '*');

    if (window.opener) {
      // Post out test results.
      window.opener.postMessage(testResults, "*");
      window.onbeforeunload = null; // Don't call any application onbeforeunload handlers as a response to window.close() below.
      window.close();
    }
  }

  try {
    actualImage.src = canvas.toDataURL();
    actualImage.onload = reftest;
  } catch(e) {
    reftest(); // canvas.toDataURL() likely failed, return results immediately.
  }

  // Emscripten-specific: stop rendering the page further.
  if (typeof Browser !== 'undefined' && Browser.mainLoop) {
    Browser.mainLoop.pause();
    Browser.mainLoop.func = Browser.mainLoop.runner = null;
  }
}

// eventType: "mousemove", "mousedown" or "mouseup".
// x and y: Normalized coordinate in the range [0,1] where to inject the event.
// button: which button was clicked. 0 = mouse left button. If eventType="mousemove", pass 0.
function simulateMouseEvent(eventType, x, y, button) {
  // Remap from [0,1] to canvas CSS pixel size.
  x *= Module['canvas'].clientWidth;
  y *= Module['canvas'].clientHeight;
  var rect = Module['canvas'].getBoundingClientRect();
  // Offset the injected coordinate from top-left of the client area to the top-left of the canvas.
  x = Math.round(rect.left + x);
  y = Math.round(rect.top + y);
  var e = document.createEvent("MouseEvents");
  e.initMouseEvent(eventType, true, true, window,
                   eventType == 'mousemove' ? 0 : 1, x, y, x, y,
                   0, 0, 0, 0,
                   button, null);
  e.programmatic = true;

  // Dispatch to Emscripten's html5.h API:
  if (Module['usesEmscriptenHTML5InputAPI'] && typeof JSEvents !== 'undefined' && JSEvents.eventHandlers && JSEvents.eventHandlers.length > 0) {
    for(var i = 0; i < JSEvents.eventHandlers.length; ++i) {
      if ((JSEvents.eventHandlers[i].target == Module['canvas'] || JSEvents.eventHandlers[i].target == window)
       && JSEvents.eventHandlers[i].eventTypeString == eventType) {
         JSEvents.eventHandlers[i].handlerFunc(e);
      }
    }
  } else {
    // Dispatch directly to browser
    Module['canvas'].dispatchEvent(e);
  }
}

function simulateKeyEvent(eventType, keyCode, charCode) {
  // Don't use the KeyboardEvent object because of http://stackoverflow.com/questions/8942678/keyboardevent-in-chrome-keycode-is-0/12522752#12522752
  // See also http://output.jsbin.com/awenaq/3
  //    var e = document.createEvent('KeyboardEvent');
  //    if (e.initKeyEvent) {
  //      e.initKeyEvent(eventType, true, true, window, false, false, false, false, keyCode, charCode);
  //  } else {

  var e = document.createEventObject ? document.createEventObject() : document.createEvent("Events");
    if (e.initEvent) {
      e.initEvent(eventType, true, true);
    }

  e.keyCode = keyCode;
  e.which = keyCode;
  e.charCode = charCode;
  e.programmatic = true;
  //  }

  // Dispatch directly to Emscripten's html5.h API:
  if (Module['usesEmscriptenHTML5InputAPI'] && typeof JSEvents !== 'undefined' && JSEvents.eventHandlers && JSEvents.eventHandlers.length > 0) {
    for(var i = 0; i < JSEvents.eventHandlers.length; ++i) {
      if ((JSEvents.eventHandlers[i].target == Module['canvas'] || JSEvents.eventHandlers[i].target == window)
       && JSEvents.eventHandlers[i].eventTypeString == eventType) {
         JSEvents.eventHandlers[i].handlerFunc(e);
      }
    }
  } else {
    // Dispatch to browser for real
    Module['canvas'].dispatchEvent ? Module['canvas'].dispatchEvent(e) : Module['canvas'].fireEvent("on" + eventType, e); 
  }
}

var Module;
if (typeof Module === 'undefined') {
  Module = {
    canvas: document.getElementsByTagName('canvas')[0]
  };
}

if (injectingInputStream) {
  // Filter the page event handlers to only pass programmatically generated events to the site - all real user input needs to be discarded since we are
  // doing a programmatic run.
  var overriddenMessageTypes = ['mousedown', 'mouseup', 'mousemove',
    'click', 'dblclick', 'keydown', 'keyup',
    'pointerlockchange', 'pointerlockerror', 'webkitpointerlockchange', 'webkitpointerlockerror', 'mozpointerlockchange', 'mozpointerlockerror', 'mspointerlockchange', 'mspointerlockerror', 'opointerlockchange', 'opointerlockerror',
    'devicemotion', 'deviceorientation',
    'mousewheel', 'wheel', 'WheelEvent', 'DOMMouseScroll',
    'blur', 'focus', 'beforeunload', 'unload', 'error'];

  // Some game demos programmatically fire the resize event. For Firefox and Chrome, we detect this via event.isTrusted and know to correctly pass it through, but to make Safari happy,
  // it's just easier to let resize come through for those demos that need it.
  if (!Module['pageNeedsResizeEvent']) overriddenMessageTypes.push('resize');

  // If this_ is specified, addEventListener is called using that as the 'this' object. Otherwise the current this is used.
  function replaceEventListener(obj, this_) {
    var realAddEventListener = obj.addEventListener;
    obj.addEventListener = function(type, listener, useCapture) {
      ensureNoClientHandlers();
      if (overriddenMessageTypes.indexOf(type) != -1) {
        var filteredEventListener = function(e) { try { if (e.programmatic || !e.isTrusted) listener(e); } catch(e) {} };
        realAddEventListener.call(this_ || this, type, filteredEventListener, useCapture);
        registeredEventListeners.push([this_ || this, type, filteredEventListener, useCapture]);
      } else {
        realAddEventListener.call(this_ || this, type, listener, useCapture);
        registeredEventListeners.push([this_ || this, type, listener, useCapture]);
      }
    }
  }
  if (typeof EventTarget !== 'undefined') {
    replaceEventListener(EventTarget.prototype, null);
  } else {
    var eventListenerObjectsToReplace = [window, document, document.body, Module['canvas']];
    for(var i = 0; i < eventListenerObjectsToReplace.length; ++i) {
      replaceEventListener(eventListenerObjectsToReplace[i], eventListenerObjectsToReplace[i]);
    }
  }
}

// Wallclock time for when we started CPU execution of the current frame.
var referenceTestT0 = 0;

function referenceTestPreTick() {
  ++referenceTestPreTickCalledCount;
  referenceTestT0 = performance.realNow();
  if (pageLoadTime === null) pageLoadTime = performance.realNow() - pageStartupT0;
}
Module['referenceTestPreTick'] = referenceTestPreTick;

// Captures the whole input stream as a JavaScript formatted code.
var recordedInputStream = 'function injectInputStream(referenceTestFrameNumber) { <br>';

function dumpRecordedInputStream() {  
  recordedInputStream += '}<br>';

  var div = document.createElement('div');
  div.innerHTML = '<pre>'+recordedInputStream+'</pre>';
  document.body.appendChild(div);
  Module['canvas'].style = 'display: none';
}

function rampFloat(x0, y0, x1, y1, val) {
  return (val <= x0) ? y0 : (val >= x1 ? y1 : ((val-x0)/(x1-x0)*(y1-y0) + y0));
}

function applyGain(inst, desiredAudioVolume) {
  if (inst && inst.gain && inst.gain.gain) {
    if (inst.gain.gain.originalValue === undefined) inst.gain.gain.originalValue = inst.gain.gain.value;
    inst.gain.gain.value = desiredAudioVolume * inst.gain.gain.originalValue;
  }
}

// Perform a nice fade-in and fade-out of audio volume.
function manageOpenALAudioMasterVolumeForTimedemo() {
  var fadeTime = 90;
  var silenceTime = 90;
  // Only fade out for now.
  if (referenceTestFrameNumber < numFramesToRender-fadeTime-silenceTime) return;

  var desiredAudioVolume = Math.min(rampFloat(0, 0.0, fadeTime, 1.0, referenceTestFrameNumber), rampFloat(numFramesToRender-fadeTime-silenceTime, 1.0, numFramesToRender-silenceTime, 0.0, referenceTestFrameNumber));

  var pageBGAudio = document.getElementById('AudioElement');
  if (pageBGAudio) pageBGAudio.volume = desiredAudioVolume;

  if (typeof AL !== 'undefined' && AL.currentContext && AL.currentContext.gain) {
    AL.currentContext.gain.value = desiredAudioVolume;
  } else {
    if (typeof AL !== 'undefined' && AL.src) {
      for(var i = 0; i < AL.src.length; ++i) {
        var src = AL.src[i];
        applyGain(src, desiredAudioVolume);
      }
    }
  }
  if (typeof WEBAudio !== 'undefined' && WEBAudio.audioInstances) {
    for (var i in WEBAudio.audioInstances) {
      var inst = WEBAudio.audioInstances[i];
      applyGain(inst, desiredAudioVolume);
    }
    // Finally, kill audio altogether.
    if (WEBAudio.audioContext && referenceTestFrameNumber >= numFramesToRender) {
      WEBAudio.audioContext.suspend();
    }
  }
}

// Holds the amount of time in msecs that the previously rendered frame took. Used to estimate when a stutter event occurs (fast frame followed by a slow frame)
var lastFrameDuration = -1;

// Wallclock time for when the previous frame finished.
var lastFrameTick = -1;

function referenceTestTick() {
  --referenceTestPreTickCalledCount;

  if (referenceTestPreTickCalledCount > 0)
    return; // We are being called recursively, so ignore this call.

  if (!runtimeInitialized) return;

  ensureNoClientHandlers();

  var t1 = performance.realNow();
  accumulatedCpuTime += t1 - referenceTestT0;

  var frameDuration = t1 - lastFrameTick;
  lastFrameTick = t1;
  if (referenceTestFrameNumber > 5 && lastFrameDuration > 0) {
    if (frameDuration > 20.0 && frameDuration > lastFrameDuration * 1.35) {
      ++numStutterEvents;
    }
  }
  lastFrameDuration = frameDuration;

  if (numPreloadXHRsInFlight == 0) { // Important! The frame number advances only for those frames that the game is not waiting for data from the initial network downloads.
    if (numStartupBlockerXHRsPending == 0) ++referenceTestFrameNumber; // Actual reftest frame count only increments after game has consumed all the critical XHRs that were to be preloaded.
    ++fakedTime; // But game time advances immediately after the preloadable XHRs are finished.
  }

  if (referenceTestFrameNumber == 1) {
    Module['timeStart'] = t1;
    loadReferenceImage();

    top.postMessage({ msg: 'startGame', key: Module.key }, '*');
  }
  if (injectingInputStream) {
    if (typeof injectInputStream !== 'undefined') {
      injectInputStream(referenceTestFrameNumber);
    }
    manageOpenALAudioMasterVolumeForTimedemo();
  }
  if (referenceTestFrameNumber == numFramesToRender) {
    if (recordingInputStream) {
      dumpRecordedInputStream();
    } else if (injectingInputStream) {
      unloadAllEventHandlers();
      doReferenceTest();
    }
  }
}
Module['referenceTestTick'] = referenceTestTick;

Module['onRuntimeInitialized'] = function() {
  fakedTime = 0;
  referenceTestFrameNumber = 0;
  runtimeInitialized = 1;
  if (typeof cpuprofiler_add_hooks !== 'undefined' && location.search.indexOf('cpuprofiler') != -1) cpuprofiler_add_hooks();
}

// Maps mouse coordinate from canvas CSS pixels to normalized [0,1] range. In y coordinate y grows downwards.
function computeNormalizedCanvasPos(e) {
  var rect = Module['canvas'].getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;
  var clientWidth = Module['canvas'].clientWidth;
  var clientHeight = Module['canvas'].clientHeight;
  x /= clientWidth;
  y /= clientHeight;
  return [x, y];
}

// Inject mouse and keyboard capture event handlers to record input stream.
if (recordingInputStream) {
  Module['canvas'].addEventListener("mousedown", function(e) {
    var pos = computeNormalizedCanvasPos(e);
    recordedInputStream += 'if (referenceTestFrameNumber == ' + referenceTestFrameNumber + ') simulateMouseEvent("mousedown", '+ pos[0] + ', ' + pos[1] + ', 0);<br>';
    });

  Module['canvas'].addEventListener("mouseup", function(e) {
    var pos = computeNormalizedCanvasPos(e);
    recordedInputStream += 'if (referenceTestFrameNumber == ' + referenceTestFrameNumber + ') simulateMouseEvent("mouseup", '+ pos[0] + ', ' + pos[1] + ', 0);<br>';
    });

  Module['canvas'].addEventListener("mousemove", function(e) {
    var pos = computeNormalizedCanvasPos(e);
    recordedInputStream += 'if (referenceTestFrameNumber == ' + referenceTestFrameNumber + ') simulateMouseEvent("mousemove", '+ pos[0] + ', ' + pos[1] + ', 0);<br>';
    });

  window.addEventListener("keydown", function(e) {
    recordedInputStream += 'if (referenceTestFrameNumber == ' + referenceTestFrameNumber + ') simulateKeyEvent("keydown", ' + e.keyCode + ', ' + e.charCode + ');<br>';
    });

  window.addEventListener("keyup", function(e) {
    recordedInputStream += 'if (referenceTestFrameNumber == ' + referenceTestFrameNumber + ') simulateKeyEvent("keyup", ' + e.keyCode + ', ' + e.charCode + ');<br>';
    });

}

// Hide a few Emscripten-specific page elements from the default shell to remove unwanted interactivity options.
if (injectingInputStream || recordingInputStream) {
  var elems = document.getElementsByClassName('fullscreen');
  for(var i in elems) {
    var e = elems[i];
    e.style = 'display:none';
  }
  var output = document.getElementById('output');
  if (output)
    output.style = 'display:none';
}

// Page load starts now.
var pageStartupT0 = performance.realNow();
