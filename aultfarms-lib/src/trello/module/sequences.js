import _ from 'lodash';
import { state, sequence, CerebralError } from 'cerebral';
import { set } from 'cerebral/factories';
import Promise from 'bluebird';
import * as errors from './errors';

const CARD_FIELDS = 'name,id,closed,desc,dateLastActivity,labels,idList';

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
    return trello.get('lists/'+props.list.id+'/cards', { fields: CARD_FIELDS })
    .filter(c => c && !c.closed)
    // Save the state path for this card inside the card itself so we can easily update later
    .then(cards => _.keyBy(
      _.map(cards, c => {
        c.statePath = `trello.lists.${props.key}.${c.id}`;
        return c;
      }), c => c.id)
    )
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

// All this does is refresh the card object in-place.  It does not check that
// it is still in the same board.
export const reloadOneCard = sequence('trello.reloadOneCard', [
  ({trello,props,store,get}) => {
    if (!props.card || !props.card.id) return;
    return trello.get(`cards/${props.card.id}`, { fields: CARD_FIELDS })
    .then(card => {
      // Find the original place in Trello part of the state:
      const lists = get(state`trello.lists`);
      const list = _.find(lists, (list,listname) => (list.id === card.idList) );
      const statePath = `trello.lists.${list.name.toLowerCase()}.cards.${card.id}`;
      // Now change it in the state:
      card.statePath = statePath;
      store.set(state`${statePath}`, card);
      return { card };
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
  reloadOneCard,
]);

// props.id, props.idLabel
export const addLabelToCard = sequence('trello.addLabelToCard', [
  ({trello,props}) => { trello.post(`cards/${props.card.id}/idLabels`, { value: props.idLabel }) },
  // Get the board name that goes with this card
  reloadOneCard,
]);
