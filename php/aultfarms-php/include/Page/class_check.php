<?
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
include_once(dirname(__FILE__) . "/class_path.php");
$path = new Path();
include_once($path->getFilePath("class_choices"));
include_once($path->getFilePath("class_session"));

class Check
{


  function no_commas($str) {
    return preg_replace("/,/", "", $str);
  }

  function notInt($v) {
    if (!preg_match("/^[0-9]+$/", $v)) {
      return true;
    }
    return false;
  }

  function isInt($v) {
    if (preg_match("/^[0-9]+$/", $v)) return true;
    return false;
  }

  function isDate($d) {
    if (!preg_match("/^[0-9]{4}-[01][0-9]-[03][0-9]$/", $d)) return false;
    return true;
  }

  function strip_slashes($s) {
    return stripslashes($s);
  }

  function addSlashes($str) {
    $str = str_replace("\\", "", $str);
    return addslashes($str);
  }

  function stripSlashes($str) {
    $str = str_replace("\\", "", $str);
    return stripslashes($str);
  }

  function formatTimestamp($t) {
    $db = new Query();
    $db->execute("SELECT DATE_FORMAT('$t', '%M %D, %Y') as date");
    $db->get();
    return $db->date;
  }

  function arrayKeysFormat($keys, $arr=false) {
    foreach($keys as $k) {
      if (is_array($arr) && !array_key_exists($k, $arr)) {
        return false;
      }
    }
    return true;
  }

  function dbstr2Array($str) {
    $a1 = split(";;;", $str);
    $arr = array();
    foreach($a1 as $a) {
      $a3 = split("<;=;>", $a);
      $arr[$a3[0]] = $a3[1];
    }
    return $arr;
  }

  function array2Dbstr($arr) {
    $flag = true;
    if (is_array($arr)) {
      foreach ($arr as $key => $val) {
        $new = $key . "<;=;>" . $val;
        if ($flag) {
          $str = $new;
          $flag = false;
        } else {
          $str .= ";;;" . $new;
        }
      }
      return $str;
    } else {
      return "";
    }
  }


  /*********************************************************************************
   * Error Checking functions: return false if given attribute IS valid, otherwise *
   * returns a string describing the error with the given input, for use in        *
   * sending to user                                                               *
   *********************************************************************************/

  function validHeight($val) {
    $val = stripslashes($val);
    if (strlen($val) < 1) return " Invalid: cannot be blank";
    if (!preg_match("/^[0-9]' *[0-9]+\"$/", $val)) return " Invalid: must be of the form F'I\", where F is feet and I is inches";
    return false;
  }

  function validPositiveInt($val) {
    if (strlen($val) < 1) return " Invalid: cannot be blank";
    if (!preg_match("/^[0-9]+$/", $val)) return " Invalid: must be a positive integer";
    return false;
  }

  function validPictureFile($file_array, $can_be_blank = false) {
    $valid_extensions = array("png", "jpg", "gif", "jpeg");
    if ($can_be_blank && (!is_array($file_array) || strlen($file_array[name]) < 1)) { return false; }
    return validUploadedFile($file_array, $valid_extensions);
  }

  function validUploadedFile($file_array, $ext_possibilities = array("txt", "jpg", "gif", "pdf", "jpeg", "ppt", "doc", "tar.gz", "tgz", "tar.bz2", "bz2")) {
    if (!is_array($file_array) || strlen($file_array[name]) < 1) { return false; } // allow empty files
    preg_match("/\.(.+)$/", $file_array[name], $matches);
    $ext = $matches[1];
    $found = 0;
    foreach($ext_possibilities as $e) {
      $e = preg_replace("/\./", "\\.", $e);
      if (preg_match("/^$e$/", $ext)) {
        $found = 1;
        break;
      }
    }
    if (!$found) {
      return " Invalid: unsupported extension";
    }
    return false;
  }


  function validEmail($e) {
    if (!preg_match("/.+@.+\..+/", $e)) {
      return " Invalid: must be of the format x@x.x";
    }
    return false;
  }

  function validCity($c) {
    if (trim($c) == "") {
      return "Invalid city: city was blank";
    }
    return false;
  }

  function validZip($z) {
    if (   !preg_match("/^[0-9]{5}$/", $z)
        && !preg_match("/^[0-9]{5}-[0-9]{4}/", $z)) {
      return "Invalid Zip: must be of the format 99999 or 99999-9999";
    }
    return false;
  }

  function validFax($f) {
    return false;
  }

  function validUsername($username, $id) {
    if (strlen($username) < 3) {
      return "Invalid Username: username must be at least 3 characters long";
    }
    if (preg_match("/[^0-9a-zA-Z_\-]/", $username)) {
      return "Invalid Username: username can only contain letters, numbers, dashes (-), and/or underscores (_)";
    }
/*    if (User::idExists($id)) {
      $u = new User($id);
      if ($username == $u->getUsername()) {
        return false; // username unchanged
      }
    }
    if (User::usernameExists($username)) {
      return "Invalid Username: username already exists";
    } */
    return false;
  }

