import moment from 'moment';
import debug from 'debug';
import type { DeadRecord, Record } from './';
import type { Card } from '../../trello/types';

import { } from 'overmind';

import { tagStrToObj, tagObjToStr, groupForTag } from '../../util/tagHelpers';

const warn = debug('dead:warn');

//---------------------------------------------------------------------
// fetch all dead records:
const deadCardToRecord = (c: Card): Record => {
  try {
    if (!c) return {
      error: 'Card was falsey',
    };

    const name = c.name;

    let matches = name.match(/^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}):?(.*)$/);
    if (!matches) {
      warn('WARNING: attempted to convert card name (',name,') to dead record, but day/tag was not matched');
      matches = [];
    }

    // Grab the day:
    const day = matches[1] || '1970-01-01';
    if (!matches[1]) {
      warn('WARNING: attempted to convert card name (',name,') to dead record, but day was not matched');
    }

    // Grab the tags/pens
    let tags_and_pens_str = matches[2] || 'UNKNOWN';
    if (!matches[2]) {
      warn('WARNING: attempted to convert card name (',name,') to dead record, but tag was not matched');
    }

    // Save the note if there is one:
    matches = tags_and_pens_str.match(/[Nn][Oo][Tt][Ee]:(.*)$/);
    let note: string | false = false;
    if (matches) note = matches[1] || false;

    // Ditch anything in parentheses:
    tags_and_pens_str = tags_and_pens_str.replace(/\(.*\)/g,'');
//    let tags_and_pens = tags_and_pens_str.match(/([A-Za-z']+ ?([0-9]+)?)/g);
    let tags_and_pens = tags_and_pens_str.match(/(([A-Z]+:[A-Z]{3}[0-9]{2}-[A-Z0-9]:)?[A-Za-z']+ ?([0-9]+)?)/g);
    if (!tags_and_pens) tags_and_pens = [];
    tags_and_pens = tags_and_pens.map(tp => tp.trim());
    tags_and_pens = tags_and_pens.map(tp => ( tp==='NT' ? 'NOTAG1' : tp));
    // eliminate everything that isn't just tags
    let tags = tags_and_pens.filter(t => 
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
    tags = tags.map(t=>t.toUpperCase().replace(/ /g,''));
    tags = tags.map(t=>(t === 'NOTAG' ? 'NOTAG1' : t));
    // parse all the tag strings into tag objects
    const tagObjs = tags.map(tagStrToObj);
    return {
      date: day,
      tags: tagObjs,
      note,
      id: c.id,
      idList: c.idList,
      cardName: c.name, 
      dateLastActivity: c.dateLastActivity
    };

  // If anything goes wrong, just put an error record here:
  } catch(err: any) {
    return { 
      cardName: c.name,
      idList: c.idList,
      id: c.id,
      error: err?.toString() || '',
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

const reloadOneRecord = sequence('dead.reloadOneRecord', [
  ({props,store,get}) => {
    // re-process the card into a record, overwrite the previous record.  If it was
    // a new card, it will get appended to the records list.
    const records = get(state`dead.records`);
    const recordIndex = _.findIndex(records, r => r.id === props.card.id);
    const refreshedRecord = deadCardToRecord(props.card);
    if (recordIndex >= 0) {
      // found it, replace it:
      store.set(state`dead.records.${recordIndex}`,refreshedRecord);
    } else {
      // did not find it, push onto end:
      store.push(state`dead.records`, refreshedRecord);
    }
    // Update the tagindex if necessary
    const incoming = get(state`incoming`);
    _.each(refreshedRecord.tags, t => {
      const str = tagObjToStr(t);
      let g = groupForTag(incoming, t, refreshedRecord.date);
      if (!g) g = { groupname: "NONE" }; // early tags have no group
      const previous = _.clone(get(state`dead.tagIndex.${str}`));
      let newone = _.clone(previous) || {};
      newone[g.groupname] = refreshedRecord.date;
      store.set(state`dead.tagIndex.${str}`, newone);
    });

    return { record: refreshedRecord };
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
                +_.join(_.map(props.record.tags, tagObjToStr), ' ')
                +(props.record.note ? 'Note: '+props.record.note : '');
    return { card };
  },

  // Put the card to Trello, this reloads that one card into state from Trello afterward
  trello.putCard,

  // Re-process the card into it's approriate record:
  reloadOneRecord,

]);


