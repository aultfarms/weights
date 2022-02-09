const _ = require('lodash');

const num = +('$1,032.31'
  .replace(/^\$/,'')
  .replace(/^-\$-/, '-') // some things start with -$-
  .replace(/^--/,'-') // some things start with --
  .replace(/,/g, ''));



console.log('replace ', num);
