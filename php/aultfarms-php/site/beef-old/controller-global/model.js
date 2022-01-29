import _ from 'lodash';
import CerebralBaobab from 'cerebral-model-baobab';

var model = {
  trello: {
    dead: { 
      listid: '',
      cards: [ ],
    },      
    treatments: {
      listid: '',
      cards: [ ],
    },
    groups: {
      listid: '',
      cards: [ ],
    },
    raw: {
    },
  },
  dead: CerebralBaobab.Monkey({
    cursors: {
      d: [ 'trello', 'dead' ],
    },
    get(data) {
      console.log('dead.get: NOT IMPLEMENTED');
      return false;
    },
  }),
  treatments: CerebralBaobab.Monkey({
    cursors: {
      t: [ 'trello', 'treatments' ],
    },
    get(data) {
      console.log('treatments.get: NOT IMPLEMENTED');
      return false;
    },
  }),
  groups: CerebralBaobab.Monkey({
    cursors: {
      g: [ 'trello', 'groups' ],
    },
    get(data) {
      console.log('groups.get: NOT IMPLEMENTED');
      return false;
    },
  }),
};


// Merge in any other controller/module models:

// @ifdef DEV

model = {
};

// @endif

export default model;



