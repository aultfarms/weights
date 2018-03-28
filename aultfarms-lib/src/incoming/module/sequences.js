import _ from 'lodash';
import { set } from 'cerebral/operators';
import { sequence, CerebralError } from 'cerebral';

import { tagStrToObj } from '../../util/tagHelpers';
import * as trello from '../trello/sequences';


//---------------------------------------------------------------------
// fetch all incoming records:
const incomingCardToRecord = c => {
  if (!c) return null;
  const name = c.name;
  let matches = name.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}):? *([^;]+);(.*)$/);
  const ret = {};
  ret.date = matches[1];
  ret.groupname = matches[2];
  let rest = matches[3];
  const parts = rest.split(';');
  _.each(parts, p => {
    const [propname,propval] = p.trim().split(':');
    ret[propname.toLowerCase().trim()] = propval.trim();
  });

  // If there are tag range(s), parse that out as well
  if (ret.tags) {
    ret.tags = ret.tags.replace(/ /g,''); // get rid of any spaces
    ret.tag_ranges = _.reduce(ret.tags.split(','), (acc,r) => { // each range turns into 1 or 2 objects depending on color split
      const [start,end] = _.map(r.split('-'), tagStrToObj); // map start and end into objects
      if (start.color !== end.color) {
        acc.push({ start, end: { color: start.color, number: 1000 } });
        acc.push({ start: { color: end.color, number: 1 }, end });
        return acc;
      }
      acc.push({start,end});
      return acc;
    },[]);
  }
  ret.id = c.id;
  ret.idList = c.idList;
  ret.cardName = c.name; 
  ret.dateLastActivity = c.dateLastActivity;
  return ret;
};

export const fetch = [
  // get the cards
  trello.loadList({ board: 'Livestock', list: 'Incoming', key: 'incoming' }),
  // convert all props.cards to records:
  ({props,state}) => state.set('incoming.records', _.map(props.cards, incomingCardToRecord)),
];


