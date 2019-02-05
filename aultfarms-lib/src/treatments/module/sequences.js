import moment from 'moment';
import _ from 'lodash';
import { set } from 'cerebral/operators';
import { sequence, CerebralError } from 'cerebral';

import { tagStrToObj } from '../../util/tagHelpers';
import * as trello from '../../trello/module/sequences';


//---------------------------------------------------------------
// save one treatment
export const saveTreatment = [

  // find existing card that matches this date and treatment (if it exists):
  ({props,store}) => {
    let ret = false;
    const records = store.get('treatments.records');
    const existing = _.find(records, r => {
      return r.date === props.record.date && r.treatment === props.record.treatment;
    });
    if (!existing) {
      ret = _.cloneDeep(props.record);
      ret.tags = [ ret.tag ];
      return { record: ret }; // existing record is fine as-is in props, just needed array of tags instead of just one
    }

    // Otherwise, check if this tag is already in the list:
    const alreadyInList = _.find(existing.tags, t => 
      (props.record.tag.color === t.color && props.record.tag.number === t.number)
    );
    if (alreadyInList) return { record: existing }; // replace record in props with existing record

    // Otherwise, add record to the list of existing tags since it's not already there
    ret = _.cloneDeep(existing);
    ret.tags.push(props.record.tag);
    // replace record in props with this new one:
    return { record: ret };
  },

  // convert record to card
  ({props,store}) => ({
    card: {
      id: props.record.id,
      idList: props.record.idList || store.get('trello.lists.treatments.id'),
      name: props.record.date+': '+props.record.treatment+': '
            +_.join(_.map(props.record.tags, t=>t.color+t.number), ' '),
    },
  }),

  // Put the card to trello:
  trello.putCard,
];


//---------------------------------------------------------------------
// fetch all treatment records:
const treatmentCardToRecord = c => {
  if (!c) return null;
  const name = c.name;
  const datematches = name.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}):(.*)$/);
  if (!datematches || datematches.length < 3) return null;
  const date = datematches[1].trim();
  let rest = datematches[2].trim();
  const treatmentmatches = rest.match(/^(.+):(.*)$/);
  if (!treatmentmatches || treatmentmatches.length < 3) return null;
  const treatment = treatmentmatches[1].trim();
  rest = treatmentmatches[2].trim();
  const tags = _.map(_.split(rest,' '), tagStrToObj)
  return { 
    date, 
    treatment, 
    tags,
    id: c.id,
    idList: c.idList,
    cardName: c.name, 
    dateLastActivity: c.dateLastActivity
  };
};

export const fetch = sequence('treatments.fetch', [
  // get the cards
  () => ({ boardName: 'Livestock', listName: 'Treatments', key: 'treatments' }),
  trello.loadList,
  // convert all props.cards to records:
  ({props,store}) => store.set('treatments.records', _.map(props.cards, treatmentCardToRecord)),
]);


//---------------------------------------------------------------------
// fetch the config cards (colors, treatmentCodes)
const colorsCardToRecord = c => c ? JSON.parse(c.desc) : null;
const  codesCardToRecord = c => c ? JSON.parse(c.desc) : null;
export const fetchConfig = sequence('treatments.fetchConfig', [
  () => ({ boardName: 'Livestock', listName: 'Config', key: 'livestockConfig' }),
  // get the colors and codes cards:
  trello.loadList,

  // save colors in state:
  sequence('saveColors', [({props,store}) => store.set('treatments.colors',        colorsCardToRecord(_.find(props.cards, c => c.name === 'Tag Colors'     )))]),

  // save treatment codes in state:
  sequence('saveCodes', [({props,store}) => store.set('treatments.treatmentCodes', codesCardToRecord(_.find(props.cards, c => c.name === 'Treatment Types')))]),
]);



