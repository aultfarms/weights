<?
include_once(realpath(dirname(__FILE__) . "/class_path.php"));
$path = new Path();
include_once($path->getFilePath("class_session"));
include_once($path->getFilePath("class_check"));

class Page 
{
  var $sysClass;
  var $auth_level;
  var $vars;

  function Page($pageid=false, $title=false, $authentication_level="Public") {
    Session::start();

    switch(strtoupper($authentication_level)) {
      case "PUBLIC"   : $this->auth_level = "PUBLIC";   break;
      case "LOGGEDIN" : $this->auth_level = "LOGGEDIN"; break;
      case "ADMIN"    : $this->auth_level = "ADMIN";    break; 
      default:          $this->auth_level = "UNKNOWN";  break;
    }

    // stuff for print view
    if ($_REQUEST["print_view"] != "Y") {
      $_SESSION["last_request"] = $_REQUEST;
      $this->print = "N";
    }
    else {
      $_REQUEST = $_SESSION["last_request"];
      $this->print = "Y";
    }

    // authentication checking
    if ($this->auth_level == "ADMIN" && !Session::isAdmin()) {
      $this->startTemplate();?>You must be admin for this page.<?$this->close();
      exit;
    }
    if ($this->auth_level == "LOGGEDIN" && !Session::isLoggedInEverywhere()) {
      $this->startTemplate();
      Session::authError();
      $this->close();
      exit;
    }

    $vars = array();
    $this->register("view", "hidden", array("setget" => "none"));
  }

  // Adds the OpenID library to the PHP include path:
  function addOpenIDToIncludePath() {
    set_include_path(realpath(dirname(__FILE__) . "/../../php-openid") . ":" . get_include_path());
  }

  function printView() {
    if ($this->print == "Y") return true;
    else return false;
  }

  function startTemplate($noheader=false)
  {
    global $path;
    ?><html><body><?
    if (Session::isLoggedInEverywhere()) {
      ?><a href="<?=$path->getWebPath("page_logout")?>">Logout</a><?
    } else {
      Session::setLoginRedirectPage($this->pageName());
      ?><a href="<?=$path->getWebPath("page_login")?>">Login</a><?
    }
    ?><br><?
  }

  function displayFooter($noheader=false) 
  {
    ?></body></html><?
  }

  function close($noheader=false)
  {
    $this->displayFooter($noheader);
    $this->closeDatabase();
  }

  function closeDatabase() {
  }

  function pageName()
  {
    return $_SERVER[PHP_SELF];
  }

  // HTML Form Functions
  function register($varname, $type, $attributes=array()) {
    // first, check that $type and $attributes are setup correctly
    // optional attr args: check_func (can be "none")
    //                     check_func_args (additional args passed to check_func)
    //                     error_message (required if there is a check_func)
    //                     setget (part of set and get functions after "set" or "get"
    //                     on_text,off_text (used only for "text" view of checkbox--NOT checkbox_array
    //                     value, used for submit buttons
    //                     filedir (used only for file type)
    switch($type) {
      case "classifier": if (!Check::arrayKeysFormat(array("find_func", "parent_class", "id_setget"), $attributes)) return false;
           break;
      case "textbox": 
           break;
      case "textarea": 
           break;
      case "hidden": 
           break;
      case "password":
           break;
      case "file": if (!Check::arrayKeysFormat(array("filedir", "filedir_webpath"), $attributes)) return false;
                   if (!preg_match("/\/$/", $attributes[filedir])) $attributes[filedir] .= "/";
           break;
      case "submit": if (!Check::arrayKeysFormat(array("value"), $attributes)) return false;
           break;
      case "select":
           break;
      case "checkbox": if (!Check::arrayKeysFormat(array("on_text", "off_text"), $attributes)) return false;
           break;
      case "checkbox_array":  if (!Check::arrayKeysFormat(array("get_choices_array_func"), $attributes)) return false;
           break;
      case "radio": if (!Check::arrayKeysFormat(array("get_choices_array_func"), $attributes)) return false; 
           break;
      case "date_month_year": if (!Check::arrayKeysFormat(array("start_year",
                                                                "get_choices_array_func",), $attributes)) return false;
           break;
      default: return false;
    }
    if ($attributes[use_post] || $attributes[usepost]) { // use this if you are getting back an array from HTML
      $_REQUEST[$varname] = $_POST[$varname];
    }
    if ($type == "select" || $type == "radio") { // check_func is always validSelect
      $attributes[check_func] = "validSelect";
      $attributes[check_func_args] = array($attributes[get_choices_array_func], $attributes[get_choices_array_func_args]);
    }
    $attributes[type] = $type;
    if ($type != "checkbox_array" && $type != "date_month_year" && $type != "classifier" && $type != "file") {
      if ($attributes[usepost] || $attributes[use_post]) {
        $_POST[$varname] = trim($_POST[$varname]);
      } else {
        $_REQUEST[$varname] = trim($_REQUEST[$varname]);
      }
    }
    if ($type != "classifier") {
      $this->vars[$varname] = $attributes;
    } 

    if ($type == "classifier") {
      $this->classifiers[$varname] = $attributes;
    } elseif ($type == "file") {
      $farr_varname = $varname . "_file_array";
      global $$varname;
      global $$farr_varname;
      $$farr_varname = $_FILES[$varname];
      if ($_FILES[$varname][name] != "") {
        $$varname = $_FILES[$varname][name];
      } else {
        $$varname = "";
      }
    } elseif ($type != "date_month_year") {
      global $$varname;
      $$varname = $_REQUEST[$varname]; // put form var into global scope
    } else {
      $vm = $varname . "_month";
      $vy = $varname . "_year";
      global $$vm;
      global $$vy;
      if ($attributes[usepost]) {
        $$vm = $_POST[$vm];
        $$vy = $_POST[$vy];
      } else {
        $$vm = $_REQUEST[$vm];
        $$vy = $_REQUEST[$vy];
      }
    }
    return true;
  }

