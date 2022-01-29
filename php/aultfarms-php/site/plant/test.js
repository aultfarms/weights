
////////////////////////////////////////////////////
// Setup:
////////////////////////////////////////////////////

var userMsg = function(msg) {
  $("#d_msg").html(msg);
};

$(document).ready(function() {
  var self = this;

  // Tell the Trello controller how to give the user messages:
  TrelloView.setViewId("#trelloview");
  TrelloView.hide();

  // First try to authorize to Trello without the popup:
  Trello.authorize({
    interactive: false,
    persist: true,
    scope: {
      write: true,
      read: true
    },
    expiration: "30days",
    success: onAuthorize,
    error: onAuthorizeError,
  });

  // Wire up logout link:
  $("#a_logout").click(function() {
    Trello.deauthorize();
    updateLoggedIn();
  });
  
  // Wire up login link:
  $("#a_connect_trello").click(function() {
    Trello.authorize({ 
      type: "popup", 
      persist: true,
      success: onAuthorize,
      scope: { write: true, read: true } 
    });
  });

  // Wire up the submit button:
  $("#i_submit").click(function(event) {
    event.preventDefault();
    submitClicked();
  });

  // Put in the link to look at the Plant board in Trello:
  $("#d_trello_link").html("<a href=\"https://trello.com/board/field-work-2013/51829dacc580fe1a07001743\">View " + PlantingTrelloController.board_name + " in Trello</a>");
  $("#switch_boards_link").html("<a id=\"reset_boardid_link\" href=\"#\">Switch Board</a>");
  $("#reset_boardid_link").click(function() {
    PlantingTrelloController.boardid(false);
    PlantingTrelloController.sync();
  });

  // Update the DOM based on login status
  //updateLoggedIn(); // Run in onAuthorize from Trello
});

/////////////////////////////////////////////////////
// Authorization:
/////////////////////////////////////////////////////

var updateLoggedIn = function() {
  var isLoggedIn = Trello.authorized();

  // Toggle visibility of div's based on login status
  $("#d_not_logged_in").toggle(!isLoggedIn);
  $("#d_logged_in").toggle(isLoggedIn);

  // If we're logged in, populate all the comboboxes
  if (isLoggedIn) {
    userMsg("Searching for Planting board...");


    PlantingTrelloController.sync();

//    populateAcres();
//    populateStarterNotes();
//    populateRefugeNotes();
//    populatePopulationNotes();
//    populateNotes();
//    populateDate();
//    populateCrop();
//    populateDrivers();
  }

};

// Called when user has authorized with Trello
var onAuthorize = function() {
  // Toggle main div's on/off, load external items
  updateLoggedIn();

  // Get name of logged in user, display in fullName field
  Trello.members.get("me", function(member){
    $("#fullName").text(member.fullName);
  });
};

var onAuthorizeError = function() {
  updateLoggedIn();
};

//////////////////////////////////////////////////////
// Populating controls:
//////////////////////////////////////////////////////

var populateVarieties = function(planting_board) {
  $("#d_variety").html("Loading varieties...");

var cs = "518455e29cb82f986900619b,518455d91cfe494151002943,518455d52dfca007790061f9";
Trello.get("/board/"+planting_board.id+"/cards?search="+cs, function(data) {
  console.log("Search = : ", data);
});

  // STOPPED HERE XXX !!!
  // How to deal with Corn vs. Beans?  Do we initialize it to something, possibly
  // based on the previous crop used, or some default listed in web control, or
  // arbitrarily?
  planting_board.get
};

/*
var populateDrivers = function() {
  $("#d_drivers").html("Loading drivers...");
  getWebControl(consts.drivers, "s_driver", function(html_str) {
    $("#d_drivers").html("Driver: " + html_str);
    // Set the default driver to the last known one:
    $("#s_driver").val(localStorage["aultfarms.plant.driver"]);
    // Update the stored default driver whenever it's changed:
    $("#s_driver").change(function() {
      var val = $("#s_driver").children(":selected").val();
      // When the driver is selected, store it as default choice:
      localStorage["aultfarms.plant.driver"] =  val;
    });
  });
};
*/

var populateFields = function() {
  $("#d_fields").html("Loading fields...");
  getWebControl(consts.fields, "s_field", function(html_str) {
    $("#d_fields").html("Field: " + html_str);
    // Set the default field to the last known one:
    $("#s_field").val(localStorage["aultfarms.plant.field"]);
    // Update the stored default field whenever it's changed
    $("#s_field").change(function() {
      var val=$("#s_field").children(":selected").val();
      localStorage["aultfarms.plant.field"] = val;
      // Update all the other variables to match this field's data:
      var field_data = findAndParseFieldCard(val);
      setupVarsFromFieldData(field_data);
    });
  });
};


