
var lastPunIdx = 0;

// Displays a random pun string, Fades-in in 500ms, and out in 500ms after 9s
randomPun = function() {

	var punList = [
		"<br>These puns are becoming unbearable",
		"<br>I could kill you with my bear hands",
		"I'll be out in a moment,<br>I'm bearly dressed",
		"I'd tell you a chemistry joke<br>but I know I wouldn't get a reaction",
		"Did you hear about the guy whose<br>whole left side was cut off?<br>He's all right now",
		"I wasn't originally going to get a brain<br>transplant, but then I changed my mind.",
		"I wondered why the baseball was<br>getting bigger. Then it hit me.",
		"I used to be a banker,<br>but then I lost interest",
		"I relish the fact that you've<br>mustard the strength to ketchup to me.",
		"I don't trust these stairs -<br>they're always up to something.",
		"Need an ark to save two of<br>every animal? I Noah guy.",
		"The guy who invented the door<br>nocker got a No-bell prize.",
		"Police were called to a daycare where a<br>three-year-old was resisting a rest.",
		"A bicycle can't stand on its own.<br>It's two-tired.",
		"I'm glad I know sign language.<br>It's pretty handy.",
		"I did a theatrical performance about puns.<br>Really it was just a play on words.",
		"The experienced carpenter really nailed it,<br>but then new guy screwed everything up.",
		"The other day I held the door open for a clown.<br>I thought it was a nice jester.",
		"I used to have a fear of hurdles,<br>but I got over it.",
		"The man who survived mustard gas and pepper<br>spray is now a seasoned veteran.",
	];

	var rand = lastPunIdx;
	while (rand == lastPunIdx) {
		rand = Math.floor(Math.random() * punList.length);
	}
	lastPunIdx = rand;
	
	puns = document.getElementById("puns");
	puns.innerHTML = punList[rand];
  
	$(puns).animate({
			opacity: '1'
		},
		500
	);

	timer = setTimeout( function() {
		$(puns).animate({
				opacity: '0'
			},
			500
		);
	}, 9000);
}

var loopTimer = setInterval(randomPun, 10000);

var showSpinner = function (show) {
	document.getElementById("spinner")    .style.display = show ? "inherit" : "none";
	document.getElementById("bgBar")      .style.display = show ? "none" : "inherit";
	document.getElementById("progressBar").style.display = show ? "none" : "inherit";
}
showSpinner(true);

function UnityProgress (dom) {
	
	this.progress = 0.0;
	this.message = "";
	this.dom = dom;

	var parent = dom.parentNode;

	createjs.CSSPlugin.install(createjs.Tween);
	createjs.Ticker.setFPS(60);

	this.SetProgress = function (progress) { 
		if (this.progress < progress) {
			this.progress = progress; 
			showSpinner(progress <= 0 || progress >= 1);
		}
		
		this.Update();
		
		if (progress >= 1) {
			this.SetMessage("INITIALIZING...");
			
			clearTimeout(loopTimer);
			puns = document.getElementById("puns");
			puns.innerHTML = "Almost there!!";
		} 
	}

	this.SetMessage = function (message) { 
		this.message = message; 
		this.Update();
	}

	this.Clear = function() {
		document.getElementById("loadingBox").style.display = "none";
		clearTimeout(loopTimer);
	}

	this.Update = function() {
		var length = 300 * Math.min(this.progress, 1);
		bar = document.getElementById("progressBar");
		createjs.Tween.removeTweens(bar);
		createjs.Tween.get(bar).to({width: length}, 500, createjs.Ease.sineOut);		
		bar.style.width = length + "px";
		
		if (this.progress <= 0 || this.progress >= 1) {
			showSpinner(true);
			document.getElementById("loadingInfo").innerHTML = "DOWNLOADING...";
		} else {
//			document.getElementById("loadingInfo").innerHTML = "DOWNLOADING... " + Math.floor(this.progress * 100) + "%";
			
			// TODO: Parse this to show proper Mb/Mb numbers
			document.getElementById("loadingInfo").innerHTML = this.message;
		}
	}

	this.Update ();
}