  function unregister($varname) {
    global $$varname;
    unset($$varname);
    unset($this->vars[$varname]);
    unset($this->classifiers[$varname]);
  }

  // Note: the new name of the uploaded file will be stored in $vname[name],
  // and the original name will be stored in $origname.  The new name of
  // the file is returned on success, and false is returned on failure.
  function fileMove($vname, $perm="777") {
    $attr = $this->vars[$vname];
    $destdir = $attr[filedir];
    $farr_varname = $vname . "_file_array";
    global $$vname;
    global $$farr_varname;
    $file_array = $$farr_varname;
    if (!preg_match("/^(.*)\.(.+)$/", $file_array[name], $matches)) return false;
    $name = $matches[1];
    $ext = "." . $matches[2];
    $filenum = "0";
    // do not overwrite files
    while (file_exists($destdir . $name . $filenum . $ext)) {
      $filenum++;
    }
    $newname = $name . $filenum . $ext;
    if (!move_uploaded_file($file_array[tmp_name], $destdir . $newname)) return false;
    if (preg_match("/^[0-7]{3}$/", $perm)) {
      ob_start();
      system("chmod $perm " . $destdir . $newname);
      $shell_text = ob_end_clean();
    }
    $file_array[origname] = $file_array[name];
    $file_array[name] = $newname;
    $$farr_varname = $file_array;
    $$vname = $newname;
    return $newname;
  }

  function submitIsSet($submitvar_name) {
    global $$submitvar_name;
    if ($$submitvar_name == $this->vars[$submitvar_name][value]) return true;
    return false;
  }

  function setDisplayMode($mode) {
    $this->disp_mode = $mode;
  }

  // set disp_type to either "form" or "success"
  function displayVar($varname, $disp_type = false, $args = array()) {
    if ($disp_type == false) {
      if (!$this->disp_mode) $disp_type = "form";
      else $disp_type = $this->disp_mode;
    }
    switch($this->vars[$varname][type]) {
      case "textbox": $this->printTextbox($varname, $this->vars[$varname], $disp_type);
           break;
      case "textarea": $this->printTextarea($varname, $this->vars[$varname], $disp_type);
           break;
      case "hidden": $this->printHidden($varname, $this->vars[$varname], $disp_type);
           break;
      case "file": $this->printFile($varname, $this->vars[$varname], $disp_type);
           break;
      case "password": $this->printPassword($varname, $this->vars[$varname], $disp_type);
           break;
      case "submit": $this->printSubmit($varname, $this->vars[$varname], $disp_type);
           break;
      case "select": $this->printSelect($varname, $this->vars[$varname], $disp_type, $args);
           break;
      case "checkbox": $this->printCheckbox($varname, $this->vars[$varname], $disp_type);
           break;
      case "checkbox_array": $this->printCheckboxArray($varname, $this->vars[$varname], $disp_type);
           break;
      case "radio": $this->printRadio($varname, $this->vars[$varname], $disp_type);
           break;
      case "date_month_year": $this->printDateMonthYear($varname, $this->vars[$varname], $disp_type);
           break;
      default: return;
    }
  }

