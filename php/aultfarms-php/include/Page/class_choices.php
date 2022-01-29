<?
include_once(realpath(dirname(__FILE__) . "/class_path.php"));
$path = new Path();
include_once($path->getFilePath("class_check"));

/************************************************************************************
 *                                                                                  *
 * Class Choices holds all "get*Choices" functions for selects, checkboxes, and the *
 * like.  All choices arrays will be returns with "text" and "value" keys for       *
 * each choice.                                                                     *
 *                                                                                  *
 ************************************************************************************/

class Choices {

// NOTE: I SHOULD CACHE THE VALUES FROM TRELLO AND CHECK FOR INCREMENTAL UPDATES
// BY DATE/TIME, IF POSSIBLE?
  function getDrivers() {
    return array(array("value" => "1", "text" => "Driver 1 - hardcoded"),
                 array("value" => "2", "text" => "Driver 2 - hardcoded"));
  }

  function getFeedDestinations() {
    return array(array("value" => "1", "text" => "Destination 1 - hardcoded"),
                 array("value" => "2", "text" => "Destination 2 - hardcoded"));
  }

  function getAvailableLoadNumbers() {
    return array(array("value" => "1", "text" => "Load Numbers 1 - hardcoded"),
                 array("value" => "2", "text" => "Load Numbers 2 - hardcoded"));
  }

/*  function getSemesterChoices($siteid) {
    if (Check::notInt($siteid)) {
      return array();
    }
    $s = new Site($siteid);
    $semesters = $s->findActiveSemesters();
    $res = array(array("value" => 0, "text" => "&lt;None&gt;"));
    while($x = $semesters->getOne()) {
      array_push($res, array("value" => $x->getSemesterid(), "text" => $x->getName()));
    }
    return $res;
  } */

/*  function getTimePeriodChoices() {
    return array(array("value" => "SEMESTER", "text" => "Semester"),
                 array("value" => "QUARTER", "text" => "Quarter"),
                 array("value" => "TERM", "text" => "Term"));
  } */

/*  function getWeekChoices($curweek, $chosenweek) {
    // return minimum 30 weeks
    // if chosenweek is before or equal to curweek, show up to chosenweek, then 30 from curweek
    // if chosenweek is after curweek but before 30 weeks from curweek, show 30 weeks from curweek
    // if chosenweek is after curweek AND after 30 weeks from curweek, show up to chosenweek
    // always BOLD the curweek in the choices
    if ($chosenweek <= $curweek) { 
      $startweek = $chosenweek; 
      $numweeks = ($curweek-$chosenweek)/(7*24*3600) + 30; }
    else {
      $startweek = $curweek;
      if ($chosenweek < ($curweek + (30*7*24*3600))) { 
        $numweeks = 30; 
      }
      else { 
        $numweeks = ($chosenweek-$curweek)/(7*24*3600) + 1; 
      }
    }
    $ret = array();
    for ($i=0; $i<$numweeks; $i++) {
      $st = $startweek + (7*24*3600*$i);
      $et = $st + (6*24*3600);
      $start = date("D, M j, Y", $st);
      $end = date("D, M j, Y", $et);
      if ($st == $curweek) {
        array_push($ret, array("value" => $st, "text" => "** $start - $end **"));
      } 
      else {
        array_push($ret, array("value" => $st, "text" => "$start - $end"));
      }
    }
    return $ret;
  }

  function getActiveChoices($num_elements = false) {
    $val = array(array("value" => "ACTIVE", "text" => "Active")
                ,array("value" => "INACTIVE", "text" => "Inactive"));
    if ($num_elements) return count($val);
    return $val;
  }

  // set the "default_choice" variable to be the array entry you want for the
  // case where you don't need to allow the user to select any date
  function getDateMonthYearChoices($type, $start_year = 2000, $default_choice = false) {
    $ret = array();
    if (is_array($default_choice)) array_push($ret, $default_choice);
    if ($type == "month") {
      array_push($ret, array(  "text" => "January", "value" => 1));
      array_push($ret, array( "text" => "February", "value" => 2));
      array_push($ret, array(    "text" => "March", "value" => 3));
      array_push($ret, array(    "text" => "April", "value" => 4));
      array_push($ret, array(      "text" => "May", "value" => 5));
      array_push($ret, array(     "text" => "June", "value" => 6));
      array_push($ret, array(     "text" => "July", "value" => 7));
      array_push($ret, array(   "text" => "August", "value" => 8));
      array_push($ret, array("text" => "September", "value" => 9));
      array_push($ret, array(  "text" => "October", "value" => 10));
      array_push($ret, array( "text" => "November", "value" => 11));
      array_push($ret, array( "text" => "December", "value" => 12));
    } elseif ($type == "year") {
      $cur_year = date("Y");
      for($i=$start_year; $i<=$cur_year; $i++) {
        array_push($ret, array("text" => $i, "value" => $i));
      }
    }
    return $ret;
  }
*/

// this one is tricky, so I'll label the args.  Look at site/advisor_team_relation.php for
// an example of how it is used.
//    arg 1: name of object used for finding (possibly) other type of objects
//    arg 2: optional id number to be passed to constructor of the object for arg 1
//    arg 3: name of find function defined for the object from arg 1 (i.e. Site->findActiveFaculty)
//    arg 4: any optional args to the find function (i.e. for findActiveFacultyBySiteid($siteid),
//           then this argument would be array(15), if 15 were the siteid you're searching by)
//    arg 5: keys and functions for creating the returned array.  If you want an array back
//           with "value" and "name" keys that are populated from the "found" objects by
//           the "getFacultyid()" and "getName()" functions, then this argument should be:
//           array("value" => "getFacultyid",
//                  "name" => "getName")
//    arg 6: (optional) The element of the returned "choices" array that should be used as 
//           value 0, meaning the first, default choice.  The array should be formatted exactly
//           as you want its entry in the returned array, as it will simply be pushed onto the front
//           of the returned array
  function getIdChoices($obj_name, $obj_id, $find_func, $find_args, $return_keys, $default_choice=false) {
    $o = new $obj_name($obj_id);
    if (!is_array($find_args)) {
      $x = $o->$find_func();
    } else {
      switch(count($find_args)) {
        case 0: $x = $o->$find_func(); break;
        case 1: $x = $o->$find_func($find_args[0]); break;
        case 2: $x = $o->$find_func($find_args[0], $find_args[1]); break;
        case 3: $x = $o->$find_func($find_args[0], $find_args[1], $find_args[2]); break;
      }
    }
    $ret = array();
    if (is_array($default_choice)) {
      array_push($ret, $default_choice);
    }
    while ($fac = $x->getOne()) {
      foreach($return_keys as $key => $val) {
        $a[$key] = $fac->$val();
      }
      array_push($ret, $a);
    }
    return $ret;
  }
}
?>
