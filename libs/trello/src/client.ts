// URL to manage redirect_uri's for your devKey: https://trello.com/app-key
import debug from 'debug';
import {
  type PlatformSpecificTrelloLib,
  assertTrelloOrgs,
  assertTrelloBoards,
  assertTrelloCards,
  type TrelloList,
  assertTrelloLists} from './types.js';

const info = debug('af/trello#index:info');
export const defaultOrg = 'Ault Farms';

export type Client = ReturnType<typeof getUniversalClient>;
// Browser or Node passes the appropriate thing to this universal library.
// When you import the browser or node version, you'll use "getClient"
export function getUniversalClient(client: PlatformSpecificTrelloLib) {

  let orgid = '';
  async function connect({ org }: { org?: string }) {
    await client.waitUntilLoaded();
    await client.authorize();
    if (!org) org = defaultOrg;
    const orgs = await client.get('/members/me/organizations', { fields: 'id,name,displayName' });
    assertTrelloOrgs(orgs);
    for (const o of orgs) {
      if (o.displayName === org) {
        orgid = o.id;
        info('connect: Successfully connected to Trello and found organization with name', org);
        return;
      }
    }
    info('FAIL: Orgs returned from trello are:',orgs);
    throw new Error(`ERROR: Could not find organization with name ${org}`);
  }


  async function findBoardidByName(name: string): Promise<string> {
    await client.waitUntilLoaded();
    const boards = await client.get(`/organizations/${orgid}/boards`, { fields: 'id,name,pos' });
    assertTrelloBoards(boards);
    for (const b of boards) {
      if (b.name === name) return b.id;
    }
    throw new Error(`ERROR: could not find board with name ${name} in org ${orgid}`);
  };


  // Returns all the lists and cards, or only those that match the given listnames if provided
  async function findListsAndCardsOnBoard({ boardid, listnames }: { boardid: string, listnames?: string[] }): Promise<TrelloList[]> {
    await client.waitUntilLoaded();
    const cards = await client.get(`/boards/${boardid}/cards/open`, { fields: 'id,name,desc,idBoard,idList,pos,closed,desc,labels,dateLastActivity' })
    assertTrelloCards(cards);
    let lists = await client.get(`/boards/${boardid}/lists/open`, { fields: 'id,name,idBoard,pos' });
    // Keep only the lists we were asked for
    if (listnames) lists = lists.filter(l => listnames.find(n => n === l.name));
    // Have to assert here since the filter operation seems to confuse Typescript about lists being a TrelloBoard[]
    assertTrelloLists(lists);
    for (const c of cards) {
      const l = lists.find(l => l.id === c.idList);
      if (!l) continue; // one of the filtered-out lists
      if (!l.cards) l.cards = [];
      l.cards.push(c);
    }
    return lists;
  }

  async function saveNewCardAtBottomOfList({ name, desc, idList }: {name: string, desc?: string, idList?: string }) {
    await client.waitUntilLoaded();
    if (!desc) desc = '';
    await client.post('/cards', { idList, pos: 'bottom', name, desc });
  }

  // Used in the feed board to take an existing load number, fill it out, and move to the bottom of the delivered list
  async function updateExistingCardNameAndMoveToBottomOfList({ name, cardid, idList }: { cardid: string, name: string, idList: string }) {
    await client.waitUntilLoaded();
    await client.put(`/cards/${cardid}`, { name, idList, pos: 'bottom' });
  }

  return {
    ...client,
    connect,
    findBoardidByName,
    findListsAndCardsOnBoard,
    saveNewCardAtBottomOfList,
    updateExistingCardNameAndMoveToBottomOfList,
  };
}