(function(b,r,a,n,c,h,_,s,d,k){if(!b[n]||!b[n]._q){for(;s<_.length;)c(h,_[s++]);d=r.createElement(a);d.async=1;d.src="https://cdn.branch.io/branch-v1.8.8.min.js";k=r.getElementsByTagName(a)[0];k.parentNode.insertBefore(d,k);b[n]=h}})(window,document,"script","branch",function(b,r){b[r]=function(){b._q.push([r,arguments])}},{_q:[],_v:1},"addListener applyCode banner closeBanner creditHistory credits data deepview deepviewCta first getCode init link logout redeem referrals removeListener sendSMS setIdentity track validateCode".split(" "), 0);
branch.init('key_live_kmmSNf4cCmvlT2IgRrNaskjeACiudvs1');

function sendSMS(phone, progress) {
	var linkData = {
		tags: [],
		channel: 'SMS',
		feature: 'Upsell',
		data: {
			'progress': progress,
			'$one_time_use': true
		}
	};
	var options = {
		make_new_link: true
	};
	var callback = function(err, result) {
		SendMessage("UpsellDialog", "SMSFinished", err ? 0 : 1);
	};
	branch.sendSMS(phone, linkData, options, callback);
}
