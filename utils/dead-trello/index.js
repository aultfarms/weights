(async () => {
// This is a quick script to sum up the total bushels in the grain hauling board.
const Promise = require('bluebird');
Promise.longStackTraces();
const _ = require('lodash');
//const Trello = require('node-trello');
const moment = require('moment');
const debug = require('debug');
const info = debug('dead-trello:info');
const trace = debug('dead-trello:trace');
const warn = debug('dead-trello:warn');

const fetch = (await import('node-fetch')).default;

const token = require('/Users/aultac/.trello/token.js');

//const t = Promise.promisifyAll(new Trello(token.devKey, token.token));

async function getAsync(trello_url, { fields }) {
  let url = `https://api.trello.com/${trello_url}?key=${token.devKey}&token=${token.token}`;
  if (fields) {
    url += `&fields=${fields}`;
  }
  // Promise.resovle converts to bluebird promise
  return Promise.resolve(fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
  }).then(res => res.json()));
}

const config = {
  board: { name: 'Livestock' },
  // dead: { cards: , records: }
  // incoming: { cards: , records: }
};

/*********************************************************************
 *
 * This was all copy-pasted from the old overmind modules that have yet
 * to be re-written in typescript.  Because it was quick and I just needed
 * to see all the deads by group so I can verify we have the right totals
 * for each incoming group when they moved to main facility.
 *
 * ********************************************************************/

// Note that a tag range is pre-processed to ensure that it
// only has tags of the same color.  If there is a color
// split on a group, the group will have 2 separate ranges.
const rangeContainsTag = (r, tag) => {
  return (
    tag.color === r.start.color &&
    tag.number >= r.start.number &&
    tag.number <= r.end.number
  );
}

const groupContainsTag = (group,tag) => {
  //console.log('checking tag ',tag,' against group ranges ', group);
  return !!group.tag_ranges?.find(r => rangeContainsTag(r,tag));
};


// groupForTag has to deal with historic repeated tag color/number
// combinations.  i.e. 3 years ago another "RED13" may have existed.
// We need to figure out which one of these is the "correct" one.
// This can be slightly fuzzy, because one or two mistakes is not
// going to break the bank.
//
// The simplest algorithm is one that assumes there is only one
// of each combo on-site at any given time.  Therefore, when a
// new group comes in and gets tagged, they supercede any previous
// version of that tag.  So the "latest" copy of the tag is always
// the "correct" one for "today".
//
// Unfortunately, sometimes our scripts may want to compute historic death
// loss and things like that.  "historic" means sometimes we're looking in
// a date range that is not "today".  Therefore, we have to uglify this
// function definition by adding a third optional parameter of "asOfDate"
// which is the ballpark date of interest: i.e. it will take the tag number
// as of that day.
const groupForTag = (groups,tag,asOfDateString=false) => {
  // If the tag already has a "groupname" key, just return that:
  if (tag && tag.groupname)
    return groups.find(g => g.groupname === tag.groupname) || false;

  const allfound = groups.filter(g => groupContainsTag(g,tag));
  // if none, return false:
  if (!allfound || allfound.length < 1) return false;
  const asOfDate = asOfDateString ? moment(asOfDateString, 'YYYY-MM-DD') : moment();

  const filteredToDate = allfound.filter(g => !moment(g.date,'YYYY-MM-DD').isAfter(asOfDate)); // !isAfter = equal or before
  if (!filteredToDate || filteredToDate.length < 1) {
    warn('WARNING: groupForTag: found multiple possible groups, but after filtering for date there were none left!');
    return false;
  }
  // string comparison below from https://stackoverflow.com/questions/1179366/is-there-a-javascript-strcmp:
  filteredToDate.sort((g1,g2) => (g1.date < g2.date ? -1 : +(g1.date > g2.date)));
  // default lexical sorting will put oldest on top, newest on bottom.
  // Need to take the newest one that is prior to the reference date
  return filteredToDate[filteredToDate.length-1] || false;
};

// give it a card name and it will give you back a mapper for it so it can print on errors
const tagStrToObj = (cardname) => (str) => {
  str = str.trim();
  // First, check if it is group-prefixed tag:
  const groupmatches = str.match(/^([A-Z]+:[A-Z]{3}[0-9]{2}-[0-9A-Z]):([A-Za-z]+) *([0-9]+)$/);
  if (groupmatches) {
    if (!groupmatches[2]) {
      warn('WARNING: attempted to convert string ', str, 'to tag, but color was invalid.  Matches = ', groupmatches,'.  Card was: ', cardname);
    }
    return {
      groupname: groupmatches[1],
      color: groupmatches[2] || 'UNKNOWNCOLOR',
      number: +(groupmatches[3] || 1)
    };
  }
  // Otherwise, it is just a color/number combo:
  const matches = str.match(/^([A-Za-z]+) ?([0-9]+)?$/);
  if (!matches) return { color: 'NOTAG', number: 1 };
  if (!matches[1] || !matches[2]) {
    warn('WARNING: attempted to convert string ', str, 'to tag (not a group tag), but had invalid matches.  Matches = ', matches, '.  Card was: ', cardname);
  }
  return {
    color: matches[1] || 'UNKNOWNCOLOR',
    number: +(matches[2] || 1),
  };
}