var today = function() {
  var d = new Date();
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var day = d.getDate();
  month = (month < 10) ? ("0" + month) : month.toString();
  day = (day < 10) ? ("0" + day) : day.toString();
  return year + "-" + month + "-" + day;
};

var populateDate = function() {
  $("#d_date").html("Date: <input type=\"date\" id=\"i_date\" name=\"i_date\" value=\"" + today() + "\"/>");
};


//////////////////////////////////////////////////
// Creating the card:
//////////////////////////////////////////////////

var submitClicked = function() {
  clearUserMsg();

  cur_card = buildCardFromFields();
  // First, validate current fields:
  if (msg = validateCard(cur_card)) {
    $("#d_msg").html("Error: " + msg);
    return;
  }

  var trello_error_handler = function(msg) { debug("ERROR: ", error); }
  $("d_logged_in").scrollTop();

  // Create a new card in the proper list
  userMsg("Creating new card in "+list_name+" ...");
  Trello.post("lists/" + listid + "/cards", 
    {   name: name,
        desc: "",
      idList: listid 
    },
    function(response1) {
      if (response1.name != name) {
        debug("ERROR: failed to create new card.");
        return;
      }
      // Get the newly generated cardid
      cardid = response1.id;
      userMsg("Done.<br>");
      userMsg("Moving card to bottom of list...");
      trello_put("cards/" + cardid + "?pos=bottom", 
        function(response2) {
          cache.reset();
          clearUserMsg();
          userMsg("Successfully created card: <br>", response2.name);
        }, trello_error_handler
      );
    }, trello_error_handler
  );
}

var getCurrentDataItem = function(selector, trello_id) {
  id = $(selector).children(":selected").val();
  arr = cache.get(trello_id);
  for (idx in arr) {
    if (arr[idx].id == id) {
      return arr[idx];
    }
  }
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
  
  return c;
}

var inArrayOfDataItems = function(needle, haystack) {
  var found = -1;
  $.each(haystack, function(idx, item) {
    if (item.id == needle.id) {
      found = idx;
      return false; // break
    }
  });
  return found;
}

var validateCard = function(c) {
  msg = "";

  if (inArrayOfDataItems(c.destination, cache.get(consts.destinations)) < 0) {
    msg += "Destination invalid.  Internal Error.<br>";
  }
  if (isNaN(parseInt(c.net_bu))) {
    msg += "Net Bushels invalid: Try something like 953 or 1,100 or 1038<br>";
  }
  if (!c.date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
    msg += "Date invalid: must be YYYY-MM-DD format.<br>";
  }
  if (inArrayOfDataItems(c.driver, cache.get(consts.drivers)) < 0) {
    msg += "Driver invalid: internal error<br>";
  }
  if (inArrayOfDataItems(c.seller_list, cache.get(consts.grain_boardid)) < 0) {
    msg += "Seller invalid: internal error<br>";
  }
  if (inArrayOfDataItems(c.crop, cache.get(consts.crops)) < 0) {
    msg += "Crop invalid: internal error<br>";
  }
  if ($.trim(c.ticket_num).length < 1) {
    msg += "Ticket number invalid: cannot be blank.";
  }
  return msg;
}

var refreshLinkClicked = function() {
  clearUserMsg();
  cache.reset();
}

//////////////////////////////////////////////////////
// Helper functions for populating controls:
//////////////////////////////////////////////////////

// arr can either be simple string array, or could be array of DataItem objects
var arrayToSelect = function(arr, select_id) {
  var html = "<select name=\"" + select_id + "\" id=\"" + select_id + "\">";
  for (idx in arr) {
    html += "<option value=\"" + arr[idx].id + "\">" + arr[idx].data + "</option>";
  }
  html += "</select>";
  return html;
};

var splitString = function(separator, str) {
  if (typeof(str) != "string") return [];
  // Use the built-in split:
  values = str.split(separator);
  // Remove any empty values:
  for(i=0; i<values.length; i++) {
    values[i] = $.trim(values[i]);
    if (values[i].length < 1) {
      values.splice(i, 1); // Remove the empty one at location "index"
      i--; // Update the index to reflect the removed item
    }
  }
  return values;
};




//////////////////////////////////////////////////////////////////
// Functions to fix Trello bugs:
//////////////////////////////////////////////////////////////////

var trello_put = function(rest_of_url, success, error) {
  $.ajax(
    {
      url: "https://api.trello.com/1/" + rest_of_url,
      type: "GET",
      data: {
              key: Trello.key,
              token: Trello.token,
              _method: "PUT"
            },
      dataType: "jsonp",
      success: success,
      error: error
    });

}

/*
var trello_put_post = function(rest_of_url, success, error) {
  $.ajax(
    {
      url: "https://api.trello.com/1/" + rest_of_url,
      type: "POST",
      data: {
              key: Trello.key,
              token: Trello.token,
              _method: "PUT"
            },
      dataType: "jsonp",
      success: success,
      error: error
    });


}
*/