  // checkOneVar returns true if the variable passes the check test, false if it is
  // invalid.
  function checkOneVar($v) {
    if (!is_array($this->emessages)) $this->emessages = array();
    if (!is_array($this->elocators)) $this->elocators = array();
    $start_count = count($this->elocators);
    $check = new Check();
    $attr = $this->vars[$v];
    global $$v;
    $_REQUEST[$v] = $$v;
    if ($attr[type] == "checkbox_array") {
      $ch = new Choices();
      $func = $attr[get_choices_array_func];
      $a = $attr[get_choices_array_func_args];
      if (!is_array($a)) {
        $choices = $ch->$func();
      } else {
        switch(count($a)) {
          case 0: $choices = $ch->$func(); break;
          case 1: $choices = $ch->$func($a[0]); break;
          case 2: $choices = $ch->$func($a[0], $a[1]); break;
          case 3: $choices = $ch->$func($a[0], $a[1], $a[2]); break;
        }
      }
      foreach($choices as $c) {
        if ($_REQUEST[$v][$c[value]] != "Y") {
          $_REQUEST[$v][$c[value]] = "N";
        }
      }
    } elseif ($attr[type] == "date_month_year") {
      if (array_key_exists("check_func", $attr) && $attr[check_func] != "none") {
        $func = $attr[check_func];
        $vmonth = $v . "_month";
        $vyear = $v . "_year";
        global $$vmonth;
        global $$vyear;
        $_REQUEST[$vmonth] = $$vmonth;
        $_REQUEST[$vyear] = $$vyear;
        $ret = false;
        $a = $attr[check_func_args];
        if (!is_array($a)) {
          $ret = $check->$func($$vmonth, $$vyear);
        } else {
          switch(count($a)) {
            case 1: $ret = $check->$func($$vmonth, $$vyear, $a[0]); break;
            case 2: $ret = $check->$func($$vmonth, $$vyear, $a[0], $a[1]); break;
            case 3: $ret = $check->$func($$vmonth, $$vyear, $a[0], $a[1], $a[2]); break;
            default: $ret = $check->$func($$vmonth, $$vyear);
          }
        }
        if ($ret) {
          array_push($this->emessages, $attr[error_message] . $ret);
          array_push($this->elocators, $v);
        }
      }
    } elseif ($attr[type] == "file") { // pass file array to check function, not file path
      if (array_key_exists("check_func", $attr) && $attr[check_func] != "none") {
        $func = $attr[check_func];
        $farr_vname = $v . "_file_array";
        global $$v;
        global $$farr_varname;
        $ret = false;
        $a = $attr[check_func_args];
        if (!is_array($a)) {
          $ret = $check->$func($$farr_varname);
        } else {
          switch(count($a)) {
            case 1: $ret = $check->$func($$farr_varname, $a[0]); break;
            case 2: $ret = $check->$func($$farr_varname, $a[0], $a[1]); break;
            case 3: $ret = $check->$func($$farr_varname, $a[0], $a[1], $a[2]); break;
            default: $ret = $check->$func($$farr_varname);
          }
        }
        if ($ret) {
          array_push($this->emessages, $attr[error_message] . $ret);
          array_push($this->elocators, $v);
        }

      }
    } else {
      if (array_key_exists("check_func", $attr) && $attr[check_func] != "none") {
        $func = $attr[check_func];
        $ret = false;
        if (!is_array($attr[check_func_args])) {
          $ret = $check->$func($_REQUEST[$v]);
        } else {
          $a = $attr[check_func_args];
          switch(count($a)) {
            case 1: $ret = $check->$func($_REQUEST[$v], $a[0]); break;
            case 2: $ret = $check->$func($_REQUEST[$v], $a[0], $a[1]); break;
            case 3: $ret = $check->$func($_REQUEST[$v], $a[0], $a[1], $a[2]); break;
            case 4: $ret = $check->$func($_REQUEST[$v], $a[0], $a[1], $a[2], $a[3]); break;
            default: $ret = $check->$func($_REQUEST[$v]);
          }
        }
        if ($ret) {
          array_push($this->emessages, $attr[error_message] . $ret);
          array_push($this->elocators, $v);
        }
      }
    }
    $$v = $_REQUEST[$v];
    if ($start_count < count($this->elocators)) return false;
    return true;
  }

