const _ = require('lodash');

module.exports = {
  isStart: tx => {
    return !!_.find(_.values(tx), v => {
      if (!v || typeof v !== 'string') return false;
      return v.toString()?.trim() === 'START';
    });
  },
};
