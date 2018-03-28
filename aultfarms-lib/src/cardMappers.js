


export const statsFactory = list => ({state}) => {
  if (list !== 'dead' && list !== 'incoming') return; // only running dead stats by group at the moment
  // check if we have both dead and incoming records:
  const deadrecords = state.get('app.records.dead');
  const incoming = state.get('app.records.incoming');
  if (!deadrecords || !incoming) {
    console.log('statsFactory: We do not have both dead and incoming yet');
    return;
  }

  // Organize the dead by tag color:
  const dead = _.reduce(deadrecords, (acc,d) => {
    if (!d.tags) {
      console.log('WARNING: dead record has no tags.  Card name = ', d.cardName);
    }
    _.each(d.tags, t => {
      if (!acc[t.color]) acc[t.color] = [];
      acc[t.color].push({ date: d.date, tag: t });
    });
    return acc;
  },{});

  // Walk through each incoming group to push dead ones onto it's dead list:
  _.each(incoming, (group,index) => {
    if (!group.tag_ranges) return;
    state.set(['app', 'records', 'incoming', index, 'dead'], _.reduce(group.tag_ranges, (acc,r) => {
      _.each(dead[r.start.color], deadone => {
        if (!rangeContainsTag(r, deadone.tag)) return;
        acc.push(deadone); // otherwise, it's in the range so count it
      });
      return acc;
    },[]));
  });
}

