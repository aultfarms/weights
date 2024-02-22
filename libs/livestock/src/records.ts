import debug from 'debug';
import type { TrelloCard } from '@aultfarms/trello';
import { client } from '@aultfarms/trello';
import { tagStrToObj } from './util.js';
import type { ErrorRecord, DeadRecord, IncomingRecord, TreatmentRecord, LivestockRecords, Tag } from './types.js';

//-------------------------------------------------------------------------------------------
// NOTE: there is more code for dead/treatments/incoming from the original apps leftover in
// libs/overmind.  I took out the save/reload functions here b/c I don't need them for
// accounting, but you may want to add them back someday.
//-------------------------------------------------------------------------------------------

const warn = debug('af/livestock#records:warn');

export async function fetchRecords(client: client.Client): Promise<LivestockRecords> {

  const livestockboardid = await client.findBoardidByName('Livestock');
  if (!livestockboardid) throw new Error('ERROR: could not find Livestock board in Trello');

  const lists = await client.findListsAndCardsOnBoard({ boardid: livestockboardid, listnames: [ 'Dead', 'Treatments', 'Incoming', 'Config' ] });
  const ret: LivestockRecords = {
    dead: { records: [], errors: [] },
    incoming: { records: [], errors: [] },
    treatments: { records: [], errors: [] },
    tagcolors: {},
  };

  // Incoming cards: (do these first b/c Dead needs it to line up tags to groups)
  const incominglist = lists.find(l => l.name === 'Incoming');
  if (!incominglist || !incominglist.cards) throw new Error('ERROR: could not find Incoming list in Livestock board');
  for (const c of incominglist.cards) {
    const r = incomingCardToRecord(c);
    if ('error' in r) ret.incoming.errors.push(r);
    else              ret.incoming.records.push(r);
  }

  // Treatment cards: 
  const treatmentlist = lists.find(l => l.name === 'Treatments');
  if (!treatmentlist || !treatmentlist.cards) throw new Error('ERROR: could not find Treatement list in Livestock board');
  for (const c of treatmentlist.cards) {
    const r = treatmentCardToRecord(c);
    if ('error' in r) ret.treatments.errors.push(r);
    else              ret.treatments.records.push(r);
  }

  // Dead cards: 
  const deadlist = lists.find(l => l.name === 'Dead');
  if (!deadlist || !deadlist.cards) throw new Error('ERROR: could not find Dead list in Livestock board');
  for (const c of deadlist.cards) {
    const r = deadCardToRecord(c);
    if ('error' in r) ret.dead.errors.push(r);
    else              ret.dead.records.push(r);
  }

  // TagColors:
  try {
    const configlist = lists.find(l => l.name === 'Config');
    if (!configlist || !configlist.cards) {
      warn('ERROR: could not find Config list in Livestock board.  Lists are: ', lists);
      throw new Error('ERROR: could not find Config list in Livestock board');
    }
    const tagcolorscard = configlist.cards.find(c => c.name === 'Tag Colors');
    if (!tagcolorscard) {
      warn('ERROR: could not find Tag Colors card in Config list.  Cards are: ', configlist.cards);
      throw new Error('ERROR: could not find Tag Colors card in Config list');
    }
    const colors = JSON.parse(tagcolorscard.desc);
    for (const [key, val] of Object.entries(colors)) {
      if (typeof key !== 'string') throw new Error('ERROR: color key '+key+' is not a string');
      if (typeof val !== 'string') throw new Error('ERROR: value ('+val+') at color key '+key+' is not a string');
    }
    ret.tagcolors = colors;
  } catch(e: any) {
    warn('FAILED to get tag colors: ', e);
  }

  return ret;
};


