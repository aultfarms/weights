import _ from 'lodash';
import moment from 'moment';
import { state } from 'cerebral/tags';
import { set } from 'cerebral/operators';
import { sequence } from 'cerebral';

import { loadList } from '../trello/sequences';


// Example cards:
// 2017-01-26: Df pellets 1-26-17 209366.  48.620 lbs - Home - Brock
// 2017-01-24: North Central Pallets46470.  8 lbs - Home - Andrew.  Note: some info
export const processCards = [

  // First parse the cards, then later determine invoiced list, non-invoiced list, etc.
  ({state}) => {
    const cards = state.get('trello.lists.feedDeliveries.cards');
    const deliveries = _.map(cards, c => {
      if (!c.name) { return { error: 'card name does not exist', card: c } }
      // Date on front:
      let matches = c.name.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}): *(.*)$/);
      const date = moment(matches[1].trim(), 'YYYY-MM-DD');
      let rest = matches[2];
      // Next is source+number (up to a period)
      matches = rest.match(/^([^.]*). *(.*)$/);
      rest = matches[2];
      const sourceAndNumber = matches[1].trim().replace('/ *pellets */g','');

      matches = sourceAndNumber.match(/^([^0-9]+)?(.*)$/);
      const source = (matches[1] ? matches[1].trim() : 'NONE').toUpperCase();
      const loadNumber = matches[2] ? matches[2].trim() : '';

      // Then comes pounds w/ period instead of comma sometimes
      matches = rest.match(/(([0-9]+[,.])?[0-9]*) +lbs +- +(.*)$/);
      const weight = +(matches[1].replace(/[,.]/g,'').trim()); // convert to number
      rest = matches[3];
      // Then comes destination
      matches = rest.match(/([^-]+) *- *(.*)$/);
      const destination = matches[1].toUpperCase().trim();
      rest = matches[2];
      // Now driver
      matches = rest.match(/([^.]*)(. *(.*))?$/);
      const driver = matches[1].trim();
      rest = matches[3] || '';
      // Optional note
      matches = rest.match(/Note: *(.*)$/);
      const note = (matches && matches[1].trim()) || '';

      // Set true/false properties based on labels:
      const     invoiced = !!(_.find(c.labels, l => l.color === 'orange'));
      const      paidFor = !!(_.find(c.labels, l => l.color === 'green'));
      const truckingPaid = !!(_.find(c.labels, l => l.color === 'blue'));

      return { date, source, loadNumber, weight, destination, driver, note, invoiced, paidFor, truckingPaid, card: c };
    });
    state.set('feed.deliveries', _.sortBy(deliveries, d => d.date));

    //---------------------------------------------------------
    // Before grouping/filtering, eliminate cards older than we care about:
    const ignoreBefore = moment(state.get('feed.ignoreBefore'), 'YYYY-MM-DD');
    const recentDeliveries = _.filter(deliveries, d => ignoreBefore.isBefore(d.date));

    //----------------------------------------------------------
    // Find loads not billed, group by destination
    let notInvoiced = _.filter(recentDeliveries, d => !(d.invoiced));
    notInvoiced = _.filter(notInvoiced, d => d.destination.toUpperCase() !== 'HOME');
    state.set('feed.notInvoiced', _.groupBy(notInvoiced, n => n.destination));

    //---------------------------------------------------------
    // Find loads not paid for by us, group by source:
    let notPaidFor = _.filter(recentDeliveries, d => !(d.paidFor));
    state.set('feed.notPaidFor', _.groupBy(notPaidFor, p => p.source));

    //----------------------------------------------------------------------------------
    // Find loads that Brad hauled which we have not been billed for, group by source:
    let truckingNotPaid = _.filter(recentDeliveries, d => d.driver.toUpperCase() === 'BRAD');
    truckingNotPaid = _.filter(truckingNotPaid, d => !(d.truckingPaid));
    state.set('feed.truckingNotPaid', _.groupBy(truckingNotPaid, t => t.source));

  },

];


export const init = [
  () => { return { boardName: 'Feed', listName: 'Feed Delivered', key: 'feedDeliveries' } },
  sequence('feed.init->trello.loadList', loadList),
  sequence('feed.init->feed.processCards', processCards),
  set(state`feed.ready`, true),
];


