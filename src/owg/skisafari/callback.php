<?php                                    
// Please make sure to REPLACE the value of VERIFY_TOKEN 'abc' with 
// your own secret string. This is the value to pass to Facebook 
//  when adding/modifying this subscription.
// VERIFY_TOKEN is the App Secret string!  Putting both prod & test strings here.
//define('VERIFY_TOKEN', 'a73d431f84db264ca5b3be74a39cb07f'); // Skisafari
define('VERIFY_TOKEN', '733089f3c9db1c4225fb5d51a9f2c780'); // Skisafari - Test 1


// Now, this script has to be able to do TWO things:
// 1.) Respond to GET requests in order to verify subscriptions
// 2.) Respond to POST data that is sent when an update happens
$method = $_SERVER['REQUEST_METHOD'];                             
   
//-----------------------VERIFY SUBSCRIPTIONS-----------------------//

// When you add or change a subscription (payment object?) Facebook hits this script
// to verify it, and passes in the 3 "hub" params.

// (In PHP, dots and spaces in query parameter names are converted to 
// underscores automatically. So we need to check "hub_mode" instead
//  of "hub.mode".)
if ($method == 'GET' &&
	$_GET['hub_mode'] == 'subscribe' &&       
    $_GET['hub_verify_token'] == VERIFY_TOKEN) {
  	
  	echo $_GET['hub_challenge']; //Random string from FB, parroted back

//--------------------------HANDLE UPDATE---------------------------//
} else if ($method == 'POST') {                                   
  $updates = json_decode(file_get_contents("php://input"), true); 
  // This request must complete within 15 seconds.
  // Otherwise Facebook server will consider it a timeout and 
  // resend the push notification again.

  // This request is of content type application/json with a bunch of fields
  // including object type, id, list of changes, and time.

  // The header also includes a "X-Hub-Signature" which WE SHOULD USE to verify
  // the signature.

  // Please note that the calculation is made on the escaped unicode version of the payload,
  // with lower case hex digits. If you just calculate against the decoded bytes, you will
  // end up with a different signature. For example, the string äöå should be escaped
  // to \u00e4\u00f6\u00e5.

  error_log('updates = ' . print_r($updates, true));

  // With no more output, we're just sending an "OK" message, which is fine for now.           
}
