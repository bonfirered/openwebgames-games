function UnityProgress (dom) {
	this.progress = 0.0;
	this.message = "";
	this.dom = $('#logo').get();

	var parent = this.dom;

	// var background = document.createElement("div");
	// background.style.backgroundImage = "url('../Images/LogoEIP_1136x640.png')";
	// background.style.backgroundRepeat = "no-repeat";
	// background.style.backgroundSize = "cover";
	// background.style.position = "absolute";
	// parent.append(background);
	// this.background = background;
	// 
	// var logoImage = document.createElement("img");
	// logoImage.src = "../Images/progresslogo.png"; 
	// logoImage.style.position = "absolute";
	// parent.append(logoImage);
	// this.logoImage = logoImage;
	
	var progressFrame = document.createElement("img");
	progressFrame.src = "Images/progress_bg.png";
	progressFrame.style.position = "absolute";
	progressFrame.style.display = 'none'; /// xxx test harness
	$(parent).append(progressFrame);
	this.progressFrame = progressFrame;

	var progressBar = document.createElement("img");
	progressBar.src = "Images/progress.png";
	progressBar.style.position = "absolute";
	progressBar.style.display = 'none'; /// xxx test harness
	$(parent).append(progressBar);
	this.progressBar = progressBar;

	var messageArea = document.createElement("p");
	messageArea.style.position = "absolute";
	$(parent).append(messageArea);
	this.messageArea = messageArea;


	this.SetProgress = function (progress) { 
		if (this.progress < progress)
			this.progress = progress; 
		this.messageArea.style.display = "none";
		this.progressFrame.style.display = "none";// "inline";
		this.progressBar.style.display = "none";// "inline";			
		this.Update();
	}

	this.SetMessage = function (message) { 
		this.message = message; 
		//this.background.style.display = "inline";
		//this.logoImage.style.display = "inline";
		this.progressFrame.style.display = "none";
		this.progressBar.style.display = "none";			
		this.Update();
	}

	this.Clear = function() {
		//this.background.style.display = "none";
		//this.logoImage.style.display = "none";
		this.progressFrame.style.display = "none";
		this.progressBar.style.display = "none";
	}

	this.Update = function() {
		// this.background.style.top = this.dom.offsetTop + 'px';
		// this.background.style.left = this.dom.offsetLeft + 'px';
		// this.background.style.width = this.dom.offsetWidth + 'px';
		// this.background.style.height = this.dom.offsetHeight + 'px';

		var logoImg = new Image();
		//logoImg.src = this.logoImage.src;
		var progressFrameImg = new Image();
		progressFrameImg.src = this.progressFrame.src;
/*
		this.logoImage.style.top = this.dom.offsetTop + (this.dom.offsetHeight * 0.5 - logoImg.height * 0.5) + 'px';
		this.logoImage.style.left = this.dom.offsetLeft + (this.dom.offsetWidth * 0.5 - logoImg.width * 0.5) + 'px';
		this.logoImage.style.width = logoImg.width+'px';
		this.logoImage.style.height = logoImg.height+'px';
		*/
		this.progressFrame.style.top = ($(this.dom).height() * 0.85 + logoImg.height * 0.15 + 10) + 'px';
		this.progressFrame.style.left = ($(this.dom).width() * 0.5 - progressFrameImg.width * 0.5) + 'px';
		this.progressFrame.width = progressFrameImg.width;
		this.progressFrame.height = progressFrameImg.height;

		this.progressBar.style.top = this.progressFrame.style.top;
		this.progressBar.style.left = this.progressFrame.style.left;
		this.progressBar.width = progressFrameImg.width * Math.min(this.progress, 1);
		this.progressBar.height = progressFrameImg.height;

		this.messageArea.style.top = this.progressFrame.style.top;
		this.messageArea.style.left = 0;
		this.messageArea.style.width = '100%';
		this.messageArea.style.textAlign = 'center';
		this.messageArea.innerHTML = this.message;
	}

	this.Update();
}

