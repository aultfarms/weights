import _ from 'lodash';

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

export const groupForTag = (groups,tag) => _.find(groups,g => groupContainsTag(g,tag));

export const tagStrToObj = str => {
  const matches = str.trim().match(/^([A-Za-z]+) ?([0-9]+)?$/);
  if (!matches) return { color: 'NOTAG', number: 1 };
  return { color: matches[1], number: +(matches[2]) || 1 };
}
