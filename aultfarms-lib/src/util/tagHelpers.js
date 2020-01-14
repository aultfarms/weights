import _ from 'lodash';
import moment from 'moment';

// Note that a tag range is pre-processed to ensure that it
// only has tags of the same color.  If there is a color
// split on a group, the group will have 2 separate ranges.
export const rangeContainsTag = (r, tag) => {
  return (
    tag.color === r.start.color &&
    tag.number >= r.start.number && 
    tag.number <= r.end.number
  );
}

export const groupContainsTag = (group,tag) => {
  //console.log('checking tag ',tag,' against group ranges ', group);
  return _.find(group.tag_ranges, r => rangeContainsTag(r,tag));
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
export const groupForTag = (groups,tag,asOfDate=false) => {
  // If the tag already has a "groupname" key, just return that:
  if (tag && tag.groupname) return _.find(groups, g => g.groupname === tag.groupname);

  const allfound = _.filter(groups, g => groupContainsTag(g,tag));
  // if none, return false:
  if (!allfound || allfound.length < 1) return false;
  if (!asOfDate) asOfDate = moment(); // default to today
  else asOfDate = moment(asOfDate, 'YYYY-MM-DD');
  const filteredToDate = _.filter(allfound, g => !moment(g.date,'YYYY-MM-DD').isAfter(asOfDate)); // !isAfter = equal or before
  if (!filteredToDate) {
    console.log('WARNING: groupForTag: found multiple possible groups, but after filtering for date there were none left!');
    return false;
  }
  const sorted = _.sortBy(filteredToDate, g => g.date);
  // default lexical sorting will put oldest on top, newest on bottom.  
  // Need to take the newest one that is prior to the reference date
  return sorted[sorted.length-1];
};

export const tagStrToObj = str => {
  str = str.trim();
  // First, check if it is group-prefixed tag:
  const groupmatches = str.match(/^([A-Z]+:[A-Z]{3}[0-9]{2}-[0-9A-Z]):([A-Za-z]+) *([0-9]+)$/);
  if (groupmatches) {
    return { groupname: groupmatches[1], color: groupmatches[2], number: +(groupmatches[3] || 1) };
  }
  // Otherwise, it is just a color/number combo:
  const matches = str.match(/^([A-Za-z]+) ?([0-9]+)?$/);
  if (!matches) return { color: 'NOTAG', number: 1 };
  return { color: matches[1], number: +(matches[2]) || 1 };
}

export const tagObjToStr = t => {
  if (!t) return '';
  let str = '';
  if (t.groupname) str += t.groupname+':'; // group:colornumber
  str += (t.color || '');
  str += (t.number || '');
  return str;
}
