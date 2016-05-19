function doLetterboxes() {
  //Grab total window width & height
  var w = window.innerWidth;
  var h = window.innerHeight;
  var aspectRatio = w/h;

  var minAspectRatio = 5/4;   //1.25
  var maxAspectRatio = 21/8;  //2.625

  //console.log("Letterboxes! Ratio = " + aspectRatio + ", w = " + w + ", h = " + h);
  // Set or clear vertical (top and bottom) letterboxes
  if (aspectRatio < minAspectRatio) {
    // At minAspectRatio, height should be 100
    // At 0 aspectRatio, height should be 0
    var newHeightPercent = 100 * (aspectRatio/minAspectRatio);
    $(".template .template-wrap")
      .css("height",newHeightPercent + "%");

  } else {
    $(".template .template-wrap")
      .css("height","100%");
  }

  // Set or clear horizontal (left and right side) letterboxes
  if (aspectRatio > maxAspectRatio) {
    // At maxAspectRatio, width should be 100
    // At infinity aspectRatio, width should be 0
    var newWidthPercent = 100 * (maxAspectRatio/aspectRatio);
    $(".template .template-wrap")
      .css("width",newWidthPercent + "%");

  } else {
    $(".template .template-wrap")
      .css("width","100%");
  }

}

window.addEventListener('resize', doLetterboxes);