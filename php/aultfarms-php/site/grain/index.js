// Pulled this from example at http://jsfiddle.net/nNesx/.

////////////////////////////////////////////////////
// Setup:
////////////////////////////////////////////////////

consts = {

           grain_boardid: "4f76f66783817e5055281d88", // Board in Ault Farms org.
            web_controls: "5012b90b58bd2a9f549f62ea", // List in Grain Hauling board
                 drivers: "5012b94458bd2a9f549f7188", // Card in Web Controls
            destinations: "5012bacf237d94497770abfd", // Card in Web Controls
                   crops: "5012bb95237d944977715b04", // Card in Web Controls
};

$(document).ready(function() {
  setupLoginLogoutRefresh();

  // Wire up the submit button:
  $("#i_submit").click(function(event) {
    event.preventDefault();
    debug("Submit clicked.");
    submitClicked();
  });

  // Put in the link to look at the Grain board in Trello:
  $("#d_trello_link").html("<a href=\"https://trello.com/board/grain-hauling/" + consts.grain_boardid + "\">View Grain Hauling Board in Trello</a>");

  // Update the DOM based on login status
  updateLoggedIn();
});

/////////////////////////////////////////////////////
// Authorization:
/////////////////////////////////////////////////////

var populateFields = function() {
  $("#d_driver").text("Loading boards...");
  populateDrivers();
  populateDestinations();
  populateDate();
  populateNetBu();
  populateCrops();
  populateSellers();
  populateTicketNum();
  populateNotes();
};


//////////////////////////////////////////////////////
// Helper functions for populating controls:
//////////////////////////////////////////////////////
//////////////////////////////////////////////////////
// Populating controls:
//////////////////////////////////////////////////////

var populateDrivers = function() {
  $("#d_drivers").html("Loading drivers...");
  getWebControl(consts.drivers, "s_driver", function(html_str) {
    $("#d_drivers").html("Driver: " + html_str);
    // Set the default driver to the last known one:
    $("#s_driver").val(localStorage["aultfarms.grain.driver"]);
    // Update the stored default driver whenever it's changed:
    $("#s_driver").change(function() {
      var val = $("#s_driver").children(":selected").val();
      localStorage["aultfarms.grain.driver"] =  val;
    });
  });
  // When the driver is selected, store it as default choice:
};

var populateDestinations = function() {
  $("#d_destinations").html("Loading destinations...");
  getWebControl(consts.destinations, "s_destination", function(html_str) {
    $("#d_destinations").html("Destination: " + html_str);
    // Set the default destination to the last known one:
    $("#s_destination").val(localStorage["aultfarms.grain.destination"]);
    // Update the stored default destination whenever it's changed
    $("#s_destination").change(function() {
      var val=$("#s_destination").children(":selected").val();
      localStorage["aultfarms.grain.destination"] = val;
    });
  });
};


var populateDate = function() {
  $("#d_date").html("Date: <input type=\"date\" id=\"i_date\" name=\"i_date\" value=\"" + today() + "\"/>");
};

var populateNetBu = function() {
  $("#d_net_bu").html("Net Bu: <input type=\"number\" id=\"i_net_bu\" name=\"i_net_bu\" />");
};

var populateNotes = function() {
  $("#d_notes").html("Notes: <input type=\"text\" id=\"i_notes\" name=\"i_notes\" />");
};


var populateCrops = function() {
  $("#d_crops").html("Loading crops...");
  getWebControl(consts.crops, "s_crop", function(html_str) {
    $("#d_crops").html("Crop: " + html_str);
    // Set the default crop to the last known one:
    $("#s_crop").val(localStorage["aultfarms.grain.crop"]);
    // Update the stored default destination whenever it's changed
    $("#s_crop").change(function() {
      var val=$("#s_crop").children(":selected").val();
      localStorage["aultfarms.grain.crop"] = val;
    });

  });
};

var populateSellers = function() {
  $("#d_sellers").html("Loading sellers...");
  getLists(consts.grain_boardid, "s_seller", function(html_str) {
    $("#d_sellers").html("Seller/List: " + html_str);
    // Set the default seller to the last known one:
    $("#s_seller").val(localStorage["aultfarms.grain.seller"]);
    // Update the stored default destination whenever it's changed
    $("#s_seller").change(function() {
      var val=$("#s_seller").children(":selected").val();
      localStorage["aultfarms.grain.seller"] = val;
    });
  });
};

var populateTicketNum = function() {
  $("#d_ticket_num").html("Ticket #: <input type=\"number\" id=\"i_ticket_num\" name=\"i_ticket_num\" />");
};


