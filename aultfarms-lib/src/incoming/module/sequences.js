import _ from 'lodash';
import { set } from 'cerebral/factories';
import { sequence, state, CerebralError } from 'cerebral';

import { tagStrToObj, groupForTag /*rangeContainsTag*/ } from '../../util/tagHelpers';
import * as trello from '../../trello/module/sequences';


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

export const fetch = sequence('incoming.fetch', [
  () => ({ boardName: 'Livestock', listName: 'Incoming', key: 'incoming' }),
  // get the cards
  trello.loadList,
  // convert all props.cards to records:
  ({props,store}) => store.set(state`incoming.records`, _.map(props.cards, incomingCardToRecord)),
]);


export const computeStats = sequence('incoming.computeStats', [
  ({get, store}) => {

    // check if we have both dead and incoming records:
    const deadrecords = get(state`dead.records`);
    const incoming = get(state`incoming.records`);


    // group all deads into the appropriate incoming group, keyed by groupname
    const groupdeads = _.reduce(deadrecords, (acc,d) => {
      if (!d.tags) console.log('incoming.computeStats: WARNING: dead record has no tags.  Card name = ', d.cardName);
      _.each(d.tags, t => {
        const g = groupForTag(incoming, t, d.date);
        if (!g) return; // this is likely an old tag that has no known group, or a notag
        if (!acc[g.groupname]) acc[g.groupname] = [];
        acc[g.groupname].push({ date: d.date, tag: t });
      });
      return acc;
    }, {});

    // walk through all incoming records and add a "dead" key with the list of dead
    _.each(incoming, (g,index) => {
      store.set(state`incoming.records.${index}.dead`, groupdeads[g.groupname] || []);
    });

  },
]);
