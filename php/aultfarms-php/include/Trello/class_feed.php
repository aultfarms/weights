<?
////////////////////////////////////////////////////////////
// This class handles getting things from the feed boards in Trello.
////////////////////////////////////////////////////////////

class Feed {
  var $trello;

  function getDrivers() {
    $t = new Trello();
  }

  function getDestinations() {
  }

  function getSources() {
  }

  function getWebControlCard($card_name) {
    $board = $this->trello->getBoardByName("Web Controls");
    if ($board) return false;
    return $board->getCardByName($card_name);
  }
}
