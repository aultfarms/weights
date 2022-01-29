// Classes in the TrelloSync library:
// TrelloSync
// TrelloSync.classes.BoardModel
// TrelloSync.classes.ListModel
// TrelloSync.classes.CardModel
// TrelloSync.classes.UserModel

var TrelloSync = TrelloSync || {};

(function() {

  TrelloSync.classes = TrelloSync.classes || {};

  TrelloSync.classes.BaseModel = Backbone.Model.extend({
    classname: "TrelloSync.BaseModel",
  });

  TrelloSync.classes.BaseCollection = Backbone.Collection.extend({
    classname: "BaseCollection",
    model: "BaseModel",
  });

  TrelloSync.classes.BoardModel = TrelloSync.classes.BaseModel.extend({
    name: "",
    desc: "",
    dateLastActivity: null,
    org_name: "",
    org_id: "",
    closed: false,
  });


  ///////////////////////////////////////////////
  // Library Functions:
  ///////////////////////////////////////////////
 
  // Check locally if the user is logged in, does not talk to Trello:
  TrelloSync.checkAuthorization = function(callback) {
    Trello.authorize({
      interactive: false, // This disables the redirect, just stores the key if it's in the URL
      persist: true,
      scope: { write: true, read: true },
      expiration: "never",
      success: function() {
        app.dbg("User is already authorized to Trello.");
        TrelloSync.is_logged_in = true;
        callback();
      },
      error: function(err) { // Check is done, but not logged in
        TrelloSync.is_logged_in = false;
        callback("Check failed: " + err);
      },
    });
  }

  // authorize actually talks to Trello remotely and initiates a login
  // sequence.
  TrelloSync.authorize = function(callback) {
    // Sends user to Trello for authorization
    Trello.authorize({ 
      type: "redirect", 
      persist: true,
      expiration: "never",
      scope: { write: true, read: true },
      success: function() {
        app.dbg("Successfully logged in to Trello");
        TrelloSync.is_logged_in = true;
        callback();
      },
      error: function(err) {
        app.dbg("Failed to login to Trello!  Error was: ", err);
        Trello.deauthorize();
        TrelloSync.is_logged_in = false;
        callback("Login failed: " + err);
      },
    });
  };

})();
