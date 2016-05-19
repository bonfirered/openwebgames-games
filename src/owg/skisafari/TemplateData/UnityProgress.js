function UnityProgress (dom) {
	this.progress = 0.0;
	this.message = "";
	this.dom = dom;
	this.spinner = new Spinner({
		color: '#FFF',
		radius: 15
	}).spin();

	var parent = dom.parentNode;
	parent.appendChild(this.spinner.el);

	var messageArea = document.createElement("p");
	messageArea.style.position = "absolute";
	parent.appendChild(messageArea);
	this.messageArea = messageArea;


	this.SetProgress = function (progress) { 
		if (this.progress < progress) {
			this.progress = progress; 
		}
		//this.messageArea.style.display = "none";		
		this.Update();
	}

	this.SetMessage = function (message) { 
		this.message = message; 
		this.Update();
	}

	this.Clear = function() {
		/* Kill the spinner! */
		this.spinner.stop();
		this.messageArea.style.display = "none";		
	}

	this.Update = function() {
		/* Right now this just updates the message text. */
		this.messageArea.style.bottom = 0;
		this.messageArea.style.left = 0;
		this.messageArea.style.width = '100%';
		this.messageArea.style.textAlign = 'center';
		this.messageArea.innerHTML = this.message;
	}

	this.Update ();
}