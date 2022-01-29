<?
  include_once(realpath(dirname(__FILE__)."/../../Page/class_path.php"));
  
  class Query{
    var $dbreturn;
    var $string="SELECT * from users";

    function Query($dbname=false){
      $hostname = "localhost";
      $username = "insert username here";
      $password = "insert pasword here";
      mysql_connect($hostname, $username, $password);
      $path = realpath(dirname(__FILE__));
      if (strlen($dbname) < 1) {
        $dbname = "insert default database name here";
      }
      mysql_select_db($dbname);
    }

    function execute($string){
      $this->dbreturn=mysql_query($string);
      if(!$this->dbreturn){
        echo "></select>DATABASE ERROR: <pre><br/>Query = $string  <br/>MySQL said: ".mysql_error();
      }
    }

    function get(){
      if ($this->dbreturn) {
        $arr=mysql_fetch_array($this->dbreturn);
        if(is_array($arr)){
          foreach($arr as $key=>$value){
            $this->$key=$value;
          }
          return true;
        }
      }
      return false;
    }

  }
?>