  function checkVars($obj_type = false) {
    if (!is_array($this->emessages)) $this->emessages = array();
    if (!is_array($this->elocators)) $this->elocators = array();
    $check = new Check();
    foreach($this->vars as $v => $attr) {
      if ($obj_type == false || ($obj_type != false && $obj_type == $attr[obj_type])) {
        $this->checkOneVar($v);
      }
    }
    return array("error_messages" => $this->emessages, "error_locators" => $this->elocators);
  }

  function setVars(&$obj, $obj_type = false) {
    foreach ($this->vars as $v => $attr) {
      if (array_key_exists("setget", $attr)) {
        if (   (   ($obj_type == false && !array_key_exists("obj_type", $attr))
                || ($obj_type != false && $attr[obj_type] == $obj_type)       )
            && $attr[setget] != "none" 
            && !array_key_exists("classifier", $attr) ) {
          if ($attr[type] != "date_month_year" && $attr[type] != "file") {
            $func = "set" . $attr[setget];
            global $$v;
            $obj->$func($$v);
          }
          elseif ($attr[type] == "file") {
            $func = "set" . $attr[setget];
            $farr_varname = $v . "_file_array";
            global $$v;
            global $$farr_varname;
            $file_array = $$farr_varname;
            $obj->$func($$v);
          }
          else {
            $func = "set" . $attr[setget];
            $vm = $v . "_month";
            $vy = $v . "_year";
            global $$vm;
            global $$vy;
            $obj->$func($$vm, "month");
            $obj->$func($$vy, "year");
          }
        }
      }
    }
  }

  // use obj_type to call getVars on different types of objects
  function getVars($obj, $obj_type=false) {
    foreach($this->vars as $v => $attr) {
      if (array_key_exists("setget", $attr)) {
        if (   (   ($obj_type == false && !array_key_exists("obj_type", $attr))
                || ($obj_type != false && $attr[obj_type] == $obj_type))
             && !array_key_exists("classifier", $attr)) {
          if ($attr[setget] && $attr[setget] != "none") { 
            if ($attr[type] != "date_month_year" && $attr[type] != "file") {
              $func = "get" . $attr[setget];
              global $$v;
              $$v = $obj->$func();
              $_REQUEST[$v] = $$v;
            }
            elseif ($attr[type] == "file") {
              $func = "get" . $attr[setget];
              $farr_varname = $v . "_file_array";
              global $$v;
              global $$farr_varname;
              $file_array = array("name" => $obj->$func());
              $$farr_varname = $file_array;
              $$v = $file_array[name];
            }
            else {
              $func = "get" . $attr[setget];
              $vm = $v . "_month";
              $vy = $v . "_year";
              global $$vm;
              global $$vy;
              $$vm = $obj->$func("month");
              $$vy = $obj->$func("year");
              $_REQUEST[$vm] = $$vm;
              $_REQUEST[$vy] = $$vy;
            }
          }
        }
      }
    }
    $this->getClassifierVars($obj, 0, false, $obj_type);
  }

