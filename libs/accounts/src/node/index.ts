export * from '../index.js';

// In node, can include the xlsx reader that reads from the filesystem:
export * as spreadsheets from './spreadsheets.js';

// The node typings are exported, but the package.json can't specify a separate 
// typings file sadly.  So, we'll just make sure this exports at least the same functions as the 
// browser lib

export * as google from './google.js';