  function validPassword($p) {
    if (strlen($p) < 8) {
      return "Invalid Password: password must be at least 8 characters long";
    }
    if (preg_match("/['\" ]/", $p)) {
      return "Invalid Password: password cannot contain quotes or spaces";
    }
    return false;
  }

/*  function validAuthLevel($a) {
    if ($a != "ADMIN" && $a != "SITE" && $a != "ADVISORY" && $a != "PUBLIC" && $a != "ALUMNI") {
      return "Invalid Authentication Level: internal error";
    }
    return false;
  } */

  function validFirstname($n) {
    if (preg_match("/[^a-zA-Z -]/", $n)) {
      return "Invalid First Name: can only contain letters, spaces, or hyphens";
    }
    return false;
  }

  function validLastname($n) {
    if (preg_match("/[^a-zA-Z -]/", $n)) {
      return "Invalid Last Name: can only contain letters, spaces, or hyphens";
    }
    return false;
  }

  function validInt($i) {
    if (!preg_match("/^[0-9]+$/", $i)) {
      return " Invalid: Must Be An Integer";
    }
    return false;
  }

  function validIntCommasOptional($i) {
    if (!preg_match("/^[0-9,]+$/", $i)) {
      return " Invalid: Must Be An Integer";
    }
    return false;
  }

  function validFloat($f) {
    if (trim($f) == "") {
      return " Invalid: You Must Enter a Number";
    }
    if (!preg_match("/^[0-9]*\.?[0-9]*$/", $f)) {
      return " Invalid: Must Be an Integer or Decimal Number";
    }
    return false;
  }

  function validLengthText($s, $maxsize, $blank=false) {
    if (strlen(trim($s)) > $maxsize)
      return " Invalid: must be less than $maxsize characters";
    if (strlen(trim($s)) < 1) {
      if (!$blank) {
        return " Invalid: cannot be blank";
      }
    }
    return false;
  }

  function validShortText($s, $blank=false) {
    if (strlen(trim($s)) > 256)
      return " Invalid: must be less than 256 characters";
    if (strlen(trim($s)) < 1) {
      if (!$blank) {
        return " Invalid: cannot be blank";
      }
    }
    return false;
  }

  function validLongText($s, $can_be_blank = false) {
    if (strlen($s) > 65535)
      return " Invalid: must be less than 65,535 characters";
    if (!$can_be_blank && strlen($s) < 1)
      return " Invalid: cannot be blank";
    return false;
  }

  function notEmpty($val) {
    if (!isset($val) || preg_match("/^\s*$/", $val))
      return "Text is empty";
    else return false;
  }

  function validWebsite($w) {
    return Check::validShortText($w);
  }

  function validAddress($a) {
    return Check::validLongText($a);
  }

  function validPhone($p) {
    // FOREIGN PHONE NUMBERS?? EXTENSIONS??
    if (strlen($p) < 10) {
      return " Invalid: must provide at least 10 digits";
    }
    $p = preg_replace("/[\t \n]/", "", $p);
    if (preg_match("/[Ee]xt/", $p)) {
      if (preg_match("/[^0-9EeXxTt.\-\(\) ]/", $p)) {
        return "Invalid: must be of the form (111)222-3333 ext. 4567\n";
      }
    } else {
      if (!preg_match("/\(?[0-9]{3}\)?-?[0-9]{3}-?[0-9]{4}/", $p)) {
        return " Invalid: must be of the form (111)222-3333";
      }
    }
    return false;
  }


  function validDateMonthYear($month, $year) {
    if (Check::notInt($month) || Check::notInt($year)) {
      return " Invalid: Internal Error";
    }
    if ($month < 1 || $month > 12) {
      return " Invalid: Internal Error";
    }
    $cur_year = date("Y");
    if ($year > $cur_year) {
      return " Invalid: Internal Error";
    }
  }

  function validId($id, $objname_for_idexists, $extra_args = array()) {
    $o = new $objname_for_idexists();
    if (count($extra_args) == 0 && $o->idExists($id)) {
      return false;
    } elseif (count($extra_args) == 1 && $o->idExists($id, $extra_args[0])) {
      return false;
    } elseif (count($extra_args) == 2 && $o->idExists($id, $extra_args[0], $extra_args[1])) {
      return false;
    } elseif (count($extra_args) == 3 && $o->idExists($id, $extra_args[0], $extra_args[1], $extra_args[2])) {
      return false;
    } else {
      return " Invalid: internal error";
    }
  }

  function validIdZero($id, $objname_for_idexists, $extra_args = array()) {
    $o = new $objname_for_idexists();
    if (count($extra_args) == 0 && ($id == 0 || $o->idExists($id, $extra_args[0]))) {
      return false;
    } elseif (count($extra_args) == 1 && ($id == 0 || $o->idExists($id, $extra_args[0], $extra_args[1]))) {
      return false;
    } elseif (count($extra_args) == 2 && ($id == 0 || $o->idExists($id, $extra_args[0], $extra_args[1], $extra_args[2]))) {
      return false;
    } else {
      return " Invalid: internal error";
    }
  }

