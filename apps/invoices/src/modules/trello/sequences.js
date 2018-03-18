import _ from 'lodash';
import { sequence, CerebralError } from 'cerebral';
import { state } from 'cerebral/tags';
import { set } from 'cerebral/operators';
import Promise from 'bluebird';
// For some reason cerebral seems to trigger these dumb warnings
Promise.config({
  // Enables all warnings except forgotten return statements.
  warnings: {
    wForgottenReturn: false
  }
});

class TrelloExistsError    extends CerebralError {};
class TrelloAuthorizeError extends CerebralError {};

//-----------------------------------------------
// wait until Trello lib is loaded:
export const waitTrelloExists = [
  ({trello}) => new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      if (trello.isLoaded()) return resolve();
      if (count++ > 50) return reject(new TrelloExistsError('Could not load Trello client library'));
      setTimeout(check, 250);
    };
    return check();
  }),
];

//-----------------------------------------------
// authorize and deauthorize
export const authorize = [
  sequence('authorize->waitTrelloExists', waitTrelloExists),
  ({trello}) => trello.authorize().catch(e => { throw new TrelloAuthorizeError(e) }),
  set(state`trello.authorized`, true),
];

export const deauthorize = [
  sequence('deauthorize->waitTrelloExists', waitTrelloExists),
  set(state`trello.authorized`, false),
  sequence('deauthorize->authorize', authorize),
];


//-----------------------------------------------------------
// loadList sequence: given a board and list name in props, 
// load it into the state from Trello
// props = { boardName, listName, key } the list's data will be put at trello.lists.<key>
export const loadList = [
  sequence('loadList->waitTrelloExists', waitTrelloExists),
  sequence('loadList->authorize', authorize),

  // Find board, create if it doesn't exist
  ({props,trello}) => trello.get('members/me/boards', { fields: 'name,id,closed' })
    .filter(b => b && !b.closed)
    .then(result => {
      const board = _.find(result, b => b.name === props.boardName);
      if (board) return board;
      console.log('Could not find board '+props.boardName+', creating it.');
      return trello.post('boards', { name: props.boardName });
    }).then(result => { return { board: result } }), // should go into props for next action

  // Get the labels for the board and add them for this list
  ({props,trello}) => trello.get(`boards/${props.board.id}/labels`, { fields: 'id,name,color' })
    .then(labels => { return { labels } }),

  // Find list now that we know board, create if it doesn't exist
  ({props,trello}) => trello.get('boards/'+props.board.id+'/lists', {fields:'name,id,closed'})
    .filter(l => l && !l.closed)
    .then(result => {
      const list = _.find(result, l => l.name === props.listName);
      if (list) return list;
      console.log('Could not find list '+props.listName+', creating it.');
      return trello.post('boards/'+props.board.id+'/lists', { name: props.listName });
    }).then(result => { return { list: result } }),

  // Now get the cards for this list:
  ({props,trello}) => trello.get('lists/'+props.list.id+'/cards', { fields: 'name,id,closed,desc,dateLastActivity,labels' })
    .filter(c => c && !c.closed)
    .then(result => { return { cards: result } }),

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


