var PlantingAppModel = Object.create(Object, {
  drivers: [],
  fields: [],
  varieties: [],
  crops: [],
  records:{},

  // load takes whatever is in localStorage and 
  // puts it into this model
  load: function() {
    var self = this;
    var stored = JSON.parse(localStorage["aultfarms.planting"]);
    for (var i in stored) {
      self[i] = stored[i];
    }
  },

  save: function() {
    var self = this;
    localStorage["aultfarms.planting"] = JSON.stringify(self);
  },

  // init() is called at the end of this file to initialize the models
  // with what is currently stored in localStorage.
  init: function() {
    var self = this;
    self.load();
  },
};

PlantingAppModel.init();

