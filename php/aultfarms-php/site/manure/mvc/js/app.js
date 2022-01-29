var app = app || {};

$(function() { 

  // Create any static models:
  app.models = app.models || {};
  var models = app.models;

  app.models.authorization = new app.classes.models.AuthorizationModel();

  // Create main app view:
  app.views = app.views || {};
  var views = app.views;

  app.dbg("Creating app view");
  views.app_view = new app.classes.views.AppView({ authorization_model: app.models.authorization });

  // Trigger first authorization test.  When it's done, the main view's listeners
  // should pick up the thread and request data from Trello.
  models.authorization.checkAuthorize();

});

///////////////////////////////////////////////////
// Debugging:
///////////////////////////////////////////////////

app.dbg = function(args_to_print) {
  if (window.location.href.indexOf("debug") < 1) { return; }
  if (typeof app.dbg.first_run === 'undefined') {
    app.dbg.first_run = true;
    $("#container-debug").show();
    $("#container-debug").append("<hr><b><span class=\"message\">DEBUGGING:</span></b><br><br>");
  }
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
  $("#container-debug").append(str + "<br>");
  console.log("DEBUG: " + str );
}


