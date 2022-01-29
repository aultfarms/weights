<?
// This page is loaded by Google in response to the original login query.
include_once(realpath(dirname(__FILE__) . "/../../include/Page/class_path.php"));
$path = new Path();
include_once($path->getFilePath("class_page"));
$p = new Page("page_login");
$p->addOpenIDToIncludePath();
include_once($path->getFilePath("class_openid_filestore"));
include_once($path->getFilePath("class_openid_consumer"));

////////////////////////////////////////////////////////////
// Decide operational state
////////////////////////////////////////////////////////////

$state = "finish_auth";

////////////////////////////////////////////////////////////
// Do stuff based on state:
////////////////////////////////////////////////////////////

if ($state == "finish_auth") {
  // First, recreate the filestore and consumer:
  $filestore = new Auth_OpenID_FileStore(Session::getOpenIDTempFile());
  $consumer = new Auth_OpenID_Consumer($filestore);
  // Next, complete the transaction and get the response:
  $response = $consumer->complete($path->getFullWebPath("page_login_callback"));
  // Next, check the status:
  if ($response->status != Auth_OpenID_SUCCESS) {
    $msg = "Failed to authenticate.";
    $view = "error";
  } else {
    // Success!
    Session::loginGoogle(htmlentities($response->getDisplayIdentifier()));
    $view = "google_success_check_trello";
  }    
  
}

////////////////////////////////////////////////////////////
// Show proper view:
////////////////////////////////////////////////////////////

if ($view == "google_success_check_trello") {
  // Send back to the login page to check Trello auth:
  header("Location: " . $path->getFullWebPath("page_login") . "?view=$view");

} elseif ($view == "error") {
  $p->startTemplate();
  ?>An error occurred.  Authentication failed.<?
  $p->close();

} else {
  $p->startTemplate();
  ?>Undefined Error.<?
  $p->close();
}

?>
