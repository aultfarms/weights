var app = app || {};

(function() {

  // Could be defined in any class library:
  app.classes = app.classes || {};

  // Model-specific stuff:
  app.classes.models = {};
  var models = app.classes.models;

  // BaseModel that all models inherit from:
  models.BaseModel = Backbone.Model.extend({
    classname: "BaseModel",
    defaults: {
      name: "",
    },
  });

  // AuthorizationModel handles authorizing with Trello
  models.AuthorizationModel = models.BaseModel.extend({
    classname: "AuthorizationModel",
    defaults: {
      first_check_done: false,
      logged_in: false,
    },

    // checkAuthorize looks in localStorage to see if user is already logged in:
    checkAuthorize: function() {
      // First try to authorize to Trello without the redirect:
      Trello.authorize({
        interactive: false, // This disables the redirect, just stores the key if it's in the URL
        persist: true,
        scope: { write: true, read: true },
        expiration: "never",
        success: function() {
          app.dbg("User is already authorized to Trello.");
          this.set("first_check_done", true);
          this.set("logged_in", true);
        },
        error: function() { // Check is done, but not logged in
          this.set("first_check_done", true);
        },
      });
    },

    // authorize actually talks to Trello remotely and initiates a login
    // sequence.
    authorize: function() {
      Trello.authorize({ 
        type: "redirect", 
        persist: true,
        expiration: "never",
        scope: { write: true, read: true },
        success: function() {
          app.dbg("Successfully logged in to Trello");
          this.set("logged_in", true);
        },
        error: function(err) {
          app.dbg("Failed to login to Trello!  Error was: ", err);
          Trello.deauthorize();
          this.set("logged_in", false);
        },
      });

    },
  });

  // TrelloDataModel handles getting board name, lists, and cards from Trello
  models.TrelloDataModel = models.BaseModel.extend({
    classname: "TrelloDataModel",
    defaults: {
      board: null,
      organization: null,
      user: null,
    },
    requestUserAndBoard: function(board_name) {
// How should this work?  Default to aultfarms organizationid,
// but have a dropdown at the bottom of the page to set the organization.
// New idea: remove the "AuthorizationModel", put those functions into this
// model.  Change HTML to have a trello footer section instead of authorization.
// Then handling organizationid will naturally belong here.
// Planned Trello requests:
// 1.  Login if necessary.
// 2.  Get user info (fullname and boards with org names in board)
// 2-1.  Look locally through boards for "Manure" board.  If more than one,
//     and there is no local stored id, default to first one.  Keep board choice 
//     in drop-down at the bottom of the screen and store locally for future reference.
// 3.  Once boardid is known, get all lists and card names, put into in-memory model
//     of board.
//4.  What to do when card changes?  Could setup intricate ID-based events for all
//    cards that trigger individual in-memory updates to other model.  Or, could
//    just manually save the one card and trigger a full update.  Updating more
//    frequently will ensure we don't get out of sync...Let's try this and just
//    see how much data is involved in a typical day of "+1"'s.  How about we
//    only trigger board-level update when page is refreshed, or field/source/date 
//    is changed?  We don't really need the entire board, just the one field/source/date
//    card...Can we search cards by partial name string?
//    OR, could save the card and only update that card from Trello after save.
//    How to trigger board-level updates locally (i.e. new cards added to trello)?
//    Look through local copies of cards, get most recent one, then ask Trello
//    for any cards changed since that date, then update each card?
//    Wait, what is my trello model again?  One list per field?  Then we need
//    to re-think lists rather than cards.  If we eliminate the summary tab, 
//    we don't have any problems at all, assuming we can search for a card/list by
//    partial name...
//
//    Let's quit trying to avoid doing local Trello sync.  Just make a LocalTrello
//    library that is a Backbone model with boards, lists, and cards, and handle syncing there.
//
      Trello.get("/1/boards/
    }
  });

  // DateModel holds a date in the app.  I have this to handle translating
  // date strings via functions if necessary.
  models.DateModel = models.BaseModel.extend({
    classname: "DateModel",
    initialize: function(attributes, options) {
      var self = this;
      if (typeof options === 'undefined') return;
      if (typeof options.now !== 'undefined') {
        self.date_str = today();
      }
      // put any conversion functions here
    },

    defaults: {
      date_str: "",
    },
  });

  models.RecordModel = models.BaseModel.extend({
    classname: "RecordModel",
    defaults: {
      field: null,
      source: null,
      date: null,
      loads: null,
      note: null,
    },
  });

  ////////////////////////////////////////////////
  // Collections:
  ////////////////////////////////////////////////

  models.BaseCollection = Backbone.Collection.extend({
    classname: "BaseCollection",
    model: "BaseModel",
  });

  models.RecordCollection = models.BaseCollection.extend({
    classname: "RecordCollection",
    model: "RecordModel",
  });

})();
