import dayjs from 'dayjs';
import 'dayjs/plugin/customParseFormat.js';
import debug from 'debug';
//-------------------------------------------------------------------------------------------
// NOTE: there is more code for dead/treatments/incoming from the original apps leftover in
// libs/overmind.  I took out the save/reload functions here b/c I don't need them for
// accounting, but you may want to add them back someday.
//-------------------------------------------------------------------------------------------
const info = debug('af/trello#livestock:info');
const warn = debug('af/trello#livestock:warn');
//-------------------------------------------------------------
// Tag Helpers
//-------------------------------------------------------------
// Note that a tag range is pre-processed to ensure that it
// only has tags of the same color.  If there is a color
// split on a group, the group will have 2 separate ranges.
export function rangeContainsTag(r, tag) {
    return (tag.color === r.start.color &&
        tag.number >= r.start.number &&
        tag.number <= r.end.number);
}
export function groupContainsTag(group, tag) {
    return !!group.tags?.find(r => rangeContainsTag(r, tag));
}
;
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
export function groupForTag(records, tag, asOfDateString = false) {
    const groups = records.incoming.records;
    // If the tag already has a "groupname" key, just return that:
    if (tag && tag.groupname)
        return groups.find(g => g.groupname === tag.groupname) || false;
    const allfound = groups.filter(g => groupContainsTag(g, tag));
    // if none, return false:
    if (!allfound || allfound.length < 1)
        return false;
    const asOfDate = asOfDateString ? dayjs(asOfDateString, 'YYYY-MM-DD') : dayjs();
    const filteredToDate = allfound.filter(g => !dayjs(g.date, 'YYYY-MM-DD').isAfter(asOfDate)); // !isAfter = equal or before
    if (!filteredToDate || filteredToDate.length < 1) {
        warn('WARNING: groupForTag: found multiple possible groups, but after filtering for date there were none left!');
        return false;
    }
    // string comparison below from https://stackoverflow.com/questions/1179366/is-there-a-javascript-strcmp:
    filteredToDate.sort((g1, g2) => (g1.date < g2.date ? -1 : +(g1.date > g2.date)));
    // default lexical sorting will put oldest on top, newest on bottom.  
    // Need to take the newest one that is prior to the reference date
    return filteredToDate[filteredToDate.length - 1] || false;
}
;
export function tagStrToObj(str) {
    str = str.trim();
    // First, check if it is group-prefixed tag:
    const groupmatches = str.match(/^([A-Z]+:[A-Z]{3}[0-9]{2}-[0-9A-Z]):([A-Za-z]+) *([0-9]+)$/);
    if (groupmatches) {
        if (!groupmatches[2]) {
            warn('WARNING: attempted to convert string ', str, 'to tag, but color was invalid.  Matches = ', groupmatches);
        }
        return {
            groupname: groupmatches[1],
            color: groupmatches[2] || 'UNKNOWNCOLOR',
            number: +(groupmatches[3] || 1)
        };
    }
    // Otherwise, it is just a color/number combo:
    const matches = str.match(/^([A-Za-z]+) ?([0-9]+)?$/);
    if (!matches)
        return { color: 'NOTAG', number: 1 };
    if (!matches[1] || !matches[2]) {
        warn('WARNING: attempted to convert string ', str, 'to tag (not a group tag), but had invalid matches.  Matches = ', matches);
    }
    return {
        color: matches[1] || 'UNKNOWNCOLOR',
        number: +(matches[2] || 1),
    };
}
export function tagObjToStr(t) {
    if (!t) {
        warn('WARNING: attempted to convert tag object', t, 'to string, but t was falsey');
        return '';
    }
    let str = '';
    if (t.groupname)
        str += t.groupname + ':'; // group:colornumber
    str += (t.color || '');
    str += (t.number || '');
    return str;
}
//--------------------------------------------------------
// The Main Event
//--------------------------------------------------------
export async function fetchRecords(client) {
    const livestockboardid = await client.findBoardidByName('Livestock');
    if (!livestockboardid)
        throw new Error('ERROR: could not find Livestock board in Trello');
    const lists = await client.findListsAndCardsOnBoard({ boardid: livestockboardid, listnames: ['Dead', 'Treatments', 'Incoming'] });
    const ret = {
        dead: { records: [], errors: [] },
        incoming: { records: [], errors: [] },
        treatments: { records: [], errors: [] },
    };
    // Incoming cards: (do these first b/c Dead needs it to line up tags to groups)
    const incominglist = lists.find(l => l.name === 'Incoming');
    if (!incominglist || !incominglist.cards)
        throw new Error('ERROR: could not find Incoming list in Livestock board');
    for (const c of incominglist.cards) {
        const r = incomingCardToRecord(c);
        if ('error' in r)
            ret.incoming.errors.push(r);
        else
            ret.incoming.records.push(r);
    }
    // Treatment cards: 
    const treatmentlist = lists.find(l => l.name === 'Treatments');
    if (!treatmentlist || !treatmentlist.cards)
        throw new Error('ERROR: could not find Treatement list in Livestock board');
    for (const c of treatmentlist.cards) {
        const r = treatmentCardToRecord(c);
        if ('error' in r)
            ret.treatments.errors.push(r);
        else
            ret.treatments.records.push(r);
    }
    // Dead cards: 
    const deadlist = lists.find(l => l.name === 'Dead');
    if (!deadlist || !deadlist.cards)
        throw new Error('ERROR: could not find Dead list in Livestock board');
    for (const c of deadlist.cards) {
        const r = deadCardToRecord(c);
        if ('error' in r)
            ret.dead.errors.push(r);
        else
            ret.dead.records.push(r);
    }
    return ret;
}
;
export function deadCardToRecord(c) {
    try {
        if (!c)
            return {
                error: 'Card was falsey',
            };
        const name = c.name;
        let matches = name.match(/^([0-9]{4}-[0-9]{1,2}-[0-9]{1,2}):?(.*)$/);
        if (!matches) {
            warn('WARNING: attempted to convert card name (', name, ') to dead record, but day/tag was not matched');
            matches = [];
        }
        // Grab the day:
        const day = matches[1] || '1970-01-01';
        if (!matches[1]) {
            warn('WARNING: attempted to convert card name (', name, ') to dead record, but day was not matched');
        }
        // Grab the tags/pens
        let tags_and_pens_str = matches[2] || 'UNKNOWN';
        if (!matches[2]) {
            warn('WARNING: attempted to convert card name (', name, ') to dead record, but tag was not matched');
        }
        // Save the note if there is one:
        matches = tags_and_pens_str.match(/[Nn][Oo][Tt][Ee]:(.*)$/);
        let note = false;
        if (matches)
            note = matches[1] || false;
        // Ditch anything in parentheses:
        tags_and_pens_str = tags_and_pens_str.replace(/\(.*\)/g, '');
        let tags_and_pens = tags_and_pens_str.match(/(([A-Z]+:[A-Z]{3}[0-9]{2}-[A-Z0-9]:)?[A-Za-z']+ ?([0-9]+)?)/g);
        if (!tags_and_pens)
            tags_and_pens = [];
        tags_and_pens = tags_and_pens.map(tp => tp.trim());
        tags_and_pens = tags_and_pens.map(tp => (tp === 'NT' ? 'NOTAG1' : tp));
        // eliminate everything that isn't just tags
        let tags = tags_and_pens.filter(t => !t.match(/^[NSB][0-9S]{1,2}$/i) && // N1, NS, S1, B3
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
            !t.match(/^and/i));
        // fixup bad tags:
        tags = tags.map(t => t.toUpperCase().replace(/ /g, ''));
        tags = tags.map(t => (t === 'NOTAG' ? 'NOTAG1' : t));
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
    }
    catch (err) {
        return {
            cardName: c.name,
            idList: c.idList,
            id: c.id,
            error: err?.toString() || '',
        };
    }
}
;
export function incomingCardToRecord(c) {
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
        const ret = {
            date,
            groupname,
            cardName,
            id: c.id,
            idList: c.idList,
            dateLastActivity: c.dateLastActivity
        };
        let rest = matches?.[3];
        if (!rest)
            return ret;
        const parts = rest.split(';');
        for (const p of parts) {
            const [propname, propval] = p.trim().split(':');
            if (!propname || !propval)
                return { ...c, cardName, error: 'Unable to parse property name/value pair from string ' + p };
            const key = propname.toLowerCase();
            if (key === 'into')
                ret.into = propval;
            if (key === 'weight')
                ret.weight = +(propval);
            if (key === 'head')
                ret.head = +(propval);
            if (key === 'tags') {
                const tagstring = propval.replace(/ /g, ''); // get rid of any spaces
                ret.tags = [];
                const rangeparts = tagstring.split(',');
                for (const r of rangeparts) { // each range turns into 1 or 2 objects depending on color split
                    const [start, end] = r.split('-').map(tagStrToObj); // map start and end into objects
                    if (!start)
                        return { ...c, cardName, error: 'Could not turn tag range string into starting tag object from range ' + r };
                    if (!end)
                        return { ...c, cardName, error: 'Could not turn tag range string into ending tag object from range ' + r };
                    if (start.color !== end.color) {
                        ret.tags.push({ start, end: { color: start.color, number: 1000 } });
                        ret.tags.push({ start: { color: end.color, number: 1 }, end });
                    }
                    else {
                        // Just one range, put it on there
                        ret.tags.push({ start, end });
                    }
                }
            }
        }
        return ret;
    }
    catch (e) {
        return { ...c, cardName, error: 'Uncaught error on incomingCardToRecord: ' + e.toString() };
    }
}
;
export function treatmentCardToRecord(c) {
    const cardName = c.name;
    try {
        const datematches = cardName.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2}):(.*)$/);
        if (!datematches || datematches.length < 3)
            return { ...c, cardName, error: 'Invalid date on treatment card' };
        const date = datematches[1].trim();
        let rest = datematches[2].trim();
        const treatmentmatches = rest.match(/^(.+):(.*)$/);
        if (!treatmentmatches || treatmentmatches.length < 3)
            return { ...c, cardName, error: 'Invalid treatment string on card' };
        const treatment = treatmentmatches[1].trim();
        rest = treatmentmatches[2].trim();
        const tags = rest.split(' ').map(tagStrToObj);
        return {
            date,
            treatment,
            tags,
            id: c.id,
            idList: c.idList,
            cardName: c.name,
            dateLastActivity: c.dateLastActivity
        };
    }
    catch (e) {
        return { ...c, cardName, error: 'Uncaught error in treatmentCardToRecord: ' + e.toString() };
    }
}
;
//# sourceMappingURL=livestock.js.map