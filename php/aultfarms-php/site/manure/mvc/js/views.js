var app = app || {};

(function() {

  // Could be initialized in another class file
  app.classes = app.classes || {};

  app.classes.views = {};
  var views = app.classes.views;

  views.AppView = Backbone.View.extend({
    // Backbone stuff:
    el: "container-app",
    model: null,
    
    // My stuff:
    template: null,
   
    initialize: function(arg) {
      var self = this;

      // Create the main view, hide it until authorization is done.
      app.views.main_view = new app.views.MainView({ authorization_model: arg.authorization_model});
      app.views.main_view.hide();
    
      // Create the card updating status view, hide it until needed:
      app.views.card_status_view = new app.views.CardStatusView();
      app.views.card_status.hide();

      // Create the authorization view:
      app.views.authorization_view = new app.views.AuthorizationView({ model: arg.authorization_model });

      self.render();
    },

    render: function() {
      app.dbg("render!");
    },
  });

  views.MainView = Backbone.View.extend({
    el: "#container-main",
   
    authorization_model: null,

    initialize: function(arg) {
      var self = this;

      // Setup the models:
      self.authorization_model = arg.authorization_model;

      // Setup the sub-views:
      
      // Wire up events:
      self.listenTo(self.authorization_model, "change", self.authorizationChanged);
    },

    authorizationChanged: function() {
      var self = this; 
      self.render();
      if (self.authorization_model.get("logged_in")) {
        // Trigger re-load of board data:
      }
    },

    render: {

    },

})();
