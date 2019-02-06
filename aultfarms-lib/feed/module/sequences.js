'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetch = undefined;

var _templateObject = _taggedTemplateLiteral(['trello.lists.feedDeliveries.cards'], ['trello.lists.feedDeliveries.cards']),
    _templateObject2 = _taggedTemplateLiteral(['feed.records'], ['feed.records']),
    _templateObject3 = _taggedTemplateLiteral(['feed.ignoreBefore'], ['feed.ignoreBefore']),
    _templateObject4 = _taggedTemplateLiteral(['feed.notInvoiced'], ['feed.notInvoiced']),
    _templateObject5 = _taggedTemplateLiteral(['feed.notPaidFor'], ['feed.notPaidFor']),
    _templateObject6 = _taggedTemplateLiteral(['feed.truckingNotPaid'], ['feed.truckingNotPaid']),
    _templateObject7 = _taggedTemplateLiteral(['feed.ready'], ['feed.ready']);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _factories = require('cerebral/factories');

var _cerebral = require('cerebral');

var _sequences = require('../../trello/module/sequences');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

// Example cards:
// 2017-01-26: Df pellets 1-26-17 209366.  48.620 lbs - Home - Brock
// 2017-01-24: North Central Pallets46470.  8 lbs - Home - Andrew.  Note: some info
function processCards(_ref) {
  var store = _ref.store,
      get = _ref.get;

  // First parse the cards, then later determine invoiced list, non-invoiced list, etc.
  var cards = get((0, _cerebral.state)(_templateObject));

  var records = _lodash2.default.map(cards, function (c) {
    if (!c.name) {
      return { error: 'card name does not exist', card: c };
    }
    // Date on front:
    var matches = c.name.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}): *(.*)$/);
    var date = (0, _moment2.default)(matches[1].trim(), 'YYYY-MM-DD');
    var rest = matches[2];
    // Next is source+number (up to a period)
    matches = rest.match(/^([^.]*). *(.*)$/);
    rest = matches[2];
    var sourceAndNumber = matches[1].trim().replace('/ *pellets */g', '');

    matches = sourceAndNumber.match(/^([^0-9]+)?(.*)$/);
    var source = (matches[1] ? matches[1].trim() : 'NONE').toUpperCase();
    var loadNumber = matches[2] ? matches[2].trim() : '';

    // Then comes pounds w/ period instead of comma sometimes
    matches = rest.match(/(([0-9]+[,.])?[0-9]*) +lbs +- +(.*)$/);
    var weight = +matches[1].replace(/[,.]/g, '').trim(); // convert to number
    rest = matches[3];
    // Then comes destination
    matches = rest.match(/([^-]+) *- *(.*)$/);
    var destination = matches[1].toUpperCase().trim();
    rest = matches[2];
    // Now driver
    matches = rest.match(/([^.]*)(. *(.*))?$/);
    var driver = matches[1].trim();
    rest = matches[3] || '';
    // Optional note
    matches = rest.match(/Note: *(.*)$/);
    var note = matches && matches[1].trim() || '';

    // Set true/false properties based on labels:
    var invoiced = !!_lodash2.default.find(c.labels, function (l) {
      return l.color === 'orange';
    });
    var paidFor = !!_lodash2.default.find(c.labels, function (l) {
      return l.color === 'green';
    });
    var truckingPaid = !!_lodash2.default.find(c.labels, function (l) {
      return l.color === 'blue';
    });

    return { date: date, source: source, loadNumber: loadNumber, weight: weight, destination: destination, driver: driver, note: note, invoiced: invoiced, paidFor: paidFor, truckingPaid: truckingPaid, card: c };
  });
  store.set((0, _cerebral.state)(_templateObject2), _lodash2.default.sortBy(records, function (d) {
    return d.date;
  }));

  //---------------------------------------------------------
  // Before grouping/filtering, eliminate cards older than we care about:
  var ignoreBefore = (0, _moment2.default)(get((0, _cerebral.state)(_templateObject3)), 'YYYY-MM-DD');
  var recentDeliveries = _lodash2.default.filter(records, function (d) {
    return ignoreBefore.isBefore(d.date);
  });

  //----------------------------------------------------------
  // Find loads not billed, group by destination
  var notInvoiced = _lodash2.default.filter(recentDeliveries, function (d) {
    return !d.invoiced;
  });
  notInvoiced = _lodash2.default.filter(notInvoiced, function (d) {
    return d.destination.toUpperCase() !== 'HOME';
  });
  store.set((0, _cerebral.state)(_templateObject4), _lodash2.default.groupBy(notInvoiced, function (n) {
    return n.destination;
  }));

  //---------------------------------------------------------
  // Find loads not paid for by us, group by source:
  var notPaidFor = _lodash2.default.filter(recentDeliveries, function (d) {
    return !d.paidFor;
  });
  store.set((0, _cerebral.state)(_templateObject5), _lodash2.default.groupBy(notPaidFor, function (p) {
    return p.source;
  }));

  //----------------------------------------------------------------------------------
  // Find loads that Brad hauled which we have not been billed for, group by source:
  var truckingNotPaid = _lodash2.default.filter(recentDeliveries, function (d) {
    return d.driver.toUpperCase() === 'BRAD';
  });
  truckingNotPaid = _lodash2.default.filter(truckingNotPaid, function (d) {
    return !d.truckingPaid;
  });
  store.set((0, _cerebral.state)(_templateObject6), _lodash2.default.groupBy(truckingNotPaid, function (t) {
    return t.source;
  }));
}

var fetch = exports.fetch = (0, _cerebral.sequence)('feed.fetch', [function () {
  return { boardName: 'Feed', listName: 'Feed Delivered', key: 'feedDeliveries' };
}, _sequences.loadList, processCards, (0, _factories.set)((0, _cerebral.state)(_templateObject7), true)]);
//# sourceMappingURL=sequences.js.map