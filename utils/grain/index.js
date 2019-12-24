// This is a quick script to sum up the total bushels in the grain hauling board.
const Promise = require('bluebird');
Promise.longStackTraces();
const Trello = require('node-trello');
const _ = require('lodash');
const moment = require('moment');
const numeral = require('numeral');

const token = require('/Users/aultac/.trello/token.js');

const t = Promise.promisifyAll(new Trello(token.devKey, token.token));

const config = {
  board: { name: 'Grain hauling' },
};


function mapList(l) {
  let matches = _.split(l.name, '-');
  const seller = matches[0].trim();
  const listDestination = matches[1] ? matches[1].trim() : '';
  return {
    seller,
    listDestination,
    id:l.id,
    name:l.name,
    loads: [],
    trelloList: l,
  };
}

function mapCard(c) {
  try {
    const list = config.lists[c.idList];
    let rest = c.name.trim();
    let matches = rest.match(/^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}): *(.*)$/);
    const date = moment(matches[1], 'YYYY-MM-DD');
    rest = matches[2];
    matches = rest.match(/^([0-9,]+(\.[0-9]+)?) +bu +(.*)$/);
    const bushels = +(matches[1].replace(',',''));
    rest = matches[3];
    matches = rest.match(/^(CORN|BEANS|WHEAT)\. +(.*)$/);
    const crop = matches[1];
    rest = matches[2];
    matches = rest.match(/^([^-]+) *- *(.*)$/);
    const destination = matches[1].trim();
    rest = matches[2];
    matches = rest.match(/^Tkt #([^- ]+) *- *(.*)$/);
    const ticket = matches[1].trim();
    rest = matches[2];
    matches = rest.match(/^([^.]+)\.(.*)$/);
    const notes = (rest && rest.trim()) || '';
  
  // TODO: add labels
    return {date,bushels,crop,destination,ticket,notes,
      seller: list.seller,
      listDestination: list.listDestination,
      trelloCard: c,
    };
  } catch (e) {
    console.log('ERROR ON CARD: ', c);
    console.log('Error was: ', e);
    throw e;
  }
}

// Get board info:
t.getAsync('/1/members/me/boards', { fields: 'name,id,closed' })
.filter(b => !b.closed)
.filter(b => b.name === 'Grain hauling')
.then(gb => config.board.id = gb[0].id)

// Get lists info:
.then(() => t.getAsync(`/1/boards/${config.board.id}/lists`, { fields: 'name,id,closed' }))
.filter(l => !l.closed)
.filter(l => l.name !== 'Web Controls')
.map(mapList)
.then(lists => config.lists = _.keyBy(lists, 'id'))

// Get cards for board, sort into lists:
.then(() => t.getAsync(`/1/boards/${config.board.id}/cards`, { fields: 'name,id,closed,idList' }))
.filter(c => !c.closed)
.filter(c => !!config.lists[c.idList]) // only keep ones we have lists for
.map(mapCard)
.each(r => {
  config.lists[r.trelloCard.idList].loads.push(r);
})
.then(() => _.keys(config.lists))

// Print each list with a running balance total so you can decide what to keep and what to throw away
.each(lkey => {
  const l = config.lists[lkey];
  // Split each list by the crops found in that list
  const crops_in_list = _.keys(_.reduce(l.loads, (acc,ld) => {
    acc[ld.crop] = true;
    return acc;
  }, {}));
  _.each(crops_in_list, crop => {

    console.log('-----------------------------------------------------');
    console.log(' List: ',l.name, ', CROP: ', crop);
    if (!l.loads || l.loads.length < 1) {
      console.log('< None >');
      return lkey;
    }
    console.log('Date\t\tBushels\t\tMonth\tMonthTotal\tTotal\tCrop');
    const sorted = _.sortBy(l.loads, c => c.date);
    let total = 0;
    let monthtotal = 0;
    let prevmonth = 0;
    _.each(sorted, c => {
      const month = c.date.month();
      const year = c.date.year();
      // print monthly summaries too
      if (prevmonth !== month) {
        monthtotal = 0;
        console.log('\t+----  '+year+'-'+numeral(month+1).format('00')+'  ----+');
      }
      prevmonth = month;
      monthtotal += c.bushels;
      total += c.bushels;
      console.log(c.date.format('YYYY-MM-DD'), '\t', 
                  c.bushels < 1000 ? '  ' : '',
                  numeral(c.bushels).format('0,0.00'), ' bu\t', 
                  c.date.format('MMMYY'), '\t',
                  monthtotal < 1000 ? '   ' : monthtotal < 10000 ? ' ' : '' ,
                  numeral(monthtotal).format('0,0.00'), 'bu\t',
                  total < 1000 ? '   ' : total < 10000 ? ' ' : '' ,
                  numeral(total).format('0,0.00'),
                  crop);
    });
  });
  return lkey;
});

