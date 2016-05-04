// featuretest.js: Small test code to perform feature testing of browser capabilities.
// Call the function browserFeatureTest(successCallback) to run the test (see below).

function estimateMaxContiguousSystemMemory() {
  var test = [4*1024, 3*1024, 2*1024, 2*1024 - 16, 1024 + 768, 1024 + 512, 1024 + 256, 1024, 768, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
  for(var t in test) {
    var mem = test[t]*1024*1024;
    try {
      var a = new ArrayBuffer(mem);
      if (a.byteLength != mem) throw '';
      var v = new Float64Array(a);
      for(var i = 0; i < v.length/1024/1024; ++i) {
        v[i*1024*1024] = i;
      }
      return mem;
    } catch(e) {
      // pass
    }
  }
  return 0;
}

function estimateVSyncRate(completionCallback) {
  var numFramesToRun = 120;
  var t0 = performance.now();
  var deltas = [];
  function tick() {
    var t1 = performance.now();
    deltas.push(t1-t0);
    t0 = t1;
    if (--numFramesToRun > 0) {
      requestAnimationFrame(tick);
    } else {
      deltas.sort();
      deltas = deltas.slice((deltas.length/3)|0, ((2*deltas.length+2)/3)|0);
      var sum = 0;
      for(var i in deltas) sum += deltas[i];
      completionCallback(1000.0 / (sum/deltas.length));
    }
  }
  requestAnimationFrame(tick);
}

Date.prototype.yyyymmddhhmm = function() {
   var yyyy = this.getFullYear();
   var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
   var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
   var hh = this.getHours() < 10 ? "0" + this.getHours() : this.getHours();
   var min = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes();
   return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min;
  };

var displayRefreshRate = -1; // Global value that is asynchronously computed (once), and then reported directly.

// Performs the browser feature test. Immediately returns a JS object that contains the results of all synchronously computable fields, and launches asynchronous
// tasks that perform the remaining tests. Once the async tasks have finished, the given successCallback function is called, with the full browser feature test
// results object as the first parameter.
function browserFeatureTest(successCallback) {
  var supportedApis = [];
  var unsupportedApis = [];
  function storeSupport(apiname, cmp) {
    if (cmp) supportedApis.push(apiname);
    else unsupportedApis.push(apiname);
  }

  var hasBlobConstructor = false;
  try {
    new Blob();
    hasBlobConstructor = true;
  } catch(e) { }

  storeSupport('Math.imul()', typeof Math.imul !== 'undefined');
  storeSupport('Math.fround()', typeof Math.fround !== 'undefined');
  storeSupport('ArrayBuffer.transfer()', typeof ArrayBuffer.transfer !== 'undefined');
  storeSupport('Web Audio', typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined');
  storeSupport('Pointer Lock', document.body.requestPointerLock || document.body.mozRequestPointerLock || document.body.webkitRequestPointerLock || document.body.msRequestPointerLock);
  storeSupport('Fullscreen API', document.body.requestFullscreen || document.body.msRequestFullscreen || document.body.mozRequestFullScreen || document.body.webkitRequestFullscreen);
  storeSupport('new Blob()', hasBlobConstructor);
  if (!hasBlobConstructor) storeSupport('BlobBuilder', typeof BlobBuilder !== 'undefined' || typeof MozBlobBuilder !== 'undefined' || typeof WebKitBlobBuilder !== 'undefined');
  storeSupport('SharedArrayBuffer', typeof SharedArrayBuffer !== 'undefined');
  storeSupport('navigator.hardwareConcurrency', supportsNavigatorHardwareConcurrency);
  storeSupport('SIMD.js', typeof SIMD !== 'undefined');
  storeSupport('Web Workers', typeof Worker !== 'undefined');
  storeSupport('Gamepad API', navigator.getGamepads || navigator.webkitGetGamepads);
  storeSupport('IndexedDB', typeof indexedDB !== 'undefined');
  storeSupport('Visibility API', typeof document.visibilityState !== 'undefined' || typeof document.hidden !== 'undefined');
  storeSupport('requestAnimationFrame()', typeof requestAnimationFrame !== 'undefined');
  storeSupport('performance.now()', typeof performance !== 'undefined' && performance.now);
  storeSupport('WebSockets', typeof WebSocket !== 'undefined');
  storeSupport('WebRTC', typeof RTCPeerConnection !== 'undefined' || typeof mozRTCPeerConnection !== 'undefined' || typeof webkitRTCPeerConnection !== 'undefined' || typeof msRTCPeerConnection !== 'undefined');
  storeSupport('Vibration API', navigator.vibrate);
  storeSupport('Screen Orientation API', window.screen && (window.screen.orientation || window.screen.mozOrientation || window.screen.webkitOrientation || window.screen.msOrientation));
  storeSupport('Geolocation API', navigator.geolocation);
  storeSupport('Battery Status API', navigator.getBattery);

  var hwgl2 = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  var swgl2 = document.createElement('canvas').getContext('webgl2');
  var hwgl1 = document.createElement('canvas').getContext('webgl', { failIfMajorPerformanceCaveat: true }) || document.createElement('canvas').getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true });
  var swgl1 = document.createElement('canvas').getContext('webgl') || document.createElement('canvas').getContext('experimental-webgl');

  if (swgl1 && !hwgl1) storeSupport('WebGL 1 (software rasterized)', true);
  else storeSupport('WebGL 1', hwgl1);

  if (swgl2 && !hwgl2) storeSupport('WebGL 2 (software rasterized)', true);
  else storeSupport('WebGL 2', hwgl2);

  var gl = hwgl2 || hwgl1 || swgl2 || swgl1;

  function performance_now() { return performance.now(); }
  if (!Math.fround) Math.fround = function(x) { return x; }
  function CpuBenchmark(stdlib, foreign, buffer) {
    "use asm";
    var performance_now = foreign.performance_now;
    var Math_fround = stdlib.Math.fround;
    var i32 = new stdlib.Int32Array(buffer);
    var f32 = new stdlib.Float32Array(buffer);
    var f64 = new stdlib.Float64Array(buffer);
    function cpuBenchmark() {
      var t0 = 0.0, t1 = 0.0, i = 0, a = 0, b = 0, c = 0;
      a = performance_now()|0; b = performance_now()|0; c = performance_now()|0; t0 = +performance_now(); i = 0;
      do { a = a + c | 0; b = b + a | 0; c = c + b | 0; a = a + c | 0; b = b + a | 0; c = c + b | 0; a = a + c | 0; b = b + a | 0; c = c + b | 0; i = i + 1 | 0; } while((i | 0) != 1048576);
      t1 = +performance_now(); i32[0>>2] = c; return t1 - t0;
    }

    // Inside asm.js module
    function doesCanonicalizeNans() {
      var f = Math_fround(0.0);
      var d = 0.0;
      var canonicalizes = 0;
      // Single-precision
      i32[0] = -1;
      f = Math_fround(f32[0]);
      f32[1] = f;
      if ((i32[1]|0) != -1) canonicalizes = 1;
      i32[0] = 0x7FC00000;
      f = Math_fround(f32[0]);
      f32[1] = f;
      if ((i32[1]|0) != 0x7FC00000) canonicalizes = 1;
      // Double-precision
      i32[2] = -1;
      i32[3] = -1;
      d = +f64[1];
      f64[2] = d;
      if ((i32[4]|0) != -1) canonicalizes = 1;
      if ((i32[5]|0) != -1) canonicalizes = 1;
      i32[2] = 0;
      i32[3] = 0x7FC00000;
      d = +f64[1];
      f64[2] = d;
      if ((i32[4]|0) != 0) canonicalizes = 1;
      if ((i32[5]|0) != 0x7FC00000) canonicalizes = 1;
      return canonicalizes|0;
    }
    return { cpuBenchmark: cpuBenchmark, doesCanonicalizeNans: doesCanonicalizeNans };
  }
  var heap = new ArrayBuffer(0x10000);
  var i32 = new Int32Array(heap);
  var u32 = new Uint32Array(heap);
  var u16 = new Uint16Array(heap);
  u32[64] = 0x7FFF0100;
  var typedArraysAreLittleEndian;
  if (u16[128] === 0x7FFF && u16[129] === 0x0100) typedArraysAreLittleEndian = false;
  else if (u16[128] === 0x0100 && u16[129] === 0x7FFF) typedArraysAreLittleEndian = true;
  else typedArraysAreLittleEndian = 'unknown';
  // else leave typedArraysAreLittleEndian undefined, we got unknown endianness
  var f32 = new Float32Array(heap);
  var f64 = new Float64Array(heap);
  var benchmark = CpuBenchmark(window, { performance_now: performance_now }, heap);
  // Do a few measurements
  var seconds = []; for(var i = 0; i < 100; ++i) seconds.push(benchmark.cpuBenchmark()/1000);
  // Take best result as an indicator of CPU performance
  var secondsAvg = seconds.sort()[0];
  // Alternative: remove some outliers & compute the average of the remaining.
//    seconds = seconds.sort().slice(30, 75); var secondsAvg = 0; for(var i in seconds) secondsAvg += seconds[i]; secondsAvg /= seconds.length;
  // Compute MIPS performance count
  var instructions = 1048576/*# of loop iterations*/ * 10/*# of adds in iteration*/;
  var singleCoreMips = Math.round(instructions / secondsAvg / 1000000/*ips->mips*/);

  // Outside asm.js module
  function doesCanonicalizeNans() {
    var f = Math.fround(0.0);
    var d = 0.0;
    var canonicalizes = 0;
    // Single-precision
    i32[0] = -1;
    f = Math.fround(f32[0]);
    f32[1] = f;
    if ((i32[1]|0) != -1) canonicalizes = 1;
    i32[0] = 0x7FC00000;
    f = Math.fround(f32[0]);
    f32[1] = f;
    if ((i32[1]|0) != 0x7FC00000) canonicalizes = 1;
    // Double-precision
    i32[2] = -1;
    i32[3] = -1;
    d = +f64[1];
    f64[2] = d;
    if ((i32[4]|0) != -1) canonicalizes = 1;
    if ((i32[5]|0) != -1) canonicalizes = 1;
    i32[2] = 0;
    i32[3] = 0x7FF80000;
    d = +f64[1];
    f64[2] = d;
    if ((i32[4]|0) != 0) canonicalizes = 1;
    if ((i32[5]|0) != 0x7FF80000) canonicalizes = 1;
    return canonicalizes;
  }

  var canonicalizesNansInsideAsmModule = benchmark.doesCanonicalizeNans();
  var canonicalF32NanValueInsideAsmModule = '0x' + padLengthLeft(u32[1].toString(16), 8, '0');
  var canonicalF64NanValueInsideAsmModule = '0x' + padLengthLeft(u32[5].toString(16), 8, '0') + padLengthLeft(u32[4].toString(16), 8, '0');
  var canonicalizesNansOutsideAsmModule = doesCanonicalizeNans();
  var canonicalF32NanValueOutsideAsmModule = '0x' + padLengthLeft(u32[1].toString(16), 8, '0');
  var canonicalF64NanValueOutsideAsmModule = '0x' + padLengthLeft(u32[5].toString(16), 8, '0') + padLengthLeft(u32[4].toString(16), 8, '0');

  var results = {
    userAgent: navigator.userAgent,
    contiguousSystemMemory: estimateMaxContiguousSystemMemory(),
    runDate: new Date().yyyymmddhhmm(),
    buildID: navigator.buildID,
    appVersion: navigator.appVersion,
    mozE10sEnabled: navigator.mozE10sEnabled,
    oscpu: navigator.oscpu,
    platform: navigator.platform,
    displayRefreshRate: displayRefreshRate, // Will be asynchronously filled in on first run, directly filled in later.
    windowDevicePixelRatio: window.devicePixelRatio,
    screenWidth: screen.width,
    screenHeight: screen.height,
    physicalScreenWidth: screen.width*window.devicePixelRatio,
    physicalScreenHeight: screen.height*window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency, // If browser does not support this, will be asynchronously filled in by core estimator.
    singleCoreMips: singleCoreMips,
    supportsWebGL: gl ? true : false, // Denotes if any kind of WebGL is available. Specified here for conveniency to avoid needing to parse supportedApis list for the four different possible flavors of WebGL.
    supportedApis: supportedApis,
    unsupportedApis: unsupportedApis,
    canonicalizesNansInsideAsmModule: canonicalizesNansInsideAsmModule,
    canonicalF32NanValueInsideAsmModule: canonicalF32NanValueInsideAsmModule,
    canonicalF64NanValueInsideAsmModule: canonicalF64NanValueInsideAsmModule,
    canonicalizesNansOutsideAsmModule: canonicalizesNansOutsideAsmModule,
    canonicalF32NanValueOutsideAsmModule: canonicalF32NanValueOutsideAsmModule,
    canonicalF64NanValueOutsideAsmModule: canonicalF64NanValueOutsideAsmModule
  };

  if (gl) {
    results.GL_VENDOR = gl.getParameter(gl.VENDOR);
    results.GL_RENDERER = gl.getParameter(gl.RENDERER);
    results.GL_VERSION = gl.getParameter(gl.VERSION);
    results.GL_SHADING_LANGUAGE_VERSION = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);

    var WEBGL_debug_renderer_info = gl.getExtension('WEBGL_debug_renderer_info');
    if (WEBGL_debug_renderer_info) {
      results.GL_UNMASKED_VENDOR_WEBGL = gl.getParameter(WEBGL_debug_renderer_info.UNMASKED_VENDOR_WEBGL);
      results.GL_UNMASKED_RENDERER_WEBGL = gl.getParameter(WEBGL_debug_renderer_info.UNMASKED_RENDERER_WEBGL);
    }
    results.supportedWebGLExtensions = gl.getSupportedExtensions();
  }

  // Spin off the asynchronous tasks.

  var numCoresChecked = navigator.hardwareConcurrency > 0;
  var vsyncChecked = displayRefreshRate > 0;

  // On first run, estimate the number of cores if needed.
  if (!numCoresChecked) {
    navigator.getHardwareConcurrency(function(cores) {
      results.hardwareConcurrency = cores;
      numCoresChecked = true;

      // If this was the last async task, fire success callback.
      if (numCoresChecked && vsyncChecked && successCallback) successCallback(results);
    });
  }

  // On first run, estimate the display vsync rate.
  if (!vsyncChecked) {
    estimateVSyncRate(function(rate) {
      displayRefreshRate = results.displayRefreshRate = Math.round(rate);
      vsyncChecked = true;

      // If this was the last async task, fire success callback.
      if (numCoresChecked && vsyncChecked && successCallback) successCallback(results);
    });
  }

  // If none of the async tasks were needed to be executed, queue success callback.
  if (numCoresChecked && vsyncChecked && successCallback) setTimeout(function() { successCallback(results); }, 1);

  // If caller is not interested in asynchronously fillable data, also return the results object immediately for the synchronous bits.
  return results;
}