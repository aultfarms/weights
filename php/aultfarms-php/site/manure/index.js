var app = app || {};

(function() {

////////////////////////////////////////////////////
// Setup:
////////////////////////////////////////////////////

app.RecordModel = {
    field: "",
    date: "",
    source: "",
    loads: "",
    notes: "",
};

app.consts = {
  manure_boardid: "52a9c19449729e164907b4d0", // Board in Ault Farms org.
    web_controls: "52a9c19449729e164907b4d3", // List in Manure board
       operators: "52a9c39e79d1a3ea7110683d", // Card in Web Controls
          fields: "52a9c85045fec558300c97fd", // Card in Web Controls
         sources: "52a9c856fce3bab31608412e", // Card in Web Controls
};

///////////////////////////////////////////////////////
// Variables for keeping track of things in the view:
app.view_vars = {
  is_logged_in: false,
};

///////////////////////////////////////////////////////////
// document.ready: keep this simple, just initialize the
// view and start Trello authorization process
///////////////////////////////////////////////////////////

$(document).ready(function() {
  app.dbg("DocumentReady: starting javascript, calling view.update");
  // Initialy set screen to show logged out until authorized:
  app.view.update();

  app.dbg("DocumentReady: starting javascript, calling setupTrello");
  // Authorize, this will continue program sequentially
  app.setupTrello();

  return;
});



//////////////////////////////////////////////////////////
// Functions for dealing with logging in to Trello:
//////////////////////////////////////////////////////////

// This just asks Trello's local storage if the user is already logged in:
app.setupTrello = function(callback) {
  // First try to authorize to Trello without the redirect:
  Trello.authorize({
    interactive: false, // This disables the redirect, just stores the key if it's in the URL
    persist: true,
    scope: {
      write: true,
      read: true
    },
    expiration: "never",
    success: function() {
      app.dbg("User is already authorized to Trello.");
      return app.doneWithTrelloLogin(); // Already logged in.
    }
  });

};

// When the user clicks the "Connect to Trello" link, this is called
// to get Trello to log them in.
app.initiateLoginToTrello = function() {
  Trello.authorize({ 
    type: "redirect", 
    persist: true,
    expiration: "never",
    scope: { write: true, read: true },
    success: function() {
      app.dbg("Successfully logged in to Trello!");
      return app.doneWithTrelloLogin(); // SUCCESS: done logging in
    },
    error: function(err) {
      app.dbg("Failed to login to Trello!  Error was: ", err);
      Trello.deauthorize();
      return app.view.update(); // FAIL: did not log in!
    },
  });
};

// When Trello is done authorizing, this gets called.  Can be called
// either from initial attempt to authorize locally (i.e. check if user
// is already logged in), or when user clicks "Connect to Trello" link.
app.doneWithTrelloLogin = function(err) {
  if (err) { 
    dbg("Error setting up trello!");
    return app.view.update();
  }
  dbg("Successfully setup trello");
  app.view.update();
  return app.getManureBoardid();
}


////////////////////////////////////////////////////////////
// Retrieving stuff from Trello:
////////////////////////////////////////////////////////////

app.getFullnameAndManureBoardid = function() {
  Trello.members.get("me", function(member) {
    app.dbg("me = ", member);

  });
};

app.getBoardContents = function() {
  // TODO: write this.
  return app.doneGettingBoardContents();
};

app.doneGettingBoardContents = function() {
  // TODO: write this.
  return app.view.update();
};

////////////////////////////////////////////////////////////
// Display/View
/////////////////////////////////////////////////////

app.view = {};

app.view.setState = function(id, which_class) {
  $(id).not(which_class).hide();
  $(id).find(which_class).show();
};

// Called when the program first starts:
app.view.initialize = function() {
  app.view.state = { 
    checked_for_login: false,
    logged_in: false,
    
  };

  // Hide main div's
  $("#d_main").hide();
  $("#d_saving_card").hide();

  // Show authorization footer, but put it into loading mode:
  app.view.showOnlyClass("#d_authorization_footer", ".loading");
  $("#d_authorization_footer").show();

  app.view.update();
}

// Called whenever something in the main view needs to change:
app.view.update = function() {

  // Handle each major block in the page:
  // Authorization Footer First:
  if (!app.view.state.logged_in) {

  }


  if (!app.view.state.logged_in) {
    $("#d_saving_card").hide();
    $("#d_main").hide();
    $("#d_authorization_footer").show();

    $("#d_authorization_footer").find(".lo
  // STOPPED HERE: figure out how to handle each major screen area on update.  Some kind of 
  // boolean flag for each?
  //
  // Saving card messages:
  // TODO: write this
  //$("#trello_link").html("<a href=\"https://trello.com/board/manure/" + consts.manure_boardid + "\">View Manure Board in Trello</a>");
}

//////////////////////////////////////////////////////
// Populating controls:
//////////////////////////////////////////////////////

var populateForm= function() {
    $("#d_driver").text("Loading boards...");

    populateFields();
    populateSources();
    populateNumLoads();
    populateOperator();
    populateDate();
    populateNotes();
};

var populateDrivers = function() {
  $("#operators").html("Loading operators...");
  getWebControl(consts.operators, "s_operator", function(html_str) {
    $("#operators").html("Operator: " + html_str);
    // Set the default driver to the last known one:
    $("#s_driver").val(localStorage["aultfarms.feed.driver"]);
    // Update the stored default driver whenever it's changed:
    $("#s_driver").change(function() {
      var val = $("#s_driver").children(":selected").val();
      localStorage["aultfarms.feed.driver"] =  val;
    });
  });
  // When the driver is selected, store it as default choice:
};

var populateSources = function() {
  $("#d_sources").html("Loading sources...");
  getWebControl(consts.sources, "s_source", function(html_str) {
    $("#d_sources").html("Source: " + html_str);
    // Set the default source to the last known one:
    $("#s_source").val(localStorage["aultfarms.feed.source"]);
    // Update the stored default source whenever it's changed
    $("#s_source").change(function() {
      var val=$("#s_source").children(":selected").val();
      localStorage["aultfarms.feed.source"] = val;
      // Update which load numbers are shown based on source
      populateAvailableLoadNumbers();
    });
  });
};

var populateDestinations = function() {
  $("#d_destinations").html("Loading destinations...");
  getWebControl(consts.destinations, "s_destination", function(html_str) {
    $("#d_destinations").html("Destination: " + html_str);
  });
};

var populateAvailableLoadNumbers = function() {
  $("#d_load_numbers").html("Loading load numbers...");
  id = consts.available_load_numbers;
  trello_path = "list/" + id + "/cards";
  sanitizer = function(raw_data) {
    var arr = [];
    $.each(raw_data, function(idx, card) {
      arr[idx] = new cache.DataItem(card.id, card.name);
    });
    return arr;
  }
  cache.get(id, trello_path, sanitizer, function(data) {

    var selected = getCurrentDataItem("#s_source", consts.sources);
    if (!selected) { // race condition, nothing has been selected yet
      $("#d_load_numbers").append("<a href=\"#\" onClick=\"populateAvailableLoadNumbers();\">Try again</a>");
      return;
    }
    var srcs = splitString(",", selected.data);
    var numbers = filterDataItems(data, srcs, (srcs[0] == "-- Any --"));
    var initial_newload_val = srcs[0];
    if (srcs[0] == "-- Any --") initial_newload_val = "";
    if (numbers.length < 1) {
      // Tell user there are no numbers for this source:
      $("#d_load_numbers").html("Available #'s: None for this source");
      // Enable div to allow entry of new number
      $("#d_new_load_number").toggle(true);
      // Put the text box in the div
      $("#d_new_load_number").html("Enter New #: <input id=\"i_new_load_number\" name=\"i_new_load_number\" value=\""+initial_newload_val+"\"/>");
    } else {
      // Add default option to end to create a new card/load number:
      numbers[numbers.length] = { id: "NEW_LOAD", data: "-- New Load Number --" };
      // Put up the select box for existing load numbers:
      $("#d_load_numbers").html("Available #'s: " + arrayToSelect(numbers, "s_load_numbers"));
      // Put the text box into the new load number div:
      $("#d_new_load_number").html("Enter New #: <input id=\"i_new_load_number\" name=\"i_new_load_number\" value=\""+initial_newload_val+"\"/>");
      // Turn off the new load number div until user selects -- New Load Number --
      $("#d_new_load_number").toggle(false);
      // Setup change function to check if user wants to enter a new load number.
      $("#s_load_numbers").change(function() {
        // Get currently selected value:
        var val=$("#s_load_numbers").children(":selected").val();
        // Check if user selected to add a new load:
        if (val == "NEW_LOAD") {
          $("#d_new_load_number").toggle(true);
        } else {
          $("#d_new_load_number").toggle(false);
        }
      });
    }
  });
};

var populateDate = function() {
  $("#d_date").html("Date: <input type=\"date\" id=\"i_date\" name=\"i_date\" value=\"" + today() + "\"/>");
}

var populateNetWeight = function() {
  $("#d_net_weight").html("Net Lbs: <input type=\"number\" id=\"i_net_weight\" name=\"i_net_wieght\" />");
}



var submitClicked = function() {
  clearUserMsg();
  cur_card = buildCardFromFields();
  // First, validate current fields:
  if (msg = validateCard(cur_card)) {
    $("#d_msg").html("Error: " + msg);
    return;
  }
  // Next, put new card name into Trello over old one
  cardid = cur_card.load_number.id;

  name = cur_card.date + ": ";
  name += cur_card.load_number.data + ".  ";
  name += addCommasToInt(cur_card.net_weight) + " lbs - ";
  name += cur_card.destination.data + " - ";
  name += cur_card.driver.data;

  var trello_error_handler = function(msg) { debug("ERROR: ", msg); }
  $("d_logged_in").scrollTop();

  // Create a new card rather than change an existing one:
  if (cardid == "NEW_LOAD") {
    userMsg("Creating new card in Feed Delivered...");
    Trello.post("lists/" + consts.feed_delivered + "/cards", 
      {   name: name,
          desc: "",
        idList: consts.feed_delivered },
      function(response1) {
        if (response1.name != name) {
          debug("ERROR: failed to create new card.");
          return;
        }
        // Get the newly generated cardid
        cardid = response1.id;
        userMsg("Done.<br>");
        userMsg("Moving card to bottom of list...");
        trello_put("cards/" + cardid + "?pos=bottom", function(response2) {
          cache.reset();
          clearUserMsg();
          userMsg("Successfully created card: <br>", response2.name);
        }, trello_error_handler);
      }, trello_error_handler
    );

  // Move an existing card to Delivered list
  } else {
    userMsg("Changing name...");
    trello_put("cards/" + cardid + "?name=" + name, function(response1) {
      // check if response1.name == name
      if (response1.name != name) {
        debug("ERROR: failed to change name on card.  Name is: ",name);
        return;
      }
      userMsg("Done.<br>");
      userMsg("Moving card to Feed Delivered...");
      trello_put("cards/" + cardid + "?idList=" + consts.feed_delivered, function(response2) {
        // check if response2.idList == consts.feed_delivered
        if (response2.idList != consts.feed_delivered) {
          debug("ERROR: changed name, but failed to move card to Feed Delivered list.");
          return;
        }
        userMsg("Done.<br>");
        userMsg("Moving card to bottom of list...");
        trello_put("cards/" + cardid + "?pos=bottom", function(response3) {
          cache.reset();
          clearUserMsg();
          userMsg("Successfully moved card: <br>", response3.name);
        }, trello_error_handler);
      }, trello_error_handler);
    }, trello_error_handler);
  }
}

var buildCardFromFields = function() {
  var c = {};
  var id;

  // If new load number is entered, use it:
  if ($("#i_new_load_number").is(":visible")) {
    c.load_number = { id: "NEW_LOAD", data: $("#i_new_load_number").val() };
  } else {
    c.load_number = getCurrentDataItem("#s_load_numbers", consts.available_load_numbers);
  }
  c.destination = getCurrentDataItem("#s_destination", consts.destinations);
  c.net_weight = $("#i_net_weight").val();
  c.date = $("#i_date").val().toString().trim();
  c.driver = getCurrentDataItem("#s_driver", consts.drivers);
  return c;
}

var validateCard = function(c) {
  msg = "";

  if (inArrayOfDataItems(c.load_number, cache.get(consts.available_load_numbers)) < 0
      && c.load_number.id != "NEW_LOAD") {
    msg += "Load number invalid.  Internal Error.<br>";
  }
  if (inArrayOfDataItems(c.destination, cache.get(consts.destinations)) < 0) {
    msg += "Destination invalid.  Internal Error.<br>";
  }
  if (isNaN(parseInt(c.net_weight))) {
    msg += "Net Weight invalid: Try something like 45,000 or 45000<br>";
  }
  if (!c.date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
    msg += "Date invalid: must be YYYY-MM-DD format.<br>";
  }
  if (inArrayOfDataItems(c.driver, cache.get(consts.drivers)) < 0) {
    msg += "Driver invalid: internal error<br>";
  }
  return msg;
}

})();

//////////////////////////////////////////////////////////
// Helper functions:
//////////////////////////////////////////////////////////

app.dbg = function(args_to_print) {
  if (typeof app.dbg_first_run === 'undefined') {
    app.dbg_first_run = true;
    $("#d_debug").append("<hr><b><font color=\"#FF0000\">DEBUGGING:</font></b><br><br>");
  }
  if (window.location.href.indexOf("debug") < 1) { return; }
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
  $("#d_debug").append(str + "\n");
  console.log("Debugging: msg = " + str);
}




