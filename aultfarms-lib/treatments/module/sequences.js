import moment from 'moment';
import _ from 'lodash';
import { set } from 'cerebral/operators';
import { sequence, CerebralError } from 'cerebral';

import { tagStrToObj } from '../../util/tagHelpers';
import * as trello from '../trello/sequences';

//---------------------------------------------------------------
// save one treatment
export const saveTreatment = [

// find existing card that matches this date and treatment (if it exists):
({ props, state }) => {
  const cards = state.get('trello.lists.treatments.cards');
  const existing = _.find(cards, c => {
    const info = treatmentCardToRecord(c);
    return info.date === props.record.date && info.treatment === props.record.treatment;
  });
  if (!existing) return; // existing record is fine as-is in props
  // Otherwise, check if this tag is already in the list:
  const alreadyInList = _.find(existing.tags, t => record.tag.color === t.color && record.tag.number === t.number);
  if (alreadyInList) return { record: existing }; // replace record in props with existing record
  // And finally, add it to the list of existing tags since it's not already there
  const ret = _.cloneDeep(existing);
  ret.tags.push(record.tag);
  // replace record in props with this new one:
  return { record: ret };
},

// convert record to card
({ props }) => ({
  card: {
    id: props.record.id,
    idList: props.record.idList || state.get('trello.lists.treatments.id'),
    name: props.record.date + ': ' + props.record.treatment + ': ' + _.join(_.map(r.tags, t => t.color + t.number), ' ')
  }
}),

// Put the card to trello:
trello.putCard];

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
  const tags = _.map(_.split(rest, ' '), tagStrToObj);
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

export const fetch = [
// get the cards
trello.loadList({ board: 'Livestock', list: 'Treatments', key: 'treatments' }),
// convert all props.cards to records:
({ props, state }) => state.set('treatments.records', _.map(props.cards, treatmentCardToRecord))];

//---------------------------------------------------------------------
// fetch the config cards (colors, treatmentCodes)
const colorsCardToRecord = c => c ? JSON.parse(c.name) : null;
const codesCardToRecord = c => c ? JSON.parse(c.name) : null;
export const fetchConfig = [
// get the colors and codes cards:
trello.loadList({ board: 'Livestock', list: 'Config', key: 'livestockConfig' }),

// save colors in state:
({ props, state }) => state.set('treatments.colors', colorsCardToRecord(_.find(props.cards, c => c.name === 'Tag Colors'))),

// save treatment codes in state:
({ props, state }) => state.set('treatments.treatmentCodes', codesCardToRecord(_.find(props.cards, c => c.name === 'Treatment Types')))];
//# sourceMappingURL=sequences.js.map