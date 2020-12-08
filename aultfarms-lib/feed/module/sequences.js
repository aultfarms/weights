import _ from 'lodash';
import moment from 'moment';
import { set } from 'cerebral/factories';
import { state, sequence } from 'cerebral';

import { loadList, addLabelToCard } from '../../trello/module/sequences';


// Example cards:
// 2017-01-26: Df pellets 1-26-17 209366.  48.620 lbs - Home - Brock
// 2017-01-24: North Central Pallets46470.  8 lbs - Home - Andrew.  Note: some info

function processOneCard(c, { ignoreBefore }) {
  if (!c.name) throw 'Card.name does not exist'
  // Date on front:
  let matches = c.name.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}): *(.*)$/);
  if (!matches || !matches[1]) throw 'Could not match date';
  const date = moment(matches[1].trim(), 'YYYY-MM-DD');
  if (date.isBefore(ignoreBefore)) return null; // ignore it
  
  let rest = matches[2];
  if (!rest) throw 'No string after date';
  // Next is source+number (up to a period)
  matches = rest.match(/^([^.]*). *(.*)$/);
  rest = matches[2];
  if (!rest) throw 'No string after source+number';
  if (!matches || !matches[1]) throw 'Could not match source+number';
  const sourceAndNumber = matches[1].trim().replace('/ *pellets */g','');

  matches = sourceAndNumber.match(/^([^0-9]+)?(.*)$/);
  if (!matches) throw 'Could not match source name+number';
  const source = (matches[1] ? matches[1].trim() : 'NONE').toUpperCase();
  const loadNumber = matches[2] ? matches[2].trim() : '';

  // Then comes pounds w/ period instead of comma sometimes
  matches = rest.match(/(([0-9]+[,.])?[0-9]*) +lbs +- +(.*)$/);
  if (!matches || !matches[1]) throw 'Could not match weight';
  const weight = +(matches[1].replace(/[,.]/g,'').trim()); // convert to number
  rest = matches[3];
  if (!rest) throw 'No string after weight';

  // Then comes destination
  matches = rest.match(/([^-]+) *- *(.*)$/);
  if (!matches || !matches[1]) throw 'Could not match destination';
  const destination = matches[1].toUpperCase().trim();
  rest = matches[2];
  if (!rest) throw 'No string after destination';
  // Now driver
  matches = rest.match(/([^.]*)(. *(.*))?$/);
  if (!matches || !matches[1]) throw 'Could not match driver';
  const driver = matches[1].trim();
  rest = matches[3] || '';
  if (typeof rest !== 'string') throw 'No string after driver';

  // Optional note
  matches = rest.match(/Note: *(.*)$/);
  const note = (matches && matches[1].trim()) || '';

  // Set true/false properties based on labels:
  const     invoiced = !!(_.find(c.labels, l => l.color === 'orange'));
  const      paidFor = !!(_.find(c.labels, l => l.color === 'green'));
  const truckingPaid = !!(_.find(c.labels, l => l.color === 'blue'));

  return { 
    date, source, loadNumber, weight, destination, driver, 
    note, invoiced, paidFor, truckingPaid, card: c, id: c.id,
  };
}

function processCards({store,get}) {
  // First parse the cards, then later determine invoiced list, non-invoiced list, etc.
  const cards = get(state`trello.lists.feedDeliveries.cards`);
  const ignoreBefore = moment(get(state`feed.ignoreBefore`), 'YYYY-MM-DD');

  const {records,errors} = _.reduce(cards, (acc,c,key) => {
    try {
      const r = processOneCard(c, { ignoreBefore });
      if (r) acc.records.push(r);
    } catch (err) {
      acc.errors.push({ error: err.toString(), card: c });
    } finally {
      return acc;
    }
  }, { errors: [], records: [] });
  store.set(state`feed.records`, _.keyBy(records, r => r.id));
  store.set(state`feed.errors`, errors);

}

function processGroups({store,get}) {
  const records = get(state`feed.records`);
  //----------------------------------------------------------
  // Find loads not billed, group by destination
  let notInvoiced = _.reduce(records, (acc,r) => {
    if (!r.invoiced) acc.push(r);
    return acc;
  }, []);
  notInvoiced = _.filter(notInvoiced, d => d.destination.toUpperCase() !== 'HOME');
  store.set(state`feed.notInvoiced`, _.groupBy(notInvoiced, n => n.destination));

  //---------------------------------------------------------
  // Find loads not paid for by us, group by source:
  let notPaidFor = _.reduce(records, (acc,r) => {
    if (!r.paidFor) acc.push(r);
    return acc;
  },[]);
  store.set(state`feed.notPaidFor`, _.groupBy(notPaidFor, p => p.source));

  //----------------------------------------------------------------------------------
  // Find loads that Brad hauled which we have not been billed for, group by source:
  let truckingNotPaid = _.reduce(records, (acc,r) => {
    if (r.driver.toUpperCase() === 'BRAD'
        && !r.truckingPaid) acc.push(r);
    return acc;
  },[]);
  store.set(state`feed.truckingNotPaid`, _.groupBy(truckingNotPaid, t => t.source));

}

export const fetch = sequence('feed.fetch', [
  () => ({ boardName: 'Feed', listName: 'Feed Delivered', key: 'feedDeliveries' }),
  loadList,
  processCards,
  processGroups,
  set(state`feed.ready`, true),
]);

export const reprocessOneCard = sequence('feed.reprocessOneCard', [
  ({store,get,props}) => {
    const ignoreBefore = moment(get(state`feed.ignoreBefore`), 'YYYY-MM-DD');
    try {
      store.set(state`feed.records.${props.card.id}`, processOneCard(props.card, {ignoreBefore}));
    } catch (err) {
      store.errors.push({ error: err.toString(), card: props.card });
    }
  },
]);

// Expects props.id, will mark one record as invoiced in trello
export const markAsInvoiced = sequence('feed.markAsInvoiced', [
  // record id is same as cardid, so we can just use it
  ({get}) => {
    // Figure out id of "orange" color label
    const labels = get(state`trello.lists.feedDeliveries.labels`);
    const orangeLabel = _.find(labels, l => l.color === 'orange');
    return { idLabel: orangeLabel.id };
  },
  addLabelToCard,
  reprocessOneCard,
  processGroups,
]);
