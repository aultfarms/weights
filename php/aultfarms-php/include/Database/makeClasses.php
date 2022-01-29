<?
////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Purpose: run this file to parse the .sql file that
//   creates the database in order to create all the 
//   necesary entity and query classes.  NOTE: does not
//   update class_path to reflect all the new classes,
//   and does not create the necessary include statements, either.
//
// example table format:
// CREATE TABLE tablename
// (
//   id INT, # NOTE: primary key must be first
//   col1 TEXT,
// );
//
// NOTES: 
// To set a variable in the "queryInsert" function to something other than
//   the value of that variable, simply put the variable name in the "insert_function_special_vars"
//   array as the key to the value you would like it to have.
// Same for queryUpdate function, just use the update_function_special_vars key.
// The "unique_entry_values" are used for the noDuplicates function to make
//   sure that we are not trying to insert a duplicate object.
// The "duplicate_reset_values" are reset from the database if it appears we have a duplicate.
//   Make sure the format of the values in this array are the actual parts of the function
//   names that go after "set" or "get".  For instance, to use the "active" variable, the
//   array value should be "Active" because it will be used to create the function names 
//   "getActive and "setActive".
// The "date_month_year_vars" key is an array that lists the variable names that are "date_month_year"
//   types in the ../Misc/write_edit.php file.  These variables will have their set/get functions
//   modified to take an optional extra argument specifying either "month" or "year"
////////////////////////////////////////////////////////////////////////////////////////////////////////////
include_once(realpath(dirname(__FILE__) . "/../../Page/class_path.php"));
$path = new Path();

$input_filename = "estadium.sql";
$path_entity_prefix = "../include/Database/Entity/"; 
$path_query_prefix = "../include/Database/Query/";
$class_path_location = "/../../Page/class_path.php";
$classes = array(
                 //"Video" => array("entity_filename" => "video")
                );


ob_start();
readfile($input_filename);
$commands = split(";", ob_get_contents());
ob_end_clean();

$start_user_comment = "  /////////////////////////////////////////////////////////\n" .
                      "  // END OF AUTO-GENERATED FILE\n" .
                      "  // PUT NEW FUNCTIONS BELOW.\n" .
                      "  // DO NOT DELETE THIS COMMENT.\n" .
                      "  /////////////////////////////////////////////////////////\n";

$end_user_comment = "  /////////////////////////////////////////////////////////\n" .
                    "  // END OF FILE.  THIS MUST BE LAST IN THE FILE\n" .
                    "  // DO NOT DELETE THIS COMMENT\n" .
                    "  /////////////////////////////////////////////////////////\n";

$start_user_include = "// Put any new include files below this line. DO NOT DELETE THIS LINE!\n";
$end_user_include = "// Put any new include files above this line.  DO NOT DELETE THIS LINE!\n";