export function deadCardToRecord(c: TrelloCard): DeadRecord | ErrorRecord {
  try {
    if (!c) return {
      error: 'Card was falsey',
    };

    const name = c.name;

    let matches = name.match(/^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}):?(.*)$/);
    if (!matches) {
      warn('WARNING: attempted to convert card name (',name,') to dead record, but day/tag was not matched');
      return { 
        cardName: c.name, 
        id: c.id, 
        idList: c.idList, 
        error: 'WARNING: attempted to convert card name ('+name+') to dead record, but day/tag was not matched' 
      };
    }

    // Grab the day:
    const day = matches?.[1] || '1970-01-01';
    if (!(matches?.[1])) {
      warn('WARNING: attempted to convert card name (',name,') to dead record, but day was not matched');
      return { 
        cardName: c.name, 
        id: c.id, 
        idList: c.idList, 
        error: 'WARNING: attempted to convert card name ('+name+') to dead record, but day was not matched',
      };
    }

    // Grab the tags/pens
    let tags_and_pens_str = matches?.[2] || 'UNKNOWN';
    if (!(matches?.[2])) {
      warn('WARNING: attempted to convert card name (',name,') to dead record, but tag was not matched');
      return { 
        cardName: c.name, 
        id: c.id, 
        idList: c.idList, 
        error: 'WARNING: attempted to convert card name ('+name+') to dead record, but tag was not matched',
      };
    }

    // Save the note if there is one:
    matches = tags_and_pens_str.match(/[Nn][Oo][Tt][Ee]:(.*)$/);
    let note: string | false = false;
    if (matches) note = matches[1] || false;

    // Ditch anything in parentheses:
    tags_and_pens_str = tags_and_pens_str.replace(/\(.*\)/g,'');
    let tags_and_pens: RegExpMatchArray | null | string[] = tags_and_pens_str.match(/(([A-Z]+:[A-Z]{3}[0-9]{2}-[A-Z0-9]:)?[A-Za-z']+ ?([0-9]+)?)/g);
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
    if (tagObjs.filter(t => !t).length > 0) { // if there are any null tags, call this an error
      throw new Error('ERROR: could not map one of the tags ('+tags.join(',')+') to a tag object.');
    }
    return {
      date: day,
      tags: (tagObjs as Tag[]), // cast it here b/c we already ensured there are no nulls
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

export function incomingCardToRecord(c: TrelloCard): IncomingRecord | ErrorRecord {
  const cardName = c.name;
  try {
    let matches = cardName.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}):? *([^;]+);(.*)$/);
    const date = matches?.[1];
    const groupname = matches?.[2];
    if (!date) {
      return { ...c, cardName, error: 'Invalid date on card' };
    }
    if (!groupname) {
      return { ...c, cardName, error: 'Invalid groupname on card' };
    }
    const ret: IncomingRecord = { 
      date, 
      groupname, 
      cardName, 
      id: c.id, 
      idList: c.idList, 
      dateLastActivity: c.dateLastActivity 
    };
    let rest = matches?.[3];
    if (!rest) return ret;
    const parts = rest.split(';');
    for (const p of parts) {
      const [propname,propval] = p.trim().split(':');
      if (!propname || !propval) return { ...c, cardName, error: 'Unable to parse property name/value pair from string '+p };
      const key = propname.toLowerCase();
      if (key === 'into') ret.into = propval;
      if (key === 'weight') ret.weight = +(propval);
      if (key === 'head') ret.head = +(propval);
      if (key === 'tags') {
        const tagstring = propval.replace(/ /g,''); // get rid of any spaces
        ret.tags = [];
        const rangeparts = tagstring.split(',');
        for (const r of rangeparts) { // each range turns into 1 or 2 objects depending on color split
          const [start,end] = r.split('-').map(tagStrToObj); // map start and end into objects
          if (!start) return { ...c, cardName, error: 'Could not turn tag range string into starting tag object from range '+r };
          if (!end) return { ...c, cardName, error: 'Could not turn tag range string into ending tag object from range '+r };
          if (start.color !== end.color) {
            ret.tags.push({ start, end: { color: start.color, number: 1000 } });
            ret.tags.push({ start: { color: end.color, number: 1 }, end });
          } else {
            // Just one range, put it on there
            ret.tags.push({start, end});
          }
        }
      }
    }
    return ret;
  } catch(e: any) {
    return { ...c, cardName, error: 'Uncaught error on incomingCardToRecord: '+e.toString() };
  }
};

export function treatmentCardToRecord(c: TrelloCard): TreatmentRecord | ErrorRecord {
  const cardName = c.name;
  try {
    const datematches = cardName.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}):(.*)$/);
    if (!datematches || datematches.length < 3) return { ...c, cardName, error: 'Invalid date on treatment card' };
    const date = datematches[1]!.trim();
    let rest = datematches[2]!.trim();
    const treatmentmatches = rest.match(/^(.+):(.*)$/);
    if (!treatmentmatches || treatmentmatches.length < 3) return { ...c, cardName, error: 'Invalid treatment string on card' };
    const treatment = treatmentmatches[1]!.trim();
    rest = treatmentmatches[2]!.trim();
    const tags = rest.split(' ').map(tagStrToObj);
    if (tags.filter(t => !t).length > 0) { // if there are any null tags, call this an error
      throw new Error('ERROR: could not map one of the tags ('+tags.join(',')+') to a tag object.');
    }
    return { 
      date, 
      treatment, 
      tags: (tags as Tag[]), // cast here b/c we already ensured no nulls with the filter above
      id: c.id,
      idList: c.idList,
      cardName: c.name, 
      dateLastActivity: c.dateLastActivity
    };
  } catch(e: any) {
    return { ...c, cardName, error: 'Uncaught error in treatmentCardToRecord: '+e.toString() };
  }
};




