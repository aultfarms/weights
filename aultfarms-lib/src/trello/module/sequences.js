import _ from 'lodash';
import { sequence, CerebralError } from 'cerebral';
import { state } from 'cerebral/tags';
import { set } from 'cerebral/operators';
import Promise from 'bluebird';
import * as errors from './errors';

// For some reason cerebral seems to trigger these dumb warnings
Promise.config({
  // Enables all warnings except forgotten return statements.
  warnings: {
    wForgottenReturn: false
  }
});

//-----------------------------------------------
// authorize and deauthorize
export const authorize = [
  ({trello}) => trello.authorize().catch(e => { throw errors.TrelloAuthorizeError(e) }),
  set(state`trello.authorized`, true),
];

export const deauthorize = [
  set(state`trello.authorized`, false),
  sequence('deauthorize->authorize', authorize),
];


//-----------------------------------------------------------
// loadList sequence: given a board and list name in props, 
// load it into the state from Trello
// props = { boardName, listName, key } the list's data will be put at trello.lists.<key>
let initialized = false; // this is false until it is a promise that will resolve when first attempt finished initialization
export const loadList = [
  ({props,trello}) => {
    if (initialized) return initialized; // if this is a promise, then someone else is initializing or it's done already
    let ret = {};

    // Start by getting board, create if doesn't exist, save promise in "initialized":
    initialized = trello.get('members/me/boards', { fields: 'name,id,closed' })
    .filter(b => b && !b.closed)
    .then(result => {
      const board = _.find(result, b => b.name === props.boardName);
      if (!board) {
        console.log('Could not find board '+props.boardName+', creating it.');
        return trello.post('boards', { name: props.boardName})
        .then(result => { ret.board = board; });
      }
      ret.board = board;

    // then get the labels:
    }).then(() => trello.get(`boards/${props.board.id}/labels`, { fields: 'id,name,color' }))
    .then(labels => { ret.labels = labels; })

    // then get the list info:
    .then(() => trello.get('boards/'+props.board.id+'/lists', {fields:'name,id,closed'}))
    .filter(l => l && !l.closed)
    .then(result => {
      const list = _.find(result, l => l.name === props.listName);
      if (!list) {
        console.log('Could not find list '+props.list+', creating it.');
        return trello.post('boards/'+props.board.id+'/lists', { name: props.listName})
        .then(list => { ret.list = list; });
      }
      ret.list = list;
    }).then(() => ret)
    .catch(error => { throw new TrelloGetError('Failed during list initialization: '+error); });
    // Don't forget to return the actual promise so cerebral waits:
    return initialized;
  },

  // Now get the cards for this list:
  ({props,trello}) => trello.get('lists/'+props.list.id+'/cards', { fields: 'name,id,closed,desc,dateLastActivity,labels' })
    .filter(c => c && !c.closed)
    .then(result => ({ cards: result }))
    .catch(error => { throw TrelloGetError('Failed to get cards for list '+list+': '+error) }),

  // Put everything into state:
  ({props,state}) => {
    state.set(`trello.lists.${props.key}`, { 
      id: props.list.id, 
      name: props.list.name, 
      cards: props.cards,
      board: props.board,
      labels: props.labels,
    });
  },

];

// props.card = {
//   id: 'only use if this card already exists',
//   name: 'the name to put',
//   idList: 'id of list for card, required no matter what',
// }
export const putCard = [
  ({trello,props}) => {
    let method = trello.post;
    let url = 'cards/';
    if (props.card.id) { // card already exists, put instead of post
      method = trello.put; 
      url += props.card.id+'/';
    }
    return method(url, { name: props.card.name, idList: props.card.idList })
    .catch(err => { throw errors.TrelloSaveError(err) });
  }
];
