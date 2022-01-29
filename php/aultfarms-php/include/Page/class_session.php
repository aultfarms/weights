<?
include_once(realpath(dirname(__FILE__) . "/class_path.php"));
$path = new Path();

class Session {
  function start() { session_start(); }
  function destroy() { $_SESSION = array(); }
  function authError() { 
    global $path;
    Session::setLoginRedirectPage($_SERVER[PHP_SELF]);
    ?>You must <a href="<?=$path->getWebPath("page_login")?>">Login</a> to view this page.<?
    exit;
  }

  function loginRedirectPage() { return $_SESSION[login_redirect_page]; }
  function haveLoginRedirectPage() { return (strlen($_SESSION[login_redirect_page]) > 0); }
  function setLoginRedirectPage($url) { $_SESSION[login_redirect_page] = $url; }

  function loginGoogle($userid) {
    Session::setIsLoggedInGoogle(true);
    Session::setGoogleUserid($userid);
  }
  function loginTrello($auth_token) {
    Session::setIsLoggedInEverywhere(true);
    Session::setTrelloAuthToken($auth_token);
  }
  function logout() {
    Session::setIsLoggedInEverywhere(false);
    Session::setIsLoggedInGoogle(false);
    Session::setGoogleUserid("");
    Session::setTrelloAuthToken("");
  }

  function isLoggedInGoogle() { return $_SESSION[is_logged_in_google]; }
  function setIsLoggedInGoogle($val) { $_SESSION[is_logged_in_google] = $val; }

  function isLoggedInEverywhere() { return $_SESSION[is_logged_in_everywhere]; }
  function setIsLoggedInEverywhere($val) { $_SESSION[is_logged_in_everywhere] = $val; }

  function isAdmin() { return false; }

  function setGoogleUserid($userid) { $_SESSION[userid] = $userid; }
  function getGoogleUserid() { return $_SESSION[userid]; }

  function setTrelloAuthToken($token) { $_SESSION[trello_auth_token] = $token; }
  function getTrelloAuthToken() { return $_SESSION[trello_auth_token]; }

  function setOpenIDTempFile($file) { $_SESSION[openid_tempfile] = $file; }
  function getOpenIDTempFile() { return $_SESSION[openid_tempfile]; }

}
