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


var debug = function(args_to_print) {
  divPrint("#d_debug", args_to_print);
}


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

  // Put in the link to look at the Feed board in Trello:
  $("#d_trello_link").html("<a href=\"https://trello.com/board/" + consts.feed_boardid + "\">View Feed Board in Trello</a>");

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

    // Populate the drivers:
    populateDrivers();
    populateSources();
    populateDestinations();
    populateAvailableLoadNumbers();
    populateDate();
    populateNetWeight();
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

// Return a filtered version of data: only include values which match
// any one of the filters.
var filterDataItems = function(data, filters, all) {
  if (all) return data;
  var arr = [];
  $.each(data, function(idx, val) {
    if (!val) return true; // continue in callback
    cmp_str = val.data.toUpperCase();
    $.each(filters, function(jdx, filter_str) {
      if (cmp_str.indexOf(filter_str) >= 0) {
        // One of the filter strings matches
        arr[idx] = data[idx];
        return false; // break from callback on each for filters
      }
    });
  });
  return arr;
};

//////////////////////////////////////////////////////
// Populating controls:
//////////////////////////////////////////////////////

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
    if (numbers.length < 1) {
      $("#d_load_numbers").html("Available #'s: None for this source");
    } else {
      $("#d_load_numbers").html("Available #'s: " + arrayToSelect(numbers, "s_load_numbers"));
    }
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
}

var populateDate = function() {
  $("#d_date").html("Date: <input type=\"date\" id=\"i_date\" name=\"i_date\" value=\"" + today() + "\"/>");
}

var populateNetWeight = function() {
  $("#d_net_weight").html("Net Lbs: <input type=\"number\" id=\"i_net_weight\" name=\"i_net_wieght\" />");
}

//////////////////////////////////////////////////
// Creating the card:
//////////////////////////////////////////////////

/*var addCommas = function(str) {
  var val = parseInt(str);
  if (val < 1000) return val;
  var top = val / 1000;
  var bot = val - top;
  return top + "," + bot;
}*/

// From http://www.mredkj.com/javascript/nfbasic.html
function addCommas(nStr)
{
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
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
  name += addCommas(cur_card.net_weight) + " lbs - ";
  name += cur_card.destination.data + " - ";
  name += cur_card.driver.data;

  var error = function(msg) { debug("ERROR: ", error); }
  $("d_logged_in").scrollTop();
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
      }, error);
    }, error);
  }, error);
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
 
  c.load_number = getCurrentDataItem("#s_load_numbers", consts.available_load_numbers);
  c.destination = getCurrentDataItem("#s_destination", consts.destinations);
  c.net_weight = $("#i_net_weight").val();
  c.date = $("#i_date").val().toString().trim();
  c.driver = getCurrentDataItem("#s_driver", consts.drivers);

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

  if (inArrayOfDataItems(c.load_number, cache.get(consts.available_load_numbers)) < 0) {
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
