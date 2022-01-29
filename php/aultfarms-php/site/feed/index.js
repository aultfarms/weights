// Pulled this from example at http://jsfiddle.net/nNesx/.

////////////////////////////////////////////////////
// Setup:
////////////////////////////////////////////////////

consts = {
            feed_boardid: "4f73a235dffd42106e00cc93", // Board in Ault Farms org.
  available_load_numbers: "4f73a235dffd42106e00cc9a", // List in Feed board
          feed_delivered: "4f73a235dffd42106e00cc98", // List in Feed board
               questions: "4f85c6dec943a92e0e30bcbc", // List in Feed board
            web_controls: "4fc81ac349e99e8263620d13", // List in Feed board
                 drivers: "4fc81ac849e99e8263620e5a", // Card in Web Controls
            destinations: "4fc81acf49e99e8263621574", // Card in Web Controls
                 sources: "4fc81ad149e99e82636215b7", // Card in Web Controls

};

$(document).ready(function() {
  setupLoginLogoutRefresh(); // Note: this might be getting the token out of the URL after a redirect

  // Wire up the submit button:
  $("#i_submit").click(function(event) {
    event.preventDefault();
    submitClicked();
  });

  // Put in the link to look at the Feed board in Trello:
  $("#d_trello_link").html("<a href=\"https://trello.com/board/feed/" + consts.feed_boardid + "\">View Feed Board in Trello</a>");

  // Update the DOM based on login status
  updateLoggedIn();
});

/////////////////////////////////////////////////////
// Authorization:
/////////////////////////////////////////////////////

//////////////////////////////////////////////////////
// Populating controls:
//////////////////////////////////////////////////////

var populateFields = function() {
    $("#d_driver").text("Loading boards...");

    // Populate the drivers:
    populateDrivers();
    populateSources();
    populateDestinations();
    populateAvailableLoadNumbers();
    populateDate();
    populateNetWeight();
};

var populateDrivers = function() {
  $("#d_drivers").html("Loading drivers...");
  getWebControl(consts.drivers, "s_driver", function(html_str) {
    $("#d_drivers").html("Driver: " + html_str);
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


