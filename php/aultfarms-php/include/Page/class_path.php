<?

class Path
{
  var $path;
  var $root;
  var $fileroot;
  function Path() 
  {
    $this->servername = "aultfarms.com";
    if (preg_match("/\/~(\w+)\//", $_SERVER[PHP_SELF], $matches)) {
      $this->root = "/~" . $matches[1] . "/";
    }
    else {
      $this->root = "/";
    }
    // Note: fileroot and root are from the "root" of the actual public website
    $this->fileroot = realpath(dirname(__FILE__) . "/../../") . "/site/";
    $this->path = array(// Pages:
                        "page_index" => "index.php",
                        "page_login" => "login/index.php",
                        "page_login_callback" => "login/callback.php",
                        "page_logout" => "login/index.php?logout=1",

                        "page_feed_record" => "feed/index.php",
                        "template_feed_record_form" => "feed/form.tpl",

                        // Database Classes
                        "class_query" => "../include/Database/Query/class_query.php",
                        "class_trello" => "../include/Trello/class_trello.php",

                        // External Libraries:
                        "class_openid_consumer" => "../php-openid/Auth/OpenID/Consumer.php",
                        "class_openid_filestore" => "../php-openid/Auth/OpenID/FileStore.php",

                        // Other Classes
                        "class_check" => "../include/Page/class_check.php",
                        "class_page" => "../include/Page/class_page.php",
                        "class_session" => "../include/Page/class_session.php",
                        "class_choices" => "../include/Page/class_choices.php"

                       );
  }

  function getPath($str)
  {
    if (!array_key_exists($str, $this->path)) {
      echo "<H1>ERROR:path $str not found!</h1>";
      return false;
    }
    if (   preg_match("/http:/", $this->path[$str]) || preg_match("/link_/", $str)
        || preg_match("/mms:/", $this->path[$str])) {
      return $this->path[$str];
    }
    return $this->root . $this->path[$str];
  }

  function getWebPath($str) {
    return $this->getPath($str);
  }

  // getFullWebPath returns the full http:// path for a give page.
  // This is useful for links sent in emails, etc.
  function getFullWebPath($str) {
    if (!array_key_exists($str, $this->path)) {
      echo "<H1>ERROR:path $str not found!</h1>";
      return false;
    }
    if (   preg_match("/http:/", $this->path[$str]) || preg_match("/link_/", $str)
        || preg_match("/mms:/", $this->path[$str])) {
      return $this->path[$str];
    }
    return "http://" . $this->servername . "/" . $this->root . $this->path[$str];
  }

  function getFilePath($str)
  {
    if (!array_key_exists($str, $this->path)) {
      echo "<H1>ERROR:path $str not found!</h1>";
      return false;
    }
    if (preg_match("/^font_/", $str)) { // fonts are absolute paths from /
      return $this->path[$str];
    }
    return $this->fileroot . $this->path[$str];
//  return preg_replace("/\//", "\\", $this->fileroot . $this->path[$str]);
  }

  function getEmail($str)
  { 
    if (!array_key_exists($str, $this->path)) {
      echo "<h1>ERROR: path $str not found!</h1>";
      return false;
    }
    return $this->path[$str];
  }

  function getLinkPath($str) {
     if (!array_key_exists($str, $this->path)) {
      echo "<h1>ERROR: path $str not found!</h1>";
      return false;
    }
    return $this->path[$str];
  }

  function getFileRoot() {
    return $this->fileroot;
  }
}
