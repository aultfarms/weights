// Pulled this from example at http://jsfiddle.net/nNesx/.

////////////////////////////////////////////////////
// Utilities:
////////////////////////////////////////////////////

var debug = function(args_to_print) {
  args = Array.prototype.slice.call(arguments);
  str = "";
  $.each(args, function(idx, str_or_obj) {
    if (typeof(str_or_obj) == "string") {
      str += str_or_obj;
    } else {
      str += JSON.stringify(str_or_obj, false, "  ");
    }
  });
  $("#d_debug").append(str);
}

var userMsg = function(args_to_print) {
  args = Array.prototype.slice.call(arguments);
  str = "";
  $.each(args, function(idx, str_or_obj) {
    if (typeof(str_or_obj) == "string") {
      str += str_or_obj;
    } else {
      str += JSON.stringify(str_or_obj, false, "  ");
    }
  });
  $("#d_msg").append(str);
}

var clearUserMsg = function() {
  $("#d_msg").html("");
}


////////////////////////////////////////////////////
// Setup:
////////////////////////////////////////////////////

consts = {
      field_work_boardid: "51829dacc580fe1a07001743", // Board in Ault Farms org.
            web_controls: "5189d89f32b1eb207100093d", // List in Field Work 2013 board
                  fields: "5189d9e163d062bc0800189f", // Card in Web Controls
                 drivers: "5012b94458bd2a9f549f7188", // Card in Web Controls
          corn_varieties: "5189d9c384d96d76740017bb", // Card in Web Controls
          bean_varieties: "5189de37633e5889080019a1", // Card in Web Controls
                   crops: "5189dd775817e22c6a001905", // Card in Web Controls
      bean_planting_list: "5189d89f32b1eb207100093d", // List in Field Work 2013 board
      corn_planting_list: "51896822cfe11146710001d2", // List in Field Work 2013 board
};

$(document).ready(function() {
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

  // Put in the link to look at the Field Work board in Trello:
  $("#d_trello_link").html("<a href=\"https://trello.com/board/field-work-2013/51829dacc580fe1a07001743\">View Field Work 2013 Board in Trello</a>");

  // Update the DOM based on login status
  updateLoggedIn();
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
    $("#d_driver").text("Loading boards...");
    populateFields();
//    populateVarieties();
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

//////////////////////////////////////////////////////
// Functions for caching data in-memory:

var cache = {};
cache.data = {};
cache.DataItem = function(id, data) {
  this.id = id; this.data = data;
}

// Get some data from Trello, pass it through sanitizer(), store in cache.
cache.get = function(id, trello_path, sanitizer, callback) {
  if (arguments.length == 1) { // only asked for in-memory version
    return cache.data[id];
  }
  if (cache.data[id]) {
    callback(cache.data[id]);
  } else {
    Trello.get(trello_path, function(result) {
      cache.data[id] = sanitizer(result);
      callback(cache.data[id]);
    });
  }
};

cache.reset = function() {
  cache.data = {};
  updateLoggedIn();
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

var getWebControl = function(id, form_id, callback) {
  // If we don't have the paticular data in memory, pull it from Trello
  trello_path = "card/" + id + "/desc";
  // Should return data as an array of cache.DataItem objects
  sanitizer = function(raw_data) {
    var arr = splitString(";", raw_data._value);
    $.each(arr, function(idx, val) {
      arr[idx] = new cache.DataItem(val, val);
    });
    return arr;
  }
  cache.get(id, trello_path, sanitizer, function(data) {
    callback(arrayToSelect(data, form_id));
  });
};

var getLists = function(boardid, form_id, callback) {
  trello_path = "boards/" + boardid + "/lists";
  sanitizer = function(raw_data) {
    var arr = [];
    $.each(raw_data, function(idx, val) {
      if (val.id != consts.web_controls) {
        arr[idx] = new cache.DataItem(val.id, val.name);
      }
    });
    return arr;
  }
  cache.get(boardid, trello_path, sanitizer, function(data) {
    callback(arrayToSelect(data, form_id));
  });
}

// Return a filtered version of data: only include values which match
// any one of the filters.
var filterDataItems = function(data, filters, all) {
  if (all) return data;
  var arr = [];
  $.each(data, function(idx, val) {
    if (!val) return true; // continue in callback
    cmp_str = val.data.toUpperCase();
    $.each(filters, function(jdx, filter_str) {
      if (cmp_str.indexOf(filter_str.toUpperCase()) >= 0) {
        // One of the filter strings matches
        arr[idx] = data[idx];
        return false; // break from callback on each for filters
      }
    });
  });
  return arr;
};

//////////////////////////////////////////////////////
// Parsing data from existing cards:
//////////////////////////////////////////////////////

var findCardInList = function(list_id, callback) {
  trello_path = "lists/" + list_id + "/cards";
  sanitizer = function(raw_data) {
    var arr = [];
    for (i in raw_data) {
      var val = raw_data[i];
      if (val.name.match(field_name)) {
        return new cache.DataItem(val.id, JSON.stringify(val));
      }
    }
    return new cache.DataItem("NOT FOUND";
  };
  cache.get(list_id, trello_path, sanitizer, function(data) {
    return callback(data); // this is the string JSON for the card.
  });
}

var findAndParseFieldCard(field_name, callback) {
  // Get all the cards from both boards (beans and corn), and
  // find the first one that matches this field.
  findCardInList(field_name, consts.corn_planting_list, function(card_json) {
    if (card_json == "NOT FOUND") {
      findCardInList(field_name, consts.bean_planting_list, function(card_json) {
        if (card_json == "NOT FOUND") {
          return callback(null); // card does not exist
        }
        return call
      });
    }
  });
  
}


//////////////////////////////////////////////////////
// Populating controls:
//////////////////////////////////////////////////////

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

  // If a card for this field exists, edit it instead of creating a new one:
  var user_msg, trello_path, trello_function;
  if (cur_card.id) {
    userMsg("Modifying existing card for field " + cur_card.field);
    trello_put("cards/"+cardid+



    trello_path = "cards/" + cur_card.id;
    trello_function = Trello.put;
  } else {
    user_msg = "Creating new card for field " + cur_card.field;
    trello_path = "/cards
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
