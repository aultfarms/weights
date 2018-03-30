import moment from 'moment';
import _ from 'lodash';
import { set } from 'cerebral/operators';
import { sequence, CerebralError } from 'cerebral';

import { tagStrToObj } from '../../util/tagHelpers';
import * as trello from '../../trello/module/sequences';


//---------------------------------------------------------------------
// fetch all dead records:
const deadCardToRecord = c => {
  if (!c) return null;
  const name = c.name;
  let matches = name.match(/^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}):?(.*)$/);
  const day = matches[1];
  let tags_and_pens_str = matches[2];
  // Ditch anything in parentheses:
  tags_and_pens_str = tags_and_pens_str.replace(/\(.*\)/g,'');
  let tags_and_pens = tags_and_pens_str.match(/([A-Za-z']+ ?([0-9]+)?)/g);
  tags_and_pens = _.map(tags_and_pens, tp => tp.trim());
  tags_and_pens = _.map(tags_and_pens, tp => ( tp==='NT' ? 'NOTAG1' : tp));
  // eliminate everything that isn't just tags
  let tags = _.filter(tags_and_pens, t => 
    !t.match(/^[NSB][0-9S]{1,2}$/i) && // N1, NS, S1, B3
    !t.match(/^OB[SN]?[NS]?$/) && // OBS, OBN, OB, OBNS
    !t.match(/^HB$/i) &&
    !t.match(/^HEIFER$/i) &&
    !t.match(/^DRY( ?(LOT|COW))?$/i) && 
    !t.match(/^DAIRY$/i) && 
    !t.match(/^APRIL'?S?$/i) && 
    !t.match(/^WOODS$/i) &&
    !t.match(/^BARN ?[1-3]$/i) &&
    !t.match(/^dead/i) &&
    !t.match(/^total/i) && 
    !t.match(/^and/i)
  );
  // fixup bad tags:
  tags = _.map(tags, t=>t.toUpperCase().replace(/ /g,''));
  tags = _.map(tags, t=>(t === 'NOTAG' ? 'NOTAG1' : t));
  // parse all the tag strings into tag objects
  tags = _.map(tags, tagStrToObj);
  return {
    date: day,
    tags: tags,
    id: c.id,
    idList: c.idList,
    cardName: c.name, 
    dateLastActivity: c.dateLastActivity
  };
};

export const fetch = sequence('dead.fetch', [
  () => ({ boardName: 'Livestock', listName: 'Dead', key: 'dead' }),
  // get the cards
  trello.loadList,
  // convert all props.cards to records:
  ({props,state}) => state.set('dead.records', _.map(props.cards, deadCardToRecord)),
]);


