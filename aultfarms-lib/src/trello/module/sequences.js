import _ from 'lodash';
import { state, sequence, CerebralError } from 'cerebral';
import { set } from 'cerebral/factories';
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
  ({trello}) => trello.authorize().catch(e => { e.message = 'Failed to authorize trello: '+e.message+JSON.stringify(e.stack); throw new errors.TrelloAuthorizeError(e) }),
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

// We will keep a promise for each board/list that we need to verify exists
// in order to prevent simulataneous accesses from creating duplicate boards/lists
// when they see that a board doesn't exist yet.
let initialized = { boards: {}, lists: {} }; 
export const loadList = sequence('trello.loadList', [
  ({props,trello}) => {
    let ret = {}; 

    // First get the board
    return Promise.try(() => {
      if (initialized.boards[props.boardName]) return initialized.boards[props.boardName]; // if this is a promise, then someone else is initializing or it's done already

      // Start by getting board, create if doesn't exist, save promise in "initialized":
      return initialized.boards[props.boardName] = trello.get('members/me/boards', { fields: 'name,id,closed' })
      .filter(b => b && !b.closed)
      .then(result => {
        const board = _.find(result, b => b.name === props.boardName);
        if (board) return board;
        console.log('Could not find board '+props.boardName+', creating it.');
        return trello.post('boards', { name: props.boardName}); // the result of this call is the board object itself
      });
    }).then(board => { ret.board = board })

    // Then get the labels:
    .then(() => trello.get(`boards/${ret.board.id}/labels`, { fields: 'id,name,color' }))
    .then(labels => { ret.labels = labels; })

    // Then get the list info:
    .then(() => {
      if (initialized.lists[props.listName]) return initialized.lists[props.listName];
      return initialized.lists[props.listName] = trello.get(`boards/${ret.board.id}/lists`, {fields:'name,id,closed,cards'})
      .filter(l => l && !l.closed)
      .then(result => {
        const list = _.find(result, l => l.name === props.listName);
        if (list) return list;
        console.log('Could not find list '+props.listName+', creating it.');
        return trello.post(`boards/${ret.board.id}/lists`, { name: props.listName}); // resolves to the list object itself
      });
    }).then(list => { ret.list = list })

    // Now setup the final return statement and catch:
    .then(() => ret)
    .catch(error => { error.message = 'Failed to get list '+props.listName+': '+error.message; throw new errors.TrelloGetError(error); });
  },

  // Now get the cards for this list:
  ({props,trello}) => {
    return trello.get('lists/'+props.list.id+'/cards', { fields: 'name,id,closed,desc,dateLastActivity,labels' })
    .filter(c => c && !c.closed)
    .then(result => ({ cards: result }))
    .catch(error => { error.message = 'Failed to get cards for list '+props.listName+': '+error.message; throw new errors.TrelloGetError(error); })
  },

  // Put everything into state:
  ({props,store,get}) => {
    store.set(state`trello.lists.${props.key}`, { 
      id: props.list.id, 
      name: props.list.name, 
      cards: props.cards,
      board: props.board,
      labels: props.labels,
    });
  },

]);

// props.card = {
//   id: 'only use if this card already exists',
//   name: 'the name to put',
//   idList: 'id of list for card, required no matter what',
// }
export const putCard = sequence('trello.putCard', [
  ({trello,props}) => Promise.try(() => {
    let url = 'cards/';
    if (!props.card.id) { // card does not exist, do a post
      return trello.post(url, { name: props.card.name, idList: props.card.idList })
    }
    url += props.card.id+'/'; // card already exists, do a put to that card
    return trello.put(url, { name: props.card.name, idList: props.card.idList })
  }).catch(err => { throw new errors.TrelloSaveError('Failed to save to card', err) }),
]);
