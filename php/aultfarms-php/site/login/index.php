<?
// Tries to directly login via Google without asking
include_once(realpath(dirname(__FILE__) . "/../../include/Page/class_path.php"));
$path = new Path();
include_once($path->getFilePath("class_page"));
$p = new Page("page_login");
$p->addOpenIDToIncludePath();
include_once($path->getFilePath("class_openid_consumer"));
include_once($path->getFilePath("class_openid_filestore"));
include_once($path->getFilePath("class_trello"));

///////////////////////////////////////////////////
// Register form variables:
///////////////////////////////////////////////////

$p->register("logout", "hidden");
$p->register("form_trello_auth_token", "textbox");
$p->register("submit", "submit", array("value" => "Submit"));

///////////////////////////////////////////////////
// Decide operational state
///////////////////////////////////////////////////

// If logged in to Trello and Google, either logout or show logged_in
if (Session::isLoggedInEverywhere()) {
  if ($logout == "1") {
    $state = "do_logout";
  } else {
    $state = "already_logged_in";
  }

// If not logged in to Trello but we are logged in to Google:
} elseif (Session::isLoggedInGoogle()) {
  if ($p->submitIsSet("submit")) {
    $trello_auth_token = $form_trello_auth_token;
  } else {
    $trello_auth_token = Session::getTrelloAuthToken();
  }
  $state = "start_auth_trello";

// If not logged in anywhere, start Google auth:
} else {
  $state = "start_auth_google";
}

///////////////////////////////////////////////////
// Do stuff based on state:
///////////////////////////////////////////////////

/////////////////////////////////////////////////
// Start Google authorization process:
if ($state == "start_auth_google") {
  // First, create the filestore for openid to save it's stuff:
  if (!Session::getOpenIDTempFile()) {
    $filename = sys_get_temp_dir() . uniqid("/php_openid_filestore");
    if (!is_dir($filename) && !mkdir($filename)) {
      echo "Failed to create $filename!";
    } else {
      Session::setOpenIDTempFile($filename);
    }
  }
  $filestore = new Auth_OpenID_FileStore(Session::getOpenIDTempFile());
  // Next, create the consumer for that filestore:
  $consumer = new Auth_OpenID_Consumer($filestore);
  // Start the auth request with Google's OpenID URL:
  $auth_request = $consumer->begin("https://www.google.com/accounts/o8/id");
  // Generate the Javascript for the for that is submitted:
  $page_content = $auth_request->htmlMarkup("http://aultfarms.com", $path->getFullWebPath("page_login_callback"));
  // Check that content was able to be created (because library has to CURL to google
  // to get an XML document known as an XRDS document in order to build the correct
  // form.)
  if (Auth_OpenID::isFailure($page_content)) {
    $msg = "Failed to generate form.";
    $view = "error";
  } else {
    $view = "javascript_google_form";
  }

/////////////////////////////////////////////////
// Check for proper Trello auth:
} elseif ($state == "start_auth_trello") {
//  $u = User::findByGoogleUserid(Session::getGoogleUserid());
//  $auth_token = $u->getTrelloAuthToken();

  // Check that $auth_token is valid with Trello:
//  if (Trello::validateAuthToken($auth_token)) {
if (false) {
    Session::loginTrello($auth_token);
    $view = "loggedin_everywhere";
  } else {
    $view = "get_new_trello_token";
  }

/////////////////////////////////////////////////
// Logout and show logged_out view:
} elseif ($state == "do_logout") {
  Session::logout();
  $view = "logged_out";

/////////////////////////////////////////////////
// Send user back to original page:
} elseif ($state == "already_logged_in") {
  $view = "redirect_to_index";

} else {
  $view = "undefined";
}

///////////////////////////////////////////////////
// Show next view
///////////////////////////////////////////////////

if ($view == "javascript_google_form") {
  echo $page_content;

} elseif ($view == "get_new_trello_token") {
  $p->startTemplate();?>
  You need to give this website access to your Trello account.
  <a href="https://trello.com/1/authorize?key=<?=Trello::apiKey()?>&name=AultFarms.com&expiration=1day&response_type=token&scope=read,write">Click here</a>
  and copy-paste the access token into this box and submit:
  <form method="POST" action="<?=$p->pageName()?>">
    Access Token: <?$p->displayVar("form_trello_auth_token")?><br>
    <?$p->displayVar("submit");?>
    <?$p->displayVar("view");?>
  </form>
  <?$p->close();

} elseif ($view == "logged_out") {
  $p->startTemplate();
  ?>You have logged out.  <a href="<?=$path->getWebPath("page_login")?>">Login again.</a><?
  $p->close();

} elseif ($view == "redirect_to_index" || $view = "loggedin_everywhere") {
  if (Session::haveLoginRedirectPage()) {
    Session::setLoginRedirectPage("");
    header("Location: " . Session::loginRedirectPage());
  } else {
    header("Location: " . $path->getWebPath("page_index"));
  }

} elseif ($view == "error") {
  $p->startTemplate();
  ?>Error: <?=$msg?><?
  $p->close();

} else {
  echo "Undefined view!";
}

?>
