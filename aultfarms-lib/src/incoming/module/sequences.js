import _ from 'lodash';
import { set } from 'cerebral/operators';
import { sequence, CerebralError } from 'cerebral';

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
  ({props,state}) => state.set('incoming.records', _.map(props.cards, incomingCardToRecord)),
]);


export const computeStats = sequence('incoming.computeStats', [
  ({state}) => {
    // check if we have both dead and incoming records:
    const deadrecords = state.get('dead.records');
    const incoming = state.get('incoming.records');

    // Organize the dead by tag color:
    const dead = _.reduce(deadrecords, (acc,d) => {
      if (!d.tags) console.log('incoming.computeStats: WARNING: dead record has no tags.  Card name = ', d.cardName);
      _.each(d.tags, t => {
        if (!acc[t.color]) acc[t.color] = [];
        acc[t.color].push({ date: d.date, tag: t });
      });
      return acc;
    },{});

   
    // Walk through each incoming group to push dead ones onto it's dead list:
    _.each(incoming, (group,index) => {
      if (!group.tag_ranges) return;
      state.set(`incoming.records.${index}.dead`, _.reduce(group.tag_ranges, (acc,r) => {
        _.each(dead[r.start.color], deadone => {
          // if (!rangeContainsTag(r, deadone.tag)) return;
          // Had to adjust this from the simpler "rangeContainsTag" to the more complex "groupForTag" because
          // we had to account for historically repeating tags
          const tagsGroup = groupForTag(incoming, deadone.tag, deadone.date);
          if (!tagsGroup) return; // don't have a group for this one, likely because it is old
          if (tagsGroup.groupname !== group.groupname) return; // not in this group
          acc.push(deadone); // otherwise, it's in the range for this tag, so count it
        });
        return acc;
      },[]));
    });

    // Done organizing dead into incoming groups
  },
]);
