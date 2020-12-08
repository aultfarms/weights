(async () => {
// This is a quick script to sum up the total bushels in the grain hauling board.
const Promise = require('bluebird');
Promise.longStackTraces();
const Trello = require('node-trello');
const _ = require('lodash');
const moment = require('moment');
const numeral = require('numeral');

const token = require('/Users/aultac/.trello/token.js');

const t = Promise.promisifyAll(new Trello(token.devKey, token.token));

async function getIdsForListBoardOrg({ list, board, org }) {
  const orgs = await t.getAsync('/1/members/me/organizations', { fields: 'name,id,idBoards' });
  const idOrganization = orgs.find(o => o.name===org)?.id;
  if (!idOrganization) {
    console.log('ERROR: failed to find org with name ', org);
    console.log('The orgs list is: ', orgs);
    return { cards: [] };
  }

  const boards = await t.getAsync('/1/members/me/boards', { fields: 'name,id,idOrganization' });
  const idBoard = boards.find(b => b.name===board && b.idOrganization===idOrganization)?.id;
  if (!idBoard) {
    console.log('ERROR: found org with name ', org, ' at id ', idOrganization, ', but failed to find board with name ', board);
    console.log('The boards list is: ', boards);
    return { idOrganization, cards: [] };
  }

  const lists = await t.getAsync(`/1/boards/${idBoard}/lists`, { fields: 'name,id,idBoard' });
  const idList = lists.find(l => l.name===list && l.idBoard===idBoard)?.id;
  if (!idList) {
    console.log('ERROR: found org with name ', org, ', and found board with name ', board, ' at id ', idBoard, ', but failed to find list with name ', list);
    console.log('The lists list is: ', lists);
    return { idOrganization, idBoard, cards: [] };
  }

  return { idOrganization, idBoard, idList };
};

async function getCardsByListBoardOrg({ list, board, org, mapper }) {
  const ids = await getIdsForListBoardOrg({ list, board, org });
  let cards = (await t.getAsync(`/1/lists/${ids.idList}/cards`, { fields: 'name,id,closed,idList' }));
  if (mapper) cards = cards.map(mapper);
  return {...ids, cards };
}


function mapCard(c) {
  try {
    let rest = c.name.trim();
    let matches = rest.match(/^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}): *(.*)$/);
    const date = moment(matches[1], 'YYYY-MM-DD');
    return {
      date,
      card: c,
    };
  } catch (e) {
    console.log('ERROR ON CARD: ', c);
    console.log('Error was: ', e);
    throw e;
  }
}

const dest = await getIdsForListBoardOrg({ list: 'Treatments', board: 'Livestock', org: 'aultfarms2019' });
if (!dest.idList || !dest.idBoard || !dest.idOrganization) {
  throw new Error('Stoppoing because we do not have all the dest ids');
}
const src = await getCardsByListBoardOrg({ list: 'Treatments', board: 'Livestock', org: 'aultfarms', mapper: mapCard });
if (!src.idList || !dest.idBoard || !dest.idOrganization) {
  throw new Error('Stoppoing because we do not have all the src ids');
}


const cardyear = 2019;
let count = 0;
let total = 0;
await Promise.filter(src.cards, c => !c.closed)
.filter(c => c.date.year() === cardyear)
.tap(cards => total = cards.length)
.map(async c => {
  const result = await t.putAsync(`/1/cards/${c.card.id}`, { idList: dest.idList, idBoard: dest.idBoard });
  console.log(`Moved card ${count++} of ${total}: `, c.card.name, ' to list ', dest.idList);
  await Promise.delay(10);
}, { concurrency: 1 });

})()
