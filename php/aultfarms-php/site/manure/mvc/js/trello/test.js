var app = app || {};

$(function() {
  app.dbg("Checking authorization");
  TrelloSync.checkAuthorization(function(err) {
    if (err) {
      app.dbg("Checked authorization, and failed.  err = ", err);
      app.dbg("Trying to authorize with redirect:");
      TrelloSync.authorize(function(err) {
        if (err) {
          app.dbg("Failed second authorization: " + err);
          return;
        }
        app.dbg("Succeeded with second authorization.");

      });
      return;
    }
    app.dbg("Checked authorization and succeeded. <a id='logout_button' href=\"#\">Logout?</a>");
    $logout_button = $(document.getElementById("logout_button"));
    $logout_button.click(function() {
      app.dbg("Logging out...");
      Trello.deauthorize();
      app.dbg("Done with Trello.deauthorize.");
    });

    app.dbg("After authorization phase, now let's get the user's info:");
    Trello.members.get("me", function(data, status) {
      app.dbg("After getting 'me', data = ", data, ", status = ", status);
      app.dbg("Next, get boards:");
      Trello.get("search", { query: "Manure", board_fields: "id,name,dateLastActivity", modelTypes: "boards" }, function(data, status){
        app.dbg("After getting boards, data = ", data, ", status = ", status);
        var boards = [ { id: data.boards[0].id, date: data.boards[0].dateLastActivity }, 
                       { id: data.boards[1].id, date: data.boards[1].dateLastActivity } ];

        app.dbg("Now, checking actions for most recent one from board[0]:");
        Trello.get("boards/"+boards[0].id+"/actions", { since: boards[0].date, limit: 1, fields: "type,date", memberCreator: "false" }, function(data, status) {
          app.dbg("Got actions from board, data = ", data, ", status = ", status);
        });

        // This works: can get dates of all actions since last updated date on board.  Limiting to 1 gets date of most recent action.
        //  Use this to see if board needs updating prior to searching for boardid?  i.e. we have an id already, do this query
        //  to get it's REAL last updated date, compare with our own.  if trello is newer, need to sync.  Or, could just ask for 
        //  all actions since I last updated, ignore types I don't care about (only care about update/add lists, rename board,
        //  change card name, change card desc.)  provide a link for full sync, but do incremental all the rest of the time.
        //  For now, all local changes have to be sent to the server first manually, then sync will update local copy.
      });

    });

  });
  
});  

app.dbg = function(args_to_print) {
  if (window.location.href.indexOf("debug") < 1) { return; }
  if (typeof app.dbg.first_run === 'undefined') {
    app.dbg.first_run = true;
    $("#container-debug").show();
    $("#container-debug").append("<hr><b><span class=\"message\">DEBUGGING:</span></b><br><br>");
  }
  args = Array.prototype.slice.call(arguments);
  str = "";
  for (var idx in args) {
    var str_or_obj = args[idx];
    if (typeof(str_or_obj) == "string") {
      str += str_or_obj;
    } else {
      str += JSON.stringify(str_or_obj, false, "  ");
    }
  }
  $("#container-debug").append("<pre>" + str + "\n</pre>");
  console.log("DEBUG: " + str );
  window.scrollTo(0,document.body.scrollHeight);
};


