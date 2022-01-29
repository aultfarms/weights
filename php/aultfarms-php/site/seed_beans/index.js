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
        aultfarms_listid: "5230d6a4829a4d045e0010bb", // Board in Ault Farms org.

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
    $("#d_sum").text("Loading cards...");

    // Populate the drivers:
    populateSum();
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
// Populating controls:
//////////////////////////////////////////////////////

var cardToTicket = function(card) {
  // format: date: 000.00 bu CROP.  Location - Tkt #the_number - driver
  var regexp = /^([^:]+): +([0-9,]+(.[0-9]+)?) +bu +([^.]+)\. +([^-]+) +- +Tkt +#([0-9\-]+) +- +(.*)/;
  var matches = regexp.exec(card.name.trim());
  if (!matches) { 
    console.log("WARNING: CARD DID NOT MATCH: ", card.name);
    userMsg("WARNING: CARD DID NOT MATCH:", JSON.stringify(card.name));
    return null;
  }
  var ret = {
    date: matches[1],
    bushels: +(matches[2]).replace(",",""),
    crop: matches[4],
    location: matches[5],
    ticket: matches[6],
    driver: matches[7],
  }
  return ret;
};

var populateSum = function() {
  $("#d_sum").html("Loading sum...");
  $("#d_categorized_sum").html("Loading categorized sum...");

  Trello.get("lists/"+consts.aultfarms_listid+"/cards", function(data) {
    var sum = 0;
    var num_loads = 0;
    var html = "<table><tr><th>Date</th><th>Bushels</th><th>Total</th><th>Card</th></tr>";
    for (var i in data) {
      var ticket = cardToTicket(data[i]);
      if (!ticket) {
        debug("invalid ticket!");
        continue;
      }
      if (ticket.crop != "BEANS") continue; // only looking at BEANS today
      num_loads++;
      sum += ticket.bushels;
      var fsum = sum.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      var famt = (ticket.bushels).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      html += "<tr><td>"+ticket.date+"</td><td class=\"amt\">"+famt+"</td><td class=\"sum\">"+fsum+"</td><td class=\"card\">"+data[i].name+"</td></tr>";
//      html += "<tr><td colspan=3><hr></td></tr>";
    }
    html += "</table><br/>";
    console.log("sum = ", sum);
    // Found this: http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
    var formatted_sum = sum.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    $("#d_sum").html("Total bushels: " + formatted_sum + " bu on " + num_loads + " loads/tickets.<br/>" + html);


    var categories = {
      'Concrete-Supplies': {
        desc: "contains \"Kuert\"",
        re: [ /kuert/i ],
        sum: 0,
        cards: [],
      },
      'Concrete-Labor': {
        desc: "contains \"Todd Brooks\"",
        re: [ /(todd)? *brooks/i, /professional *concrete/i],
        sum: 0,
        cards: [],
      },
      Buildings: {
        desc: "contains \"Martin\"",
        re: [ /martin/i ],
        sum: 0,
        cards: [],
      },
      'Excavating-Tile': {
        desc: "contains \"Slisher\" or \"tile\"",
        re: [ /tile/i, /slisher/i ],
        sum: 0,
        cards: [],
      },
      'Other': {
        desc: "everything else",
        re: [ /.*/ ],
        sum: 0,
        cards: [],
      },
    };

    var categoryMatchesCard = function(card, cat) {
      for (var i in cat.re) {
        if (card.match(cat.re[i])) {
          return true;
        }
      }
      return false;
    };

    for (var i in data) {
      var regexp = /\$[af]?([0-9,.]+)/g;
      while (1) {
        var card_name = data[i].name;
        var amounts = regexp.exec(card_name);
        if (!amounts) break;
        var amt = amounts[1].replace(",", "");
       
        // Walk through all the possible categories, check with regular expressions
        for (var cx in categories) {
          var c = categories[cx];
          if (categoryMatchesCard(card_name, c)) {
            console.log("Adding amt ", amt, " (", +amt, ") to category " + cx + " sum, sum = ", c.sum);
            c.sum += +amt;
            c.fsum = "$" + c.sum.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            c.cards.push( {
              card_name: card_name,
              famt: "$" + (+amt).toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
              fsum: c.fsum,
            });
            break; // stop on first match
          }
        }
      }
    }

    // Print the categories table:
    var html = "";
    for (var cx in categories) {
      var cat = categories[cx];
      if (typeof cat.fsum === 'undefined') {
        cat.fsum = "$0";
      }
      html += "<h3>"+cx+" Category (" + cat.desc + "):<br/> " + cat.fsum + " total spent on " + cat.cards.length + " cards.</h3>";
      html += "<table><tr><th>Amount</th><th>Sum</th><th>Card</th></tr>";
      for (var ix in cat.cards) {
        var card = cat.cards[ix];
        html += "<tr><td class=\"amt\">"+card.famt+"</td><td class=\"sum\">"+card.fsum+"</td><td class=\"card\">"+card.card_name+"</td></tr>";
        html += "<tr><td colspan=3><hr></td></tr>";
      }
      html += "</table><br>";
    }
    
    $("#d_categorized_sum").html(html);

  });


};


var refreshLinkClicked = function() {
  populateSum();
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