const tagObjToStr = (t) => {
  if (!t) {
    warn('WARNING: attempted to convert tag object', t, 'to string, but t was falsey');
    return '';
  }
  let str = '';
  if (t.groupname) str += t.groupname+':'; // group:colornumber
  str += (t.color || '');
  str += (t.number || '');
  return str;
}
const computeStats = () => {
  // check if we have both dead and incoming records:
  const deadrecords = config.dead.records;
  const incoming = config.incoming.records;

  // group all deads into the appropriate incoming group, keyed by groupname
  const groupdeads = _.reduce(deadrecords, (acc,d) => {
    if (!d.tags) console.log('incoming.computeStats: WARNING: dead record has no tags.  Card name = ', d.cardName);
    _.each(d.tags, t => {
      const g = groupForTag(incoming, t, d.date);
      if (!g) return; // this is likely an old tag that has no known group, or a notag
      if (!acc[g.groupname]) acc[g.groupname] = [];
      acc[g.groupname].push({ date: d.date, tag: t });
    });
    return acc;
  }, {});

  // walk through all incoming records and add a "dead" key with the list of dead
  _.each(incoming, (g) => {
    g.dead = groupdeads[g.groupname] || [];
  });

};
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
      const [start,end] = _.map(r.split('-'), tagStrToObj(name)); // map start and end into objects
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


//---------------------------------------------------------------------
// fetch all dead records:
const deadCardToRecord = (c) => {
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
    let note = false;
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
    const tagObjs = tags.map(tagStrToObj(c.name));
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
  } catch(err) {
    return {
      cardName: c.name,
      idList: c.idList,
      id: c.id,
      error: err?.toString() || '',
    };
  }
};

// Get board info:
const boards = await getAsync('/1/members/me/boards', { fields: 'name,id,closed' });
await Promise.filter(boards, b => !b.closed)
.filter(b => b.name === 'Livestock')
.then(gb => config.board.id = gb[0].id)
.tap(() => trace(`Found board id: ${config.board.id}`));

// Get lists info:
const lists = await getAsync(`/1/boards/${config.board.id}/lists`, { fields: 'name,id,closed' });
await Promise.filter(lists,l => !l.closed)
.then(lists => {
  config.lists = lists;
  for (const l of lists) {
    if (l.name === 'Incoming') {
      config.incoming = { list: l };
      continue;
    }
    if (l.name === 'Dead') {
      config.dead = { list: l };
      continue;
    }
  }
})
.tap(() => trace(`Found lists: ${JSON.stringify(config.lists,false,'  ')}`))

// Get cards for board, sort into lists:
const cards = await getAsync(`/1/boards/${config.board.id}/cards`, { fields: 'name,id,closed,idList' });
await Promise.filter(cards, c => !c.closed)
.then(cards => {
  for (const c of cards) {
    if (c.idList === config.incoming.list.id) {
      if (!config.incoming.cards)   config.incoming.cards = [];
      if (!config.incoming.records) config.incoming.records = [];
      config.incoming.cards.push(c);
      config.incoming.records.push(incomingCardToRecord(c));
      continue;
    }
    if (c.idList === config.dead.list.id) {
      if (!config.dead.cards) config.dead.cards = [];
      if (!config.dead.records) config.dead.records = [];
      const rec = deadCardToRecord(c);
      if (moment(rec.date,'YYYY-MM-DD').isAfter(moment('2020-01-01', 'YYYY-MM-DD'))) {
        config.dead.cards.push(c);
        config.dead.records.push(rec);
      }
      continue;
    }
    // Otherwise, not a dead or incoming card
  }

  computeStats();

  // Now print each group's dead records, grouped with the group and in-order by date.
  for (const i of config.incoming.records) {
    console.log('************************************************************');
    console.log(' Group: ',i.groupname, ', Incoming date: ', i.date);
    if (!i.dead || i.dead.length < 1) {
      console.log(' NO DEAD ANIMALS IN THIS GROUP!');
      continue;
    }
    i.dead.sort((a,b) => (moment(a.date, 'YYYY-MM-DD').unix() - moment(b.date, 'YYYY-MM-DD').unix()));
    let count = 1;
    for (const d of i.dead) {
      console.log(d.date, '\t', count++, '\t',d.tag.color+d.tag.number);
    }
  }

  // Finally, print a table of day\tcount dead totals to simplify making the inventory
  // No longer needed after inventory is handled automatically in accounting
  /*
  console.log('------------------------------------------------------------------------');
  console.log('------------------------------------------------------------------------');
  console.log('------------------------------------------------------------------------');
  console.log('------------------------------------------------------------------------');
  console.log(' ');
  const sorted = config.dead.records.sort((a,b) => (moment(a.date, 'YYYY-MM-DD') - moment(b.date, 'YYYY-MM-DD')));
  for (const d of sorted) {
    console.log(`${d.date},${d.tags.length}`);
  }
  */
})

})();