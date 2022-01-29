var PlantingTrelloController = {
  board_name: "Planting",
  // static lists are those whose name does not depend on the contents of cards
  static_lists: [ { name: "Web Controls" } ];

  sync: function(callback) {
    var self = this;
    var board = {      name: self.board_name,
                         id: self.boardid(),
                  sync_date: self.lastSyncTime() };
    // Store the time that we started sync as potential last sync time so 
    // we don't miss anything:
    TrelloView.clear();
    TrelloController.sync(board, self, function(err) {
      if (err) { 
        TrelloView.userMsg("Sync failed!  Error was: ", err);
        return callback("Sync failed.");
      }
      callback(null);
    });
  },

  // Keep track of known good boardid:
  boardid: function(new_val) {
    var self = this;
    var key = "aultfarms.planting.trello.boardid";
    if (typeof new_val === 'undefined') {
      if (!self.validLocalStorage(key)) {
        return false;
      }
      return localStorage[key]; // this could be null...
    } else {
      // If we're setting a new boardid, need to wipe out sync date to make sure
      // we get all the cards....
      if (new_val != localStorage[key]) {
        self.lastSyncTime(false);
        console.log("PlantingTrelloController.boardid: DON'T FORGET TO WIPE ALL CARDS AND LISTS TOO!");
      }
      localStorage[key] = new_val;
    }
  },

  // Keep track of last time we successfully synced:
  lastSyncTime: function(new_val) {
    var self = this;
    var key = "aultfarms.planting.trello.last_sync_time";
    if (typeof new_val === 'undefined') {
      if (!self.validLocalStorage(key)) {
        return "1970-01-01T00:00:01.000Z"; // Jan 1, 1970.
      }
      return localStorage[key];
    } else {
      localStorage[key] = new_val;
    }
  },

  validLocalStorage: function(key) {
    return !(localStorage[key] === 'undefined' || !localStorage[key]
            || localStorage[key] === 'null' || localStorage[key] === 'false');
  },

};