  function validRadio($v, $choices_func, $choices_func_args = array()) {
    $ch = new Choices();
    $a = $choices_func_args;
    if (!is_array($a)) {
      $choices = $ch->$choices_func();
    } else {
      switch(count($a)) {
        case 0: $choices = $ch->$choices_func(); break;
        case 1: $choices = $ch->$choices_func($a[0]); break;
        case 2: $choices = $ch->$choices_func($a[0], $a[1]); break;
        case 3: $choices = $ch->$choices_func($a[0], $a[1], $a[2]); break;
      }
    }
    foreach ($choices as $c) {
      if ($v == $c[value]) {
        $flag = true;
      }
    }
    if ($flag != true) {
      return " Invalid: you must make a selection";
    }
    return false;
  }

  function validSelect($v, $choices_func, $choices_func_args = array()) {
    $ch = new Choices();
    $a = $choices_func_args;
    if (!is_array($a)) {
      $choices = $ch->$choices_func();
    } else {
      switch(count($a)) {
        case 0: $choices = $ch->$choices_func(); break;
        case 1: $choices = $ch->$choices_func($a[0]); break;
        case 2: $choices = $ch->$choices_func($a[0], $a[1]); break;
        case 3: $choices = $ch->$choices_func($a[0], $a[1], $a[2]); break;
        case 4: $choices = $ch->$choices_func($a[0], $a[1], $a[2], $a[3]); break;
        case 5: $choices = $ch->$choices_func($a[0], $a[1], $a[2], $a[3], $a[4]); break;
        case 6: $choices = $ch->$choices_func($a[0], $a[1], $a[2], $a[3], $a[4], $a[5]); break;
      }
    }
    foreach ($choices as $c) {
      if ($v == $c[value]) {
        $flag = true;
      }
    }

    if ($flag != true) {
      return " Invalid: internal error";
    }
    return false;
  }

  function formatDate($date, $type=false, $format=false) {
    if ($type == 1) { 
      // MSSQL date format MON DD YYYY HH:MMAM
                  //  Month      Day      Year    Time           AM/PM
      preg_match("/([A-Za-z]+) +([0-9]+) +([0-9]+) +([0-9]+:[0-9]+)(AM|PM)/", $date, $matches);
      $month = trim($matches[1]);
      switch($month) {
        case "Jan": $monthnum = 1; break;
        case "Feb": $monthnum = 2; break;
        case "Mar": $monthnum = 3; break;
        case "Apr": $monthnum = 4; break;
        case "May": $monthnum = 5; break;
        case "Jun": $monthnum = 6; break;
        case "Jul": $monthnum = 7; break;
        case "Aug": $monthnum = 8; break;
        case "Sep": $monthnum = 9; break;
        case "Oct": $monthnum = 10; break;
        case "Nov": $monthnum = 11; break;
        case "Dec": $monthnum = 12; break;
      }
      $day = trim($matches[2]);
      $year = trim($matches[3]);
      $time = trim($matches[4]);
      $ampm = trim($matches[5]);

      switch($format) {
        case 1: return $monthnum . "/" . $day; break; // MM/DD
        case 2: return $time . $ampm; break; // HH:MMAM
        case 3: return "$monthnum/$day/" . substr($year, 2); break; // MM/DD/YYYY
        case 4: return array($monthnum, $day, $year); break;
      }
    } elseif ($type == 2) {
      // MySQL date format YYYY-MM-DD HH:MM:SS
      preg_match("/([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/", $date, $matches);
      $date = $matches[0];
      $year = $matches[1];
      $month = preg_replace("/^0/", "", $matches[2]);
      $day = preg_replace("/^0/", "", $matches[3]);
      $hour = $matches[4];
      $minute = $matches[5];
      $second = $matches[6];
      if ($hour < 12) $ampm = "AM";
      else            $ampm = "PM";
      switch($format) {
        case 1: return $month . "/" . $day; break; // MM/DD
        case 2: return "$hour:$minute $ampm"; break; // HH:MMAM
        case 3: return "$month/$day"; break;
        case 4: return array($month, $day, $year); break;
      }
    } elseif ($type == "epoch") { // epoch time (i.e. num seconds since Jan 1, 1970
      switch($format) {
        // Return MySQL DATETIME Format
        case "mysql_datetime": return date("Y-m-d H:i:s", $date);
          break;
        default: return false;
      }
    } else {
      $parts = split("-", $date);
      $year = $parts[0];
      $month = $parts[1];
      $day = $parts[2];
      switch ($month) {
        case  1: $pmonth = "January"; break;
        case  2: $pmonth = "February"; break;
        case  3: $pmonth = "March"; break;
        case  4: $pmonth = "April"; break;
        case  5: $pmonth = "May"; break;
        case  6: $pmonth = "June"; break;
        case  7: $pmonth = "July"; break;
        case  8: $pmonth = "August"; break;
        case  9: $pmonth = "September"; break;
        case 10: $pmonth = "October"; break;
        case 11: $pmonth = "November"; break;
        case 12: $pmonth = "December"; break;
      }
      return "$pmonth $year";
    }

  }
}
