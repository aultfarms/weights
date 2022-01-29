var TrelloController = {

  // board should be: { id: "JKSDF($IRFEW", name: "Planting" }
  sync: function(board, app_controller, callback) {
    var self = this; 

    // Store the time that we started sync as potential last sync time so
    // we don't miss anything.  At worst, we'll have to resync a little
    // extra stuff.
    var potential_sync_time = new Date().toISOString();

    TrelloView.show();
    TrelloView.userMsg("Syncing Board and Lists...");

    self.getBoardsListsActions(board, app_controller, function(trello_board) {
      if (!trello_board) {
        TrelloView.userMsg("Failed to get a valid " + board.name + " board!");
        callback(null);
      }

// NOTE TO SELF: make all string comparisons case insensitive.
      // Verify the board still has the correct name:
      if (trello_board.name !== board.name) {
        TrelloView.userMsg("Existing board is no longer named " + app_controller.board_name + ".  Choosing a different one.");
        app_controller.boardid(false);
        return app_controller.sync(callback);
      }

      // Verify all the static lists: i.e. lists whose name does not depend on contents
      // of cards in the board.  For example, "Web Controls" always exists, but 
      // "Corn Planting" does not, since it depends on whether "Corn" exists as a crop type
      // in the "Crop Types" card 
      var local_lists = app_controller.static_lists;
      var trello_lists = trello_board.lists;
      for (var i in local_lists) {
        var l = list[i];
        var found = false;
        for (var j in trello_lists) {
          if (trello_lists[j].name === l.name) {
            found = true;
            break;
          }
        }
        if (!found) {
          // We have a list here which is not on the Trello board.  Create it.
          TrelloView.userMsg("List " + l.name + " is not on this board.  Creating it.");
          Trello.post("lists?name=" + l.name + "&idBoard=" + board.id, function(new_list) {
            // Now the list should be on the board: do we need it's id?
          });
// STOPPED HERE: how should we go about storing and retrivin listid's?  We'll probably need them
// in order to post new cards.  Need localStorage for each list, but ID will be ignored?  Probably
// need to check stored ID and, if it changes, wipe all the local cards for that list.
// Time to look at using PlantingAppModel to load and store things.  I wonder how, in the model,
// I would represent these things that are lists in Trello?  .....
        }
      }

      console.log("TrelloController.sync: board " + board.name + " verified.  Lists are next.");
    });


  },

  // This function is more complicated than it first seems it should be.
  // If we don't have a boardid stored, we need to find one on Trello.
  // If there is more than one on Trello, we need the user to choose one
  // of them.  If there are none on Trello, we need to create one.  If 
  // there is exactly one, use it by default.  Then, restart the sync
  // process once we've stored the new boardid: next time it will skip
  // to the section where we have a boardid and it will retrieve the lists
  // and board name to check.
  getBoardsListsActions: function(board, app_controller, callback) {
    var self = this;

    // Get boardid out of local storage:
    TrelloView.userMsg("Searching for " + board.name + " board...");

    // If one is not stored, look for one:
    if (typeof board.id === 'undefined' || !board.id) {
      Trello.get("search?board_fields=id,name,idOrganization&query="+board.name, function(data) {
        var possible_boards = [];
        for (var i in data.boards) {
          if (data.boards[i].name == board.name) {
            possible_boards.push(data.boards[i]);
          }
        }

        // If there are no boards, make one and restart sync:
        if (possible_boards.length < 1) {
          TrelloView.userMsg("Did not find a " + board.name + " board.  Creating one...");
          Trello.post("boards?name="+board.name, function(data) {
            // Now that we have a board, store it's id and restart sync
            app_controller.setBoardid(data.id);
            return app_controller.sync(callback); // Hopefully this never become infinite recursion
          });

        // If there are multiple boards, get the organization names for each
        // and ask user to choose one.
        } else if (possible_boards.length > 1) {
          TrelloView.userMsg("Found multiple boards.  Asking for clarification...");
          // Get all organization names:
          self.fillInOrgNames(possible_boards, function(possible_boards) {
            // Give list of baords to upper-level view:
            TrelloView.chooseBoard(possible_boards, function(chosen_board) {
              app_controller.boardid(chosen_board);
              return app_controller.sync(callback);
            });
          });

        // Otherwise, we found exactly one.  Use it.
        } else {
          TrelloView.userMsg("Found one " + board.name + " board.  Using it.");
          app_controller.boardid(possible_boards[0].id);
          return app_controller.sync(callback);
        }

      });

    // Otherwise, a boardid is stored locally, so we need to just validate that it still has the proper
    // name.  Get the lists and all the recent actions as well.
    } else {
      var since_date = app_controller.lastSyncTime();
      TrelloView.userMsg("Syncing all activity on known board since " + since_date);
      Trello.get("board/"+board.id+"?fields=name&actions=all&actions_limit=1000&actions_since="+since_date+"&lists=open", function(data) {
        callback(data);
      });
    }

  },
 
  // Given an array of boards with an idOrganization (from Trello), this fills
  // in all the info for each organization by getting it one by one from Trello.
  fillInOrgNames: function(boards, callback) {
    // Create the wrapper function that builds a function to fill in one organization:
    var makeOrgUpdateObj = function(boardindex, orgid) {
      return {
        next_obj: null,
        fn: function(org_update_obj) {
          TrelloView.userMsg("Getting organization with id " + orgid);
          Trello.get("organization/"+orgid+"?fields=displayName", function(data) {
            boards[boardindex].organization = { id: orgid,
                                                name: data.displayName };
            // If there is a next object, call it's main function:
            var next = org_update_obj.next_obj;
            if (next) {
              return next.fn(next);
            }

            // No next object, we're done.
            return;
          });
        }
      };
    };

    // Build all the functions that will get each organization:
    var series_objs = [];
    for (var i in boards) {
      var orgid = boards[i].idOrganization;
      series_objs.push(makeOrgUpdateObj(i, orgid));
    }

    // Setup all the callback chains:
    for (var i=0; i<series_objs.length; i++) {
      // If this is not the last one, call current function with next function as callback:
      if (i < series_objs.length - 1) {
        series_objs[i].next_obj = series_objs[i+1];

      // If this is the last one, setup the special final callback that should occur when all 
      // organizations are filled in:
      } else {
        series_objs[i].next_obj = {
          next_obj: null,
          fn: function() {
            // boards should be filled in now, pass it back to callback:
            callback(boards);
          }
        };
      }
    }

    // Trigger the first one:
    return series_objs[0].fn(series_objs[0]);
  },

};
