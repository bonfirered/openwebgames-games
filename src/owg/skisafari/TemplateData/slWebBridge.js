(function($) {
	//JS Class!

	//Constructor
	SLWebBridge = function() {
		this.purchaseProductID = null;
	};

	// ----- Dev-Related Calls -----
	SLWebBridge.prototype.Log = function(text) {
    	SendMessage("Facebook", "ReceiveGenericText", text);
	}
	SLWebBridge.prototype.AnnounceSelf = function() {
		//No longer used, but in case we need to init anything post-player in future:
		SLWebBridge.Log("SLWebBridge IS GO");
	};
	
	// ----- Actual FXPay Calls -----
	SLWebBridge.prototype.FXPay_Init = function() {
		SLWebBridge.Log("SLWebBridge: FXPay_Init!");
		fxpay.init({
		  onerror: function(error) {
		    SLWebBridge.Log('An error occurred: ' + error);
		    SendMessage("FXPay","ReceiveInitError", error);
		  },
		  oninit: function() {
		    SLWebBridge.Log('fxpay initialized without errors');
		    SendMessage("FXPay","ReceiveInitSuccess");
		  },
		  onrestore: function(error, product) {
	    	SLWebBridge.Log("Attempting to restore " + product.name + " from receipt!");
		    // If error is null, product.productId has been restored from receipt.
		    if (error === null) {
		    	SLWebBridge.Log("Product " + product.name + " restored from receipt!");
		    	SendMessage("FXPay","ReceiveProductReceipt", JSON.stringify(product));
		    } else {
		    	SLWebBridge.Log("Failed to restore " + product.name + ": error = " + error);
		    }
		  }
		});
	};
	SLWebBridge.prototype.FXPay_Configure = function(apiUrlBase, fakeProducts) {
		SLWebBridge.Log("SLWebBridge: FXPay_Configure!");
		var _apiUrlBase = (typeof apiUrlBase !== 'undefined' ? apiUrlBase : "ERROR!1!"); //Default
		var _fakeProducts = (typeof fakeProducts !== 'undefined' ? fakeProducts : false); //Default
		if (_fakeProducts) {
			fxpay.configure({
				fakeProducts: true,
				apiUrlBase: _apiUrlBase,
				adapter: null //force re-creation of the adapter
			});
		} else {
			fxpay.configure({
				apiUrlBase: _apiUrlBase,
				adapter: null //force re-creation of the adapter
			});
		}
		SLWebBridge.Log("Configure didn't explode! URL base is now: " + _apiUrlBase + ", fakeProducts = " + _fakeProducts);
	};
	SLWebBridge.prototype.FXPay_GetProducts = function() {
		SLWebBridge.Log("SLWebBridge: FXPay_GetProducts!");
		try {
			fxpay.getProducts(function(error, products) {
				if (error) {
					SLWebBridge.Log('Error getting products: ' + error);
				} else {
					var s = 'Got ' + products.length + ' products! \n';
					for (var i = 0; i < products.length; i++) {
						s += ("ID = " + products[i].productId + ", Name = " + products[i].name + "\n");
					}
					SLWebBridge.Log(s);
					SendMessage("FXPay", "ReceiveGetProducts", JSON.stringify(products));
				}
			});
		} catch (err) {
			SLWebBridge.Log("Caught JS error! Error = " + err);
		}
	};
	SLWebBridge.prototype.FXPay_Purchase = function(productID) {
		SLWebBridge.Log("SLWebBridge: FXPay_Purchase, input = " + productID);
		var _productID = (typeof productID !== 'undefined' ? productID : "1"); //Default
		SLWebBridge.purchaseProductID = _productID;
	};


	//Init
	$(document).ready(function() {

		// Make a global instance of this class.
		window.SLWebBridge = new SLWebBridge();

		/*
		// Add a click handler, to get around popup blocking when purchasing.
		// Instead of having FXPay_Purchase make the purchase call,
		// it fills in "purchaseProductID",
		$("body").click(function(event) {
			//console.log("BODY CLICK! ID = " + SLWebBridge.purchaseProductID);
			if (SLWebBridge.purchaseProductID !== null) {
				//console.log("PURCHASING!");
				fxpay.purchase(SLWebBridge.purchaseProductID, function(error, product) {
					if (error) {
						SLWebBridge.Log(error);
						SendMessage("FXPay", "ReceivePurchaseError", error);
					} else {
						SLWebBridge.Log('Purchased and verified!');
						SendMessage("FXPay", "ReceivePurchaseSuccess");
					}
				});
				SLWebBridge.purchaseProductID = null;
			}
		});
		*/

		//TELL UNITY TO ANNOUNCE US WHEN IT'S READY!
		Module["postRun"].push(SLWebBridge.AnnounceSelf);
	});

})(jQuery);