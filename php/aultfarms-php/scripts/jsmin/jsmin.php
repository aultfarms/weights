#! /usr/local/bin/php5
<?
include_once(realpath(dirname(__FILE__) . "/lib-jsmin.php"));

if (count($argv) < 3) {
  die("USAGE: $argv[0] <input_file> <output_file>");
}

$in = $argv[1];
$out = $argv[2];

file_put_contents($out, JSMin::minify(file_get_contents($in)));

echo "Created file $out.";
