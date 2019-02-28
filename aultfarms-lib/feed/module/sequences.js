'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.markAsInvoiced = exports.reprocessOneCard = exports.fetch = undefined;

var _templateObject = _taggedTemplateLiteral(['trello.lists.feedDeliveries.cards'], ['trello.lists.feedDeliveries.cards']),
    _templateObject2 = _taggedTemplateLiteral(['feed.ignoreBefore'], ['feed.ignoreBefore']),
    _templateObject3 = _taggedTemplateLiteral(['feed.records'], ['feed.records']),
    _templateObject4 = _taggedTemplateLiteral(['feed.errors'], ['feed.errors']),
    _templateObject5 = _taggedTemplateLiteral(['feed.notInvoiced'], ['feed.notInvoiced']),
    _templateObject6 = _taggedTemplateLiteral(['feed.notPaidFor'], ['feed.notPaidFor']),
    _templateObject7 = _taggedTemplateLiteral(['feed.truckingNotPaid'], ['feed.truckingNotPaid']),
    _templateObject8 = _taggedTemplateLiteral(['feed.ready'], ['feed.ready']),
    _templateObject9 = _taggedTemplateLiteral(['feed.records.', ''], ['feed.records.', '']),
    _templateObject10 = _taggedTemplateLiteral(['trello.lists.feedDeliveries.labels'], ['trello.lists.feedDeliveries.labels']);

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

function processOneCard(c, _ref) {
  var ignoreBefore = _ref.ignoreBefore;

  if (!c.name) throw 'Card.name does not exist';
  // Date on front:
  var matches = c.name.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}): *(.*)$/);
  if (!matches || !matches[1]) throw 'Could not match date';
  var date = (0, _moment2.default)(matches[1].trim(), 'YYYY-MM-DD');
  if (date.isBefore(ignoreBefore)) return null; // ignore it

  var rest = matches[2];
  if (!rest) throw 'No string after date';
  // Next is source+number (up to a period)
  matches = rest.match(/^([^.]*). *(.*)$/);
  rest = matches[2];
  if (!rest) throw 'No string after source+number';
  if (!matches || !matches[1]) throw 'Could not match source+number';
  var sourceAndNumber = matches[1].trim().replace('/ *pellets */g', '');

  matches = sourceAndNumber.match(/^([^0-9]+)?(.*)$/);
  if (!matches) throw 'Could not match source name+number';
  var source = (matches[1] ? matches[1].trim() : 'NONE').toUpperCase();
  var loadNumber = matches[2] ? matches[2].trim() : '';

  // Then comes pounds w/ period instead of comma sometimes
  matches = rest.match(/(([0-9]+[,.])?[0-9]*) +lbs +- +(.*)$/);
  if (!matches || !matches[1]) throw 'Could not match weight';
  var weight = +matches[1].replace(/[,.]/g, '').trim(); // convert to number
  rest = matches[3];
  if (!rest) throw 'No string after weight';

  // Then comes destination
  matches = rest.match(/([^-]+) *- *(.*)$/);
  if (!matches || !matches[1]) throw 'Could not match destination';
  var destination = matches[1].toUpperCase().trim();
  rest = matches[2];
  if (!rest) throw 'No string after destination';
  // Now driver
  matches = rest.match(/([^.]*)(. *(.*))?$/);
  if (!matches || !matches[1]) throw 'Could not match driver';
  var driver = matches[1].trim();
  rest = matches[3] || '';
  if (typeof rest !== 'string') throw 'No string after driver';

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

  return {
    date: date, source: source, loadNumber: loadNumber, weight: weight, destination: destination, driver: driver,
    note: note, invoiced: invoiced, paidFor: paidFor, truckingPaid: truckingPaid, card: c, id: c.id
  };
}

