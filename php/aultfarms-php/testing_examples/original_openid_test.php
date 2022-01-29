<?
include_once(realpath(dirname(__FILE__) . "/openid.php"));

// First, try to login this user via Google:
ini_set("session.save_path", dirname(__FILE__) . "/../aultfarms_sessions");
$session_lifetime_seconds = 60*60*18; // Every 18 hours
ini_set("session.gc_maxlifetime", $session_lifetime_seconds);
ini_set("session.cookie_lifetime", $session_lifetime_seconds);
session_start();

if ($_REQUEST[logout] == "true") {
  $_SESSION = array();
}

if (!$_SESSION[is_logged_in]) {

  if (!$_SESSION[logging_in_with_google]) {
    // Got this from: http://qpleple.com/how-to-make-people-login-into-your-website-with-their-google-account/
    // Redirect to Google for login:

    ?><a href="<?php echo $openid->authUrl() ?>">Login with Google</a><?
     $_SESSION[logging_in_with_google] = true;

  } else { // just got re-posted from logging in with google, process response:
    $openid = new LightOpenID("my-domain.com");
    if ($openid->mode) {
      if ($openid->mode == 'cancel') {
        echo "User has canceled authentication !";
      } elseif($openid->validate()) {
        $data = $openid->getAttributes();
        $email = $data['contact/email'];
        $first = $data['namePerson/first'];
        echo "Identity : $openid->identity <br>";
        echo "Email : $email <br>";
        echo "First name : $first";
        $_SESSION[is_logged_in] = true;
      } else {
        echo "The user has not logged in";
      }
    } else {
      echo "Go to index page to log in.";
    }    
    $_SESSION[logging_in_with_google] = false;
  }
}

?>
Start of page, session = <pre><?print_r($_SESSION);?></pre><br>
<a href="<?=$_SERVER[PHP_SELF]?>?logout=true">Logout</a><br>