  function getClassifierVars($obj, $objid=0, $parent_class=false, $obj_type=false) {
    $local_classifiers = $this->classifiers;
    if (!is_array($local_classifiers)) {
      return;
    }
    foreach($local_classifiers as $cname => $cattr) {
      if (   (   ($obj_type == false && !array_key_exists("obj_type", $cattr))
              || ($obj_type != false && $cattr[parent_obj_type] == $obj_type) ) 
          && ($parent_class == false || $cattr[parent_class] == $parent_class)) {
        $find_func = $cattr[find_func];
        $args = $cattr[find_func_args];
        if (!is_array($args)) {
          $x = $obj->$find_func();
        } else {
          switch(count($args)) {
            case 0: $x = $obj->$find_func(); break;
            case 1: $x = $obj->$find_func($args[0]); break;
            case 2: $x = $obj->$find_func($args[0], $args[1]); break;
            case 3: $x = $obj->$find_func($args[0], $args[1], $args[2]); break;
          }
        }
        $arr = array();
        while ($a = $x->getOne()) {
          $info = array();
          foreach($this->vars as $vname => $vattr) {
            if ($vattr[classifier] == $cname) {
              if (array_key_exists("setget", $vattr)) {
                $getFunc = "get" . $vattr[setget];
                if ($vattr[type] != "date_month_year" && $vattr[type] != "file") {
                  $info[$vname] = $a->$getFunc();
                } 
                elseif ($vattr[type] == "file") {
                  $info[$name] = array("name" => $a->$getFunc());
                } else {
                  $info[$vname."_month"] = $a->$getFunc("month");
                  $info[$vname."_year"] = $a->$getFunc("year");
                }
              }
            }
          }
          $getIdFunc = "get" . $cattr[id_setget];
          $info[objid] = $a->$getIdFunc();
          array_push($arr, $info);
          $this->getClassifierVars($a, $a->$getIdFunc(), $cname, false);
        }
        $this->cvars[$cname][$objid] = $arr;
      }
      $this->cur_classids[$cname] = 0;
      $this->cur_classpos[$cname] = 0;
    }
  }

  function countClassifier($classname) {
    if (!$this->classifiers[$classname][parent_class]) {
      $parentid = 0;
    } else {
      $parent_class = $this->classifiers[$classname][parent_class];
      $parentid = $this->cur_classids[$parent_class];
    }
    if (is_array($this->cvars[$classname][$parentid])) {
      return count($this->cvars[$classname][$parentid]);
    }
    return 0;
  }

  function nextClassifier($classname) {
    if (!$this->classifiers[$classname][parent_class]) {
      $parentid = 0;
    } else {
      $parent_class = $this->classifiers[$classname][parent_class];
      $parentid = $this->cur_classids[$parent_class];
    }
    $pos = $this->cur_classpos[$classname]++;
    $info = &$this->cvars[$classname][$parentid][$pos];
    if (!is_array($info)) {
      return false;
    }
    foreach($info as $vname => $val) {
      global $$vname;
      $$vname = $val;
      $_REQUEST[$vname] = $val;
    }
    $objid = $info[objid];
    $this->cur_classids[$classname] = $objid;
    foreach($this->classifiers as $cname => $cattr) {
      if ($cattr[parent_class] == $classname) {
        $this->cur_classpos[$cname] = 0;
      }
    }
    return true;
  }

  function getChoices() {
    foreach ($this->vars as $v => $attr) {
      if (   $attr[type] == "select"
          || $attr[type] == "checkbox_array" || $attr[type] == "radio") {
        if (strlen($attr[choices_array_var]) > 0) {
          $cname = $attr[choices_array_var];
        } else {
          $cname = $v . "_choices";
        }
        if (isset($$cname)) { // this choices variable already exists, so don't get it again from DB
          continue;
        }
        $cfunc = $attr[get_choices_array_func];
        $ch = new Choices();
        global $$cname;
        $a = $attr[get_choices_array_func_args];
        if (!is_array($a)) $a = array();
        switch(count($a)) {
          case 0: $$cname = $ch->$cfunc(); break;
          case 1: $$cname = $ch->$cfunc($a[0]); break;
          case 2: $$cname = $ch->$cfunc($a[0], $a[1]); break;
          case 3: $$cname = $ch->$cfunc($a[0], $a[1], $a[2]); break;
          case 4: $$cname = $ch->$cfunc($a[0], $a[1], $a[2], $a[3]); break;
          case 5: $$cname = $ch->$cfunc($a[0], $a[1], $a[2], $a[3], $a[4]); break;
          case 6: $$cname = $ch->$cfunc($a[0], $a[1], $a[2], $a[3], $a[4], $a[5]); break;
        }
      }
      elseif ($attr[type] == "date_month_year") {
        $cmname = $v . "_month_choices";
        $cyname = $v . "_year_choices";
        $cfunc = $attr[get_choices_array_func];
        $ch = new Choices();
        global $$cmname;
        global $$cyname;
        $a = $attr[get_choices_array_func_args];
        if (!is_array($a)) $a = array();
        switch(count($a)) {
          case 0: $$cmname = $ch->$cfunc("month", $attr[start_year]); 
                  $$cyname = $ch->$cfunc("year",  $attr[start_year]); break;
          case 1: $$cmname = $ch->$cfunc("month", $attr[start_year], $a[0]);
                  $$cyname = $ch->$cfunc("year",  $attr[start_year], $a[0]); break;
          case 2: $$cmname = $ch->$cfunc("month", $attr[start_year], $a[0], $a[1]);
                  $$cyname = $ch->$cfunc("year",  $attr[start_year], $a[0], $a[1]); break;
          case 3: $$cmname = $ch->$cfunc("month", $attr[start_year], $a[0], $a[1], $a[2]);
                  $$cyname = $ch->$cfunc("year",  $attr[start_year], $a[0], $a[1], $a[2]); break;
        }
      }
    }
  }