function processCards(_ref2) {
  var store = _ref2.store,
      get = _ref2.get;

  // First parse the cards, then later determine invoiced list, non-invoiced list, etc.
  var cards = get((0, _cerebral.state)(_templateObject));
  var ignoreBefore = (0, _moment2.default)(get((0, _cerebral.state)(_templateObject2)), 'YYYY-MM-DD');

  var _$reduce = _lodash2.default.reduce(cards, function (acc, c, key) {
    try {
      var r = processOneCard(c, { ignoreBefore: ignoreBefore });
      if (r) acc.records.push(r);
    } catch (err) {
      acc.errors.push({ error: err.toString(), card: c });
    } finally {
      return acc;
    }
  }, { errors: [], records: [] }),
      records = _$reduce.records,
      errors = _$reduce.errors;

  store.set((0, _cerebral.state)(_templateObject3), _lodash2.default.keyBy(records, function (r) {
    return r.id;
  }));
  store.set((0, _cerebral.state)(_templateObject4), errors);
}

function processGroups(_ref3) {
  var store = _ref3.store,
      get = _ref3.get;

  var records = get((0, _cerebral.state)(_templateObject3));
  //----------------------------------------------------------
  // Find loads not billed, group by destination
  var notInvoiced = _lodash2.default.reduce(records, function (acc, r) {
    if (!r.invoiced) acc.push(r);
    return acc;
  }, []);
  notInvoiced = _lodash2.default.filter(notInvoiced, function (d) {
    return d.destination.toUpperCase() !== 'HOME';
  });
  store.set((0, _cerebral.state)(_templateObject5), _lodash2.default.groupBy(notInvoiced, function (n) {
    return n.destination;
  }));

  //---------------------------------------------------------
  // Find loads not paid for by us, group by source:
  var notPaidFor = _lodash2.default.reduce(records, function (acc, r) {
    if (!r.paidFor) acc.push(r);
    return acc;
  }, []);
  store.set((0, _cerebral.state)(_templateObject6), _lodash2.default.groupBy(notPaidFor, function (p) {
    return p.source;
  }));

  //----------------------------------------------------------------------------------
  // Find loads that Brad hauled which we have not been billed for, group by source:
  var truckingNotPaid = _lodash2.default.reduce(records, function (acc, r) {
    if (r.driver.toUpperCase() === 'BRAD' && !r.truckingPaid) acc.push(r);
    return acc;
  }, []);
  store.set((0, _cerebral.state)(_templateObject7), _lodash2.default.groupBy(truckingNotPaid, function (t) {
    return t.source;
  }));
}

var fetch = exports.fetch = (0, _cerebral.sequence)('feed.fetch', [function () {
  return { boardName: 'Feed', listName: 'Feed Delivered', key: 'feedDeliveries' };
}, _sequences.loadList, processCards, processGroups, (0, _factories.set)((0, _cerebral.state)(_templateObject8), true)]);

var reprocessOneCard = exports.reprocessOneCard = (0, _cerebral.sequence)('feed.reprocessOneCard', [function (_ref4) {
  var store = _ref4.store,
      get = _ref4.get,
      props = _ref4.props;

  var ignoreBefore = (0, _moment2.default)(get((0, _cerebral.state)(_templateObject2)), 'YYYY-MM-DD');
  try {
    store.set((0, _cerebral.state)(_templateObject9, props.card.id), processOneCard(props.card, { ignoreBefore: ignoreBefore }));
  } catch (err) {
    store.errors.push({ error: err.toString(), card: props.card });
  }
}]);

// Expects props.id, will mark one record as invoiced in trello
var markAsInvoiced = exports.markAsInvoiced = (0, _cerebral.sequence)('feed.markAsInvoiced', [
// record id is same as cardid, so we can just use it
function (_ref5) {
  var get = _ref5.get;

  // Figure out id of "orange" color label
  var labels = get((0, _cerebral.state)(_templateObject10));
  var orangeLabel = _lodash2.default.find(labels, function (l) {
    return l.color === 'orange';
  });
  return { idLabel: orangeLabel.id };
}, _sequences.addLabelToCard, reprocessOneCard, processGroups]);
//# sourceMappingURL=sequences.js.map