foreach ($commands as $command) {
  if (!preg_match("/CREATE TABLE/", $command)) {
    continue; // not a CREATE TABLE statement, so ignore it
  }
  $flag = false;
  // this is a CREATE TABLE statement
  // format: CREATE TABLE <tablename> (
  preg_match("/CREATE TABLE(.+)\n\(/", $command, &$matches);

  // table name is in $matches[1]
  $tablename = trim($matches[1]);
  $rest = trim(preg_replace("/CREATE TABLE.*\n/", "", $command));
  if (!array_key_exists($tablename, $classes)) {
    echo "$tablename doesn't need an object\n";
    continue;
  }
  
  // Find array of column names
  $cols = split("\n", trim(preg_replace("/[()]/", "", $rest)));
  $attributes = array();
  foreach($cols as $col) {
    $temp = trim($col);
    $temp2 = split(" ", $temp);
    if (!$flag) { $primary_key = $temp2[0]; $flag = true; } // primary key must be first!
    array_push($attributes, $temp2[0]);
  }

  // Setup the configuration parameters that can be setup automatically, unless 
  // someone specified them already.  This makes the list of specs for most tables
  // MUCH shorter.

  if (array_key_exists("primary_key", $classes[$tablename])) {
    $primary_key = $classes[$tablename][primary_key];
  }

  if (!array_key_exists("unique_entry_values", $classes[$tablename])) {
    $uniques = array();
    foreach($attributes as $a) {
      if ($a != "active" && $a != "creation_date" && $a != "last_modified" && $a != $primary_key) {
        array_push($uniques, $a);
      }
    }
    $classes[$tablename][unique_entry_values] = $uniques;
  }

  // setup filenames and object names based on entity_filename
  if (!array_key_exists("entity", $classes[$tablename])) {
    $classes[$tablename][entity] = removeUnderscores($classes[$tablename][entity_filename]);
  }
  if (!array_key_exists("query", $classes[$tablename])) {
    $classes[$tablename][query] = removeUnderscores($classes[$tablename][entity_filename]) . "_Query";
  }
  if (!array_key_exists("query_filename", $classes[$tablename])) {
    $classes[$tablename][query_filename] = $classes[$tablename][entity_filename] . "_query";
  }
  if (!array_key_exists("duplicate_reset_values", $classes[$tablename])) {
    $classes[$tablename][duplicate_reset_values] = array("Active", "CreationDate");
  }
  if (!array_key_exists("insert_function_special_vars", $classes[$tablename])) {
    $classes[$tablename][insert_function_special_vars] = array("active" => "'ACTIVE'", "creation_date" => "now()", "last_modified" => "now()");
  }
  if (!array_key_exists("update_function_special_vars", $classes[$tablename])) {
    $classes[$tablename][update_function_special_vars] = array("last_modified" => "now()");
  }
  if (!array_key_exists("date_month_year_vars", $classes[$tablename])) {
    $classes[$tablename][date_month_year_vars] = array();
  }
  if (!array_key_exists("checkbox_array_vars", $classes[$tablename])) {
    $classes[$tablename][checkbox_array_vars] = array();
  }

  $etemp = strtolower($classes[$tablename][entity]);
  $qtemp = strtolower($classes[$tablename][query]);
  $entity_file_name = $path->getFileRoot() . "$path_entity_prefix" . "class_" . $classes[$tablename][entity_filename] . ".php";
  $query_file_name  = $path->getFileRoot() . "$path_query_prefix"  . "class_" . $classes[$tablename][query_filename]  . ".php";
  $entity_name = $classes[$tablename][entity];
  $query_name = $classes[$tablename][query];
  $primary_key_getfunc = "get" . removeUnderscores($primary_key);
  $primary_key_setfunc = "set" . removeUnderscores($primary_key);
  $primary_key_funcname = removeUnderscores($primary_key);

  echo "==========================================================================\n";
  echo "CREATING CLASSES FOR TABLE: $tablename\n";
  echo "Opening $entity_file_name\n and $query_file_name\n";

  // write entity file
    if (file_exists($entity_file_name)) {
      echo "Entity file exists.  Copy process initiated, old file moved to .old\n";
      $efile = file_get_contents($entity_file_name);
      $user_start =              strpos($efile, $start_user_comment) + strlen($start_user_comment);
      $user_end =                strpos($efile, $end_user_comment) - 1;
      $include_start =           strpos($efile, $start_user_include) + strlen($start_user_include);
      $include_end =             strpos($efile, $end_user_include);
      $previous_user_entity =    substr($efile, $user_start, $user_end - $user_start);
      $previous_include_entity = substr($efile, $include_start, $include_end - $include_start);
      unset($efile);
      system("mv $entity_file_name $entity_file_name.old");
    }
    if (file_exists($query_file_name)) {
      echo "Query file exists.  Copy process initiated, old file moved to .old\n";
      $qfile = file_get_contents($query_file_name);
      $user_start =             strpos($qfile, $start_user_comment) + strlen($start_user_comment);
      $user_end =               strpos($qfile, $end_user_comment) - 1;
      $include_start =          strpos($qfile, $start_user_include) + strlen($start_user_include);
      $include_end =            strpos($qfile, $end_user_include);
      $previous_user_query =    substr($qfile, $user_start, $user_end - $user_start);
      $previous_include_query = substr($qfile, $include_start, $include_end - $include_start);
      unset($qfile);
      system("mv $query_file_name $query_file_name.old");
    }
    echo "Here are the lines to paste into class_path if they don't already exist:\n";
    echo "---------------------------------------------------------------------------\n";
    $efname = $classes[$tablename][entity_filename];
    $qfname = $classes[$tablename][query_filename];
    echo "\"class_$efname\" => \"$path_entity_prefix"."class_$efname.php\",\n";
    echo "\"class_$qfname\" => \"$path_query_prefix" ."class_$qfname.php\",\n";
    echo "---------------------------------------------------------------------------\n";
    $efile = fopen($entity_file_name, 'w');
    $qfile = fopen($query_file_name, 'w');
    // make entity file
    fwrite($efile, 
"<"."?"."\n/////////////////////////////////////////////////////////////
//File auto-created by Database/Creation/makeClasses script
/////////////////////////////////////////////////////////////
include_once(realpath(dirname(__FILE__) . \"$class_path_location\"));
\$path = new Path();
include_once(\$path->getFilePath(\"class_check\"));
include_once(\$path->getFilePath(\"class_".$classes[$tablename][query_filename]."\"));
$start_user_include");
  if (strlen($previous_include_entity) > 0) {
    fwrite($efile, "$previous_include_entity");
  } else {
    fwrite($efile, "\n\n\n");
  }
  fwrite($efile, "$end_user_include

class $entity_name
{
  var \$db;
  var \$varnames;
  ");
      foreach($attributes as $attrib) {
        fwrite($efile, "var \$$attrib;\n  ");
      }
      fwrite($efile, "
  function $entity_name (\$id = false)
  {
    \$this->varnames = array(\n");
      $count = 0;
      foreach($attributes as $attrib) {
        $count++;
        fwrite($efile, "                            \"$attrib\"");
        if ($count != count($attributes)) {
          fwrite($efile, ",\n");
        }
      }
      fwrite($efile,");
    \$this->db = new $query_name();
    if (\$id != false) {
      \$id = addslashes(\$id);
      \$this->db->queryAll$entity_name"."Info(\$id);
      \$id = stripslashes(\$id);
      \$this->db->get();
      foreach(\$this->varnames as \$varname) {
        \$this->\$varname = \$this->db->\$varname;
      }
    }
  } // end constructor

  function cleanup()
  {
    foreach(\$this->varnames as \$varname) unset(\$this->\$varname);
  }
  
  function addslashes() {
    foreach(\$this->varnames as \$varname) {
      \$this->\$varname = addslashes(\$this->\$varname);
    }
  }
  
  function stripslashes() {
    foreach(\$this->varnames as \$varname) {
      \$this->\$varname = stripslashes(\$this->\$varname);
    }
  }\n\n");
    // now make all get/set functions
    foreach($attributes as $attrib) {
      $words = split("_", $attrib);
      for($i=0;$i<count($words);$i++) {
        $words[$i][0] = strtoupper($words[$i][0]);
      }
      $get_func_name = "get" . join("", $words);
      $set_func_name = "set" . join("", $words);

      if (   array_key_exists("date_month_year_vars", $classes[$tablename])
          && in_array($attrib, $classes[$tablename][date_month_year_vars])) {
        fwrite($efile, "  
  function $get_func_name(\$part = false) { 
    if (\$part == \"month\") {
      return substr(\$this->$attrib, 5, 2);
    }
    elseif (\$part == \"year\") {
      return substr(\$this->$attrib, 0, 4);
    }
    else {
      return \$this->$attrib; 
    }
  }

  function $set_func_name(\$attribute, \$part = false) { 
    if (\$this->$get_func_name() == \"\") {
      \$this->$attrib = \"0000-00-00\";
    }
    if (\$part == \"month\") {
      \$month = \$attribute;
      \$year = substr(\$this->$attrib, 0, 4);
      if (\$month < 10) {
        \$this->$attrib = \"\$year-0\$month-01\";
      }
      else {
        \$this->$attrib = \"\$year-\$month-01\";
      }
    }
    elseif (\$part == \"year\") {
      \$month = substr(\$this->$attrib, 5, 2);
      \$year = \$attribute;
      \$this->delivered_date = \"\$year-\$month-01\";
    }
    else { 
      \$this->$attrib = \$attribute;
    }
  }\n\n");
      }
      elseif (   array_key_exists("checkbox_array_vars", $classes[$tablename])
              && in_array($attrib, $classes[$tablename][checkbox_array_vars])) {
        fwrite($efile, "  function $get_func_name"."Str() { return \$this->$attrib; }\n");
        fwrite($efile, "  function $get_func_name"."Array() { return Check::dbstr2Array(\$this->$attrib); }\n");
        fwrite($efile, "  function $set_func_name"."Array(\$attribute) { \$this->$attrib = Check::array2Dbstr(\$attribute); }\n");
      }
      else {
        fwrite($efile, "  function $get_func_name() { return \$this->$attrib; }\n");
        fwrite($efile, "  function $set_func_name(\$attribute) { \$this->$attrib = \$attribute; }\n\n");
      }
    }
    fwrite($efile, "\n");
    // now do save method
    fwrite($efile, "
  function save(\$ignore_noduplicates = false) {
    if (!\$ignore_noduplicates) {
      if (!\$this->idValid()) {
        \$this->noDuplicates();
      }
    }
    if (\$this->idValid()) {
      \$this->addslashes();
      \$this->db->queryUpdate$entity_name(");
    $flag = false;
    foreach($attributes as $attrib) {
      $words = split("_", $attrib);
      for($i=0;$i<count($words);$i++) {
        $words[$i][0] = strtoupper($words[$i][0]);
      }
      if (in_array($attrib, $classes[$tablename][checkbox_array_vars])) {
        $get_func_name = "get" . join("", $words) . "Str";
      } else {
        $get_func_name = "get" . join("", $words);
      }
      if ($flag) fwrite($efile, ",\$this->$get_func_name()");
      else { fwrite($efile, "\$this->$get_func_name()"); $flag = true; }
    }
    fwrite($efile, ");
      \$this->stripslashes();
    }
    else {
      \$this->addslashes();
      \$this->db->queryInsert$entity_name(");
    $flag = false;
    foreach($attributes as $attrib) {
      if ($attrib != $primary_key) {
        $words = split("_", $attrib);
        for($i=0;$i<count($words);$i++) {
          $words[$i][0] = strtoupper($words[$i][0]);
        }
        if (in_array($attrib, $classes[$tablename][checkbox_array_vars])) {
          $get_func_name = "get" . join("", $words) . "Str";
        } else {
          $get_func_name = "get" . join("", $words);
        }
        if ($flag) fwrite($efile, ",\$this->$get_func_name()");
        else { fwrite($efile, "\$this->$get_func_name()"); $flag = true; }
      }
    }
    fwrite($efile, ");
      \$this->stripslashes();
      \$this->db->queryMax$primary_key_funcname();
      \$this->db->get();
      \$this->$primary_key_setfunc(\$this->db->$primary_key);
    }
    \$this->$entity_name(\$this->$primary_key_getfunc());
  }

  function noDuplicates() {
    \$this->addslashes();
    \$this->db->query$primary_key_funcname"."ByMajorInfo(");
  $flag = false;
  foreach($classes[$tablename][unique_entry_values] as $val) {
    $words = split("_", $val);
    for($i=0;$i<count($words);$i++) {
      $words[$i][0] = strtoupper($words[$i][0]);
    }
    if (in_array($val, $classes[$tablename][checkbox_array_vars])) {
      $get_func_name = "get" . join("", $words) . "Str";
    } else {
      $get_func_name = "get" . join("", $words);
    }
    if ($flag) fwrite($efile, ",\$this->$get_func_name()");
    else { $flag = true; fwrite($efile, "\$this->$get_func_name()"); }
  }
  fwrite($efile, ");
    \$this->stripslashes();
    \$this->db->get();
    if (Check::isInt(\$this->db->$primary_key)) {
      \$this->$primary_key_setfunc(\$this->db->$primary_key);
      \$x = new $entity_name(\$this->$primary_key_getfunc());");
  foreach ($classes[$tablename][duplicate_reset_values] as $var) {
    fwrite($efile, "
      \$this->set$var(\$x->get$var());");
  }
  fwrite($efile, "
    }
  }

  function idValid() {
    if (Check::notInt(\$this->$primary_key_getfunc())) {
      return false;
    }
    return true;
  }

  // STATIC METHODS
  function idExists(\$id) {
    if (Check::notInt(\$id)) return false;
    \$db = new $query_name();
    \$id = addslashes(\$id);
    \$db->query$primary_key_funcname"."By$primary_key_funcname(\$id);
    \$id = stripslashes(\$id);
    \$db->get();
    if (\$id == \$db->$primary_key) return true;
    return false;
  }

  // FIND FUNCTIONS
  function findActive$entity_name"."s() {
    \$t = array();
    \$this->addslashes();
    \$this->db->queryActive$primary_key_funcname"."s();
    \$this->stripslashes();
    while(\$this->db->get()) {
      \$u = new $entity_name(\$this->db->$primary_key);
      array_push(\$t, \$u);
    }
    return \$t;
  }

$start_user_comment");
  if (strlen($previous_user_entity) > 0) {
    fwrite($efile, "$previous_user_entity");
  } else {
    fwrite($efile, "\n\n\n");
  }
  fwrite($efile, "\n$end_user_comment

}
");
  fclose($efile);
  echo "Closed Entity file successfully.\n";
  // done with entity file
  // now query file
  fwrite($qfile,
"<"."?"."\n/////////////////////////////////////////////////////////////
//File auto-created by Database/Creation/makeClasses script
/////////////////////////////////////////////////////////////
include_once(realpath(dirname(__FILE__) . \"$class_path_location\"));
\$path = new Path();
include_once(\$path->getFilePath(\"class_check\"));
include_once(\$path->getFilePath(\"class_query\"));
$start_user_include");
  if (strlen($previous_include_query) > 0) {
    fwrite($qfile, "$previous_include_query");
  } else {
    fwrite($qfile, "\n\n\n");
  }
  fwrite($qfile, "$end_user_include

class $query_name extends Query
{
  function $query_name() { \$this->Query(); }

  function queryAll"."$entity_name"."Info(\$id)
  {
    \$this->execute(\"SELECT * 
                      FROM $tablename
                     WHERE ".$attributes[0]."='\$id'\");
  }

  function queryUpdate$entity_name(");
    $flag = false;
    foreach($attributes as $attrib) {
      if ($flag) fwrite($qfile, ",\$$attrib");
      else { fwrite($qfile, "\$$attrib"); $flag = true; }
    }
    fwrite($qfile, ") {
    \$this->execute(\"UPDATE $tablename
                         SET ");
    $flag = false;
    foreach($attributes as $attrib) {
      if (array_key_exists($attrib, $classes[$tablename][update_function_special_vars])) {
        if ($flag) fwrite($qfile, ",\n                             $attrib=".$classes[$tablename][update_function_special_vars][$attrib]);
        else { fwrite($qfile, "$attrib=".$classes[$tablename][update_function_special_vars][$attrib]); $flag = true; }
      }
      else {
        if ($flag) fwrite($qfile, ",\n                             $attrib='\$$attrib'");
        else { fwrite($qfile, "$attrib='\$$attrib'"); $flag = true; }
      }
    }
    fwrite($qfile, "
                       WHERE $primary_key='\$$primary_key'\");
  }
  
  function queryInsert$entity_name(");
    $flag = false;
    foreach($attributes as $attrib) {
      if ($attrib != $primary_key) {
        if ($flag) fwrite($qfile, ",\$$attrib");
        else { fwrite($qfile, "\$$attrib"); $flag = true; }
      }
    }
    fwrite($qfile, ") {
    \$this->execute(\"INSERT INTO $tablename
                                ( 
                                  ");
    $flag = false;
    foreach($attributes as $attrib) {
      if ($attrib != $primary_key) {
        if ($flag) fwrite($qfile, ",\n                                  $attrib");
        else { fwrite($qfile, "$attrib"); $flag = true; }
      }
    }
    fwrite($qfile, ")
                           VALUES (");
    $flag = false;
    foreach($attributes as $attrib) {
      if ($attrib != $primary_key) {
        if (array_key_exists($attrib, $classes[$tablename][insert_function_special_vars])) {
                 
          if ($flag) fwrite($qfile, ",\n                                  ".$classes[$tablename][insert_function_special_vars][$attrib]);
          else { fwrite($qfile, $classes[$tablename][insert_function_special_vars][$attrib]); $flag = true; }
        }
        else {
          if ($flag) fwrite($qfile, ",\n                                  '\$$attrib'");
          else { fwrite($qfile, "'\$$attrib'"); $flag = true; }
        }
      }
    }
    fwrite($qfile, ")\");
  }

  function queryMax$primary_key_funcname() {
    \$this->execute(\"SELECT MAX($primary_key) as $primary_key
                        FROM $tablename\");
  }

  function query$primary_key_funcname"."By$primary_key_funcname"."(\$id) {
    \$this->execute(\"SELECT $primary_key
                        FROM $tablename
                       WHERE $primary_key='\$id'\");
  }

  function query$primary_key_funcname"."ByMajorInfo(");
    $flag = false;
    foreach($classes[$tablename][unique_entry_values] as $val) {
      if ($flag) { fwrite($qfile, ", \$$val"); }
      else { $flag = true; fwrite($qfile, "\$$val"); }
    }
    fwrite($qfile, ") {
    \$this->execute(\"SELECT $primary_key
                        FROM $tablename
                       WHERE ");
    $flag = false;
    foreach($classes[$tablename][unique_entry_values] as $val) {
      if ($flag) { fwrite($qfile, "\n                             AND $val='\$$val'"); }
      else { $flag = true; fwrite($qfile, "$val='\$$val'"); }
    }
    fwrite($qfile, "\");
  }

  function queryActive$primary_key_funcname"."s() {
    \$this->execute(\"SELECT $primary_key
                        FROM $tablename
                       WHERE active='ACTIVE'\");
  }

$start_user_comment");
  if (strlen($previous_user_query) > 0) {
    fwrite($qfile, "$previous_user_query");
  } else {
    fwrite($qfile, "\n\n\n");
  }
  fwrite($qfile, "\n$end_user_comment
}
?".">");
    // done with query file
    fclose($qfile);
    echo "Closed Query file successfully.\n";
    echo "==========================================================================\n";
}

function removeUnderscores($str) {
  $pwords = split("_", $str);
  for($i=0;$i<count($pwords);$i++) {
    $pwords[$i][0] = strtoupper($pwords[$i][0]);
  }
  return join("", $pwords);
}
?>