  function noErrors() {
    if (is_array($this->elocators) && count($this->elocators) > 0) {
      return false;
    }
    return true;
  }

  function registerErr($locator, $message) {
    if (is_array($this->elocators)) {
      array_push($this->elocators, $locator);
    } else {
      $this->elocators = array($locator);
    }
    if (is_array($this->emessages)) {
      array_push($this->emessages, $message);
    } else {
      $this->emessages = array($message);
    }
    return array("error_messages" => $this->emessages, "error_locators" => $this->elocators);
  }

  function errClass($vname) {
    if (is_array($this->elocators) && in_array($vname, $this->elocators)) { 
      echo " class=error ";
    }
  }

  function varHadError($vname) {
    if (is_array($this->elocators) && in_array($vname, $this->elocators)) {
      return true;
    }
    return false;
  }

  function errText() {
    if (is_array($this->emessages)) {
      echo "<font class=error>";
      foreach($this->emessages as $e) {
        echo $e . "<br>";
      }
      echo "</font>";
    }
  }

  function printTextbox($v, $attr, $disp_type = "form") {
    global $$v;
    $_REQUEST[$v] = $$v;
    $lvar = stripslashes($$v);
    if (Check::notInt($attr[box_size])) {
      $attr[box_size] = 82;
    }
    if ($disp_type == "form") {
      ?><input type=text size=<?=$attr[box_size]?> maxlength=255 name="<?=$v?>" value="<?=htmlspecialchars($lvar)?>"><?
    } else {
      echo $lvar;
    }
  }

  function printPassword($v, $attr, $disp_type = "form") {
    global $$v;
    $_REQUEST[$v] = $$v;
    $lvar = stripslashes($$v);
    if (Check::notInt($attr[box_size])) {
      $attr[box_size] = 82;
    }
    if ($disp_type == "form") {
      ?><input type=password size=<?=$attr[box_size]?> maxlength=255 name="<?=$v?>" value=""><?
    } else {
      echo $lvar;
    }
  }

  function printFile($v, $attr, $disp_type = "form") {
    $farr_varname = $v . "_file_array";
    global $$v;
    global $$farr_varname;
    $filearray = $$farr_varname;
    if (!is_array($filearray)) $filearray = array();
    if ($disp_type == "form") {
      if (array_key_exists("origname", $filearray)) {
        ?><input type=file name="<?=$v?>" value="<?=$filearray[origname]?>"><?
      } else {
        ?><input type=file name="<?=$v?>" value="<?=$filearray[name]?>"><?
      }
    } else {
      ?><a href="<?=($attr[filedir_webpath] . "/" . $filearray[name])?>"><?=$filearray[name]?></a><?
    }
  }

  function printTextarea($v, $attr, $disp_type = "form") {
    global $$v;
    $_REQUEST[$v] = $$v;
    $lvar = stripslashes($$v);
    if ($disp_type == "form") {
      if (!array_key_exists("rows", $attr)) {
        $attr[rows] = 7;
      }
      if (!array_key_exists("cols", $attr)) {
        $attr[cols] = 80;
      }
      ?><textarea rows="<?=$attr[rows]?>" cols="<?=$attr[cols]?>" wrap=hard name="<?=$v?>"><?=$lvar?></textarea><?
    } else {
      echo $lvar;
    }
  }

  function printHidden($v, $attr, $disp_type = "form") {
    global $$v;
    $_REQUEST[$v] = $$v;
    $lvar = stripslashes($$v);
    if ($disp_type == "form") {
      ?><input type=hidden name="<?=$v?>" value="<?=htmlspecialchars($lvar)?>"><?
    } else {
      echo $lvar;
    }
  }