var submitClicked = function() {
  debug("Inside submitClicked, about to clear user message");
  clearUserMsg();
  debug("User message cleared.  Building card.");
  cur_card = buildCardFromFields();
  // First, validate current fields:
  debug("Card built.  Validating...");
  if (msg = validateCard(cur_card)) {
    $("#d_msg").html("Error: " + msg);
    return;
  }
  debug("Current card validated.  It is:<pre>" +JSON.stringify(cur_card)+"</pre>");

  // Pat's phone doesn't have decimal points for numbers.  Check if net bushels are far more
  // than a truck could ever carry: if it is, add decimal points
  debug("checking cur_card.net_bu > 2000...  It is = ", cur_card.net_bu);
  if (cur_card.net_bu > 2000) {
    debug("dividing current net bushels by 100 because it is greater than 2000.  Before it was: ", cur_card.net_bu);
    cur_card.net_bu = cur_card.net_bu / 100.0;
    debug("dividing current net bushels by 100 because it is greater than 2000.  After it is now: ", cur_card.net_bu);
  }

  // Next, setup the card name
  name = cur_card.date + ": ";
  name += addCommasToInt(cur_card.net_bu) + " bu ";
  name += cur_card.crop.data.toUpperCase() + ".  ";
  name += cur_card.destination.data + " - ";
  name += "Tkt #" + cur_card.ticket_num + " - ";
  name += cur_card.driver.data;
  name += ".";
  if (cur_card.notes.length > 0) name += "  Notes: " + cur_card.notes;

  // Get the list that the card is in:
  listid = cur_card.seller_list.id;
  list_name = cur_card.seller_list.data;

  var trello_error_handler = function(msg) { debug("ERROR in Trello posting: ", error); }
  $("d_logged_in").scrollTop();

  // Create a new card in the proper list
  userMsg("Creating new card in "+list_name+" ...");
  debug("1 About to post to lists....");
  Trello.post("lists/" + listid + "/cards", 
    {   name: name,
        desc: "",
      idList: listid 
    },
    function(response1) {
      debug("2 success function called after posting to list");
      if (response1.name != name) {
        debug("ERROR: failed to create new card.");
        return;
      }
      // Get the newly generated cardid
      cardid = response1.id;
      userMsg("Done.<br>");
      userMsg("Moving card to bottom of list...");
      debug("3 about to put card at bottom of list:");
      trello_put("cards/" + cardid + "?pos=bottom", 
        function(response2) {
          debug("4 success function called for putting card at bottom of list");
          cache.reset();
          clearUserMsg();
          userMsg("Successfully created card: <br>", response2.name);
        }, trello_error_handler
      );
    }, trello_error_handler
  );
}

var buildCardFromFields = function() {
  var c = {};
  var id;

  c.destination = getCurrentDataItem("#s_destination", consts.destinations);
  c.date = $("#i_date").val().toString().trim();
  c.driver = getCurrentDataItem("#s_driver", consts.drivers);
  c.net_bu = $("#i_net_bu").val();
  c.crop = getCurrentDataItem("#s_crop", consts.crops);
  c.ticket_num = $("#i_ticket_num").val();
  c.seller_list = getCurrentDataItem("#s_seller", consts.grain_boardid);
  c.notes = $.trim($("#i_notes").val());
  
  return c;
};

var validateCard = function(c) {
  msg = "";
  debug("Inside validateCard.  checking destination. card is:" + JSON.stringify(c));
  if (inArrayOfDataItems(c.destination, cache.get(consts.destinations)) < 0) {
    msg += "Destination invalid.  Internal Error.<br>";
  }
  debug("Inside validateCard.  checking net bushels.");
  if (isNaN(parseInt(c.net_bu))) {
    msg += "Net Bushels invalid: Try something like 953 or 1,100 or 1038<br>";
  }
  debug("Inside validateCard.  checking date.");
  if (!c.date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
    msg += "Date invalid: must be YYYY-MM-DD format.<br>";
  }
  debug("Inside validateCard.  checking driver.");
  if (inArrayOfDataItems(c.driver, cache.get(consts.drivers)) < 0) {
    msg += "Driver invalid: internal error<br>";
  }
  debug("Inside validateCard.  checking seller.");
  if (inArrayOfDataItems(c.seller_list, cache.get(consts.grain_boardid)) < 0) {
    msg += "Seller invalid: internal error<br>";
  }
  debug("Inside validateCard.  checking crop.");
  if (inArrayOfDataItems(c.crop, cache.get(consts.crops)) < 0) {
    msg += "Crop invalid: internal error<br>";
  }
  debug("Inside validateCard.  checking ticket number.");
  if ($.trim(c.ticket_num).length < 1) {
    msg += "Ticket number invalid: cannot be blank.";
  }
  // Nothing to check with notes.  They are optional and completely free form.
  debug("validateCarddone.  returning msg: "+msg);
  return msg;
}


