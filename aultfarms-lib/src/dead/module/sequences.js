import moment from 'moment';
import _ from 'lodash';
import { set } from 'cerebral/factories';
import { state, sequence, CerebralError } from 'cerebral';

import { tagStrToObj, tagObjToStr, groupForTag } from '../../util/tagHelpers';
import * as trello from '../../trello/module/sequences';


//---------------------------------------------------------------------
// fetch all dead records:
const deadCardToRecord = c => {
  try {
    if (!c) return null;
    const name = c.name;
    let matches = name.match(/^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}):?(.*)$/);
    const day = matches[1];
    let tags_and_pens_str = matches[2];
    // Save the note if there is one:
    matches = tags_and_pens_str.match(/[Nn][Oo][Tt][Ee]:(.*)$/);
    let note = false;
    if (matches) note = matches[1];
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
      note,
      id: c.id,
      idList: c.idList,
      cardName: c.name, 
      dateLastActivity: c.dateLastActivity
    };

  // If anything goes wrong, just put an error record here:
  } catch(err) {
    return { 
      cardName: c.name,
      idList: c.idList,
      id: c.id,
      error: err.toString(),
    };
  }
};

export const fetch = sequence('dead.fetch', [
  () => ({ boardName: 'Livestock', listName: 'Dead', key: 'dead' }),
  // get the cards
  trello.loadList,
  // convert all props.cards to records or errors:
  ({props,store,get}) => {
    const {errors, records} = _.reduce(props.cards, (acc,c) => {
      const r = deadCardToRecord(_.cloneDeep(c));
      if (r.error) acc.errors.push(r);
      else         acc.records.push(r);
      return acc;
    }, { errors: [], records: [] });
    store.set(state`dead.records`, records);
    store.set(state`dead.errors`, errors);
    // re-index all dead records as { tagstr: { groupname: date } }
    const incoming = get(state`incoming.records`);
    const tagIndex = _.reduce(records, (acc,r) => {
      if (!r.tags) return acc;
      _.each(r.tags, t => {
        const str = tagObjToStr(t);
        let g = groupForTag(incoming, t, r.date);
        if (!g) g = { groupname: "NONE" }; // early tags have no group
        if (!acc[str]) acc[str] = {};
        acc[str][g.groupname] = r.date;
      });
      return acc;
    }, {});
    store.set(state`dead.tagIndex`, tagIndex);
  },
]);

export const saveDead = sequence('dead.saveDead', [
  // Check if this tag is already in any of the days 14 before or after date
  // in order to prevent duplicates:
  ({props,store,get}) => {
    const records = get(state`dead.records`);
    const start = moment(props.record.date,'YYYY-MM-DD').subtract(14, 'days');
    const end = moment(props.record.date,'YYYY-MM-DD').add(14, 'days');
    const alreadyDead = _.find(records, r => {
      const d = moment(r.date,'YYYY-MM-DD');
      // Not within date range?
      if (!start.isBefore(d) || !end.isAfter(d)) return false;
      // Tag not already in list?
      if (!_.find(r.tags, t => t.color === props.record.tag.color && t.number === props.record.tag.number)) return false;
      // In date range and tag already in list
      return true;
    });
    if (alreadyDead) {
      return { alreadyDead: true };
    }
  },

  // Find existing card for this date if there is one
  ({props,store,get}) => {
    if (props.alreadyDead) return;
    let ret = false;
    const records = get(state`dead.records`);
    const existingDate = _.find(records, r => r.date === props.record.date);
    // If there isn't one, just update record to have "tags" as array rather than one tag
    if (!existingDate) {
      ret = _.cloneDeep(props.record);
      ret.tags = [ ret.tag ];
      return { record: ret };
    }
    // Otherwise, there is an existing card for this date, add the tag to its list:
    ret = _.cloneDeep(existingDate);
    ret.tags.push(props.record.tag);
    return { record: ret };
  },

  // convert record to card
  ({props,store,get}) => {
    const card = props.record.card || {};
    card.id = props.record.id;
    card.idList = props.record.idList || get(state`trello.lists.dead.id`),
    card.name = props.record.date+': '
                +_.join(_.map(props.record.tags, t=>t.color+t.number), ' ')
                +(props.record.note ? 'Note: '+props.record.note : '');
    return { card };
  },

  // Put the card to Trello:
  trello.putCard,

]);