  function printSubmit($v, $attr, $disp_type = "form") {
    global $$v;
    $_REQUEST[$v] = $$v;
    if ($disp_type == "form") {
      ?><input type=submit name="<?=$v?>" value="<?=$attr[value]?>"><?
    }
  }

  function printSelect($v, $attr, $disp_type = "form", $args = array()) {
    global $$v;
    $_REQUEST[$v] = $$v;
    if (strlen($attr[choices_array_var]) > 0) {
      $vchoices = $attr[choices_array_var];
    } else {
      $vchoices = $v . "_choices";
    }
    global $$vchoices;
    $choices = $$vchoices;
    if ($disp_type == "form") {?>
      <select name="<?=$v?>">
      <?foreach($choices as $c) {?>
        <option value="<?=$c[value]?>" <?if ($_REQUEST[$v] == $c[value]) echo "SELECTED";?> ><?=$c[text];
        }?>
      </select><?
    } else {
      foreach($choices as $c) {
        if ($_REQUEST[$v] == $c[value]) { 
          if ($args[lowercase] == true) echo strtolower($c[text]); 
          else echo $c[text];
        }
      }
    }
  }

  function printRadio($v, $attr, $disp_type = "form") {
    global $$v;
    $_REQUEST[$v] = $$v;
    if (strlen($attr[choices_array_var]) > 0) {
      $vchoices = $attr[choices_array_var];
    } else {
      $vchoices = $v . "_choices";
    }
    global $$vchoices;
    $choices = $$vchoices;
    if ($disp_type == "form") {
      foreach($choices as $c) {?>
        <input type="radio" name="<?=$v?>" value="<?=$c[value]?>" <?if ($_REQUEST[$v] == $c[value]) echo "CHECKED";?> ><?=$c[text]?><br><?
      }
    } else {
      foreach($choices as $c) {
        if ($_REQUEST[$v] == $c[value]) { echo $c[text]; }
      }
    }
  }

  // don't set the "array_ind" unless printing from a checkbox_array
  function printCheckbox($v, $attr, $disp_type = "form", $key = -1) {
    if ($key != -1) {
      global $$v;
      $_REQUEST[$v] = $$v;
      $actual_var = $_REQUEST[$v][$key];
      $actual_vname = $v . "[" . $key . "]";
    }
    else {
      global $$v;
      $_REQUEST[$v] = $$v;
      $actual_var = $_REQUEST[$v];
      $actual_vname = $v;
    }
    if ($disp_type == "form") {
      ?><input type=checkbox value="Y" name="<?=$actual_vname?>" <?if ($actual_var == "Y") echo "CHECKED";?> > <?=$attr[on_text]?><?
    } else {
      if ($actual_var == "Y") { echo $attr[on_text]; }
      else { echo $attr[off_text]; }
    }
  }

  function printCheckboxArray($v, $attr, $disp_type = "form") {
    global $$v;
    $_REQUEST[$v] = $$v;
    $vchoices = $v . "_choices";
    global $$vchoices;
    $choices = $$vchoices;
    $str = "";
    if ($disp_type == "form") {
      $counter = 0;
      foreach ($choices as $c) {
        $attr[on_text] = $c[text];
        $this->printCheckbox($v, $attr, "form", $c[value]);
        ?><br><?
      }
    } else {
      $num_yes = 0;
      foreach ($choices as $c) {
        if ($_REQUEST[$v][$c[value]] == "Y") {
          if ($num_yes++ >= 1) {
            $str .= ", ";
          }
          $str .= $c[text];
        }
      }
      if ($str == "") {
        $str = "None";
      }
      echo $str;
    }
  }

  function printDateMonthYear($v, $attr, $disp_type = "form") {
    if ($disp_type == "form") {
      $this->printSelect($v."_month", array("get_choices_array_func" => $attr[get_month_choices_array_func]));
      $this->printSelect($v."_year", array("get_choices_array_func" => $attr[get_year_choices_array_func],
                                           "get_choices_array_func_args" => $attr[get_year_choices_array_func_args]));
    } else {
      $this->printSelect($v."_month", array("get_choices_array_func" => $attr[get_month_choices_array_func]), "text");
      echo " ";
      $this->printSelect($v."_year", array("get_choices_array_func" => $attr[get_year_choices_array_func],
                                           "get_choices_array_func_args" => $attr[get_year_choices_array_func_args]), "text");
    }
  }

}
?>
