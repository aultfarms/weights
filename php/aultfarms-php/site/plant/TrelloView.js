var TrelloView = {
  viewid: "",
  setViewId: function(new_viewid) {
    var self = this;
    self.viewid = new_viewid;
  },

  hide: function() {
    var self = this;
    $(self.viewid).hide();
  },

  show: function() {
    var self = this;
    $(self.viewid).show();
  },

  userMsg: function(msg) {
    var self = this;
    $(self.viewid).append("<font color=\"red\">"+msg+"</font><br/>");
  },
  clear: function() {
    $(self.viewid).html("");
  },

  chooseBoard: function(boards_list, callback) {
    var self = this;
    $(self.viewid).html("You have multiple Planting boards.  Please choose one to use:<br/>");

    // Create the select list:
    var str = "<select id=\"trelloview_boardchoice\">";
    str += "<option name=\"not_a_choice\">Please select board...</option>";
    for (var i in boards_list) {
      var b = boards_list[i];
      str += "<option value=\""+b.id+"\">"+b.organization.name+ " - "+b.name+"</option>";
    }
    str += "</select><br/>";
    $(self.viewid).append(str);

    // Setup the callback to return the chosen board and hide this div:
    $("#trelloview_boardchoice").on('change', function() {
      self.clear();
      self.hide();
      return callback($("#trelloview_boardchoice").val());
    });

    // Show the TrelloView div:
    return self.show();
  },

};
