var debug = function(args_to_print) {
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
  $("#d_debug").append("<pre>" + str + "</pre><br>");
  console.log("Debugging: msg = " + str);
}

var userMsg = function(args_to_print) {
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
  $("#d_msg").append(str);
}

var clearUserMsg = function() {
  $("#d_msg").html("");
}

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
      debug("cache.get: successfully received data from trello.");
      cache.data[id] = sanitizer(result);
      callback(cache.data[id]);
    }, function(err) {
      if (err.status == 401) { // Unauthorized
        debug("cache.get: 401 Unauthorized failure for (id, trello_path) = (" + id + "," + trello_path + ")");
        Trello.deauthorize();
        updateLoggedIn();
      } else {
        debug("cache.get: Unhandled error for (id, trello_path) = (" + id + "," + trello_path + ").  Err obj = " + JSON.stringify(err));
      }
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
    for (var idx in arr) {
      var val = arr[idx];
      arr[idx] = new cache.DataItem(val, val);
    }
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
  for(var idx in data) {
    var val = data[idx];
    if (!val) return true; // continue in callback
    cmp_str = val.data.toUpperCase();
    for(var fidx in filters) {
      var filter_str = filters[fidx];
      if (cmp_str.indexOf(filter_str.toUpperCase()) >= 0) {
        // One of the filter strings matches
        arr[idx] = data[idx];
        break; // break from callback on each for filters
      }
    }
  }
  return arr;
};

var getLists = function(boardid, form_id, callback) {
  trello_path = "boards/" + boardid + "/lists";
  sanitizer = function(raw_data) {
    var arr = [];
    //$.each(raw_data, function(idx, val) {
    for(var idx in raw_data) {
      var val = raw_data[idx];
      if (val.id != consts.web_controls) {
        arr[idx] = new cache.DataItem(val.id, val.name);
      }
    }
    return arr;
  }
  cache.get(boardid, trello_path, sanitizer, function(data) {
    callback(arrayToSelect(data, form_id));
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

// From http://www.mredkj.com/javascript/nfbasic.html
var addCommasToInt = function(nStr) {
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
};

var getCurrentDataItem = function(selector, trello_id) {
  id = $(selector).children(":selected").val();
  arr = cache.get(trello_id);
  for (idx in arr) {
    if (arr[idx].id == id) {
      return arr[idx];
    }
  }
};

var inArrayOfDataItems = function(needle, haystack) {
  debug("inArrayOfDataItems:needle ="+JSON.stringify(needle)+", haystack="+JSON.stringify(haystack));
  for (var idx in haystack) {
    if (haystack[idx].id == needle.id) {
      return idx; // break
    }
  };
  return -1;
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

///////////////////////////////////////////////////
// Functions for handling login, etc.:
///////////////////////////////////////////////////

var setupLoginLogoutRefresh = function() {

  // First try to authorize to Trello without the redirect:
  Trello.authorize({
    interactive: false, // This disables the redirect, just stores the key if it's in the URL
    persist: true,
    scope: {
      write: true,
      read: true
    },
    expiration: "never",
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
      type: "redirect", 
      persist: true,
      success: onAuthorize,
      expiration: "never",
      scope: { write: true, read: true } 
    });
  });

  $("#refresh_link").click(refreshLinkClicked);
};

var updateLoggedIn = function() {
  var isLoggedIn = Trello.authorized();

  // Toggle visibility of div's based on login status
  $("#d_not_logged_in").toggle(!isLoggedIn);
  $("#d_logged_in").toggle(isLoggedIn);

  // If we're logged in, populate all the comboboxes
  if (isLoggedIn) {
    populateFields(); // defined in app's js file
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

var refreshLinkClicked = function() {
  clearUserMsg();
  cache.reset();
}


