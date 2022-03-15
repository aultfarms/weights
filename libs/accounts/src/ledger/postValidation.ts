// These functions can be run AFTER the ledger validates.  They are the sort of things that
// shouldn't invalidate the ledger, but are "todos" that should be taken care of sometime.
import moment, { Moment } from 'moment';
import type { AccountTx } from './types.js';
import ajvLib from 'ajv';
import type { JSONSchema8 } from 'jsonschema8';
import debug from 'debug';

const trace = debug('af/accounts#ledger/postValidation:trace');

export { JSONSchema8 };

//const numberpat = '-?[0-9]+(\.[0-9]+)?';
const outidpat = '[0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Z]';
export const categorySchemas: { [cat: string]: JSONSchema8 } = {
  'sales-grain': { 
    type: 'object', 
    properties: { 
      bushels: { type: 'number' },
    },
    required: [ 'bushels' ],
  },
  'fuel': { 
    type: 'object',
    properties: { 
      gallons: { type: 'number' },
    },
    required: [ 'gallons' ],
  },
  'sales-cattle': {
    oneOf: [ // could have one outid or multiple outid's
      {
        type: 'object',
        properties: {
          head: { type: 'number' },
          loads: { type: 'number' },
          weight: { type: 'number' },
          outid: { type: 'string', pattern: outidpat },
        },
        required: ['head', 'loads', 'weight', 'outid'],
      },
      {
        type: 'object',
        properties: {
          head: { type: 'number' },
          loads: { type: 'number' },
          weight: { type: 'number' },
          outids: { 
            type: 'array', 
            items: { type: 'string', pattern: outidpat },
          },
        },
        required: ['head', 'loads', 'weight', 'outids'],
      },
    ],
  },
  'cattle-purchase-cattle': {
    type: 'object',
    properties: {
      head: { type: 'number' },
      loads: { type: 'number' },
      weight: { type: 'number' }, // BKTKY:AUG20-1
      incomingid: { type: 'string', pattern: '[A-Z]:[A-Z]{3}[0-9]{2}-[0-9]' },
    },
    required: [ 'head', 'loads', 'weight', 'incomingid' ],
  },
  'crop-seed': {
    type: 'object',
    properties: {
      bags: { type: 'number' },
    },
    required: [ 'bags' ],
  },
};

export function validateNoteSchemaForCatgory(
  { account, catname, startDate, schema, exactCatnameMatch }:
  { account: { lines: AccountTx[] }, 
    catname: string, 
    schema: JSONSchema8,
    startDate: string | Moment, 
    exactCatnameMatch?: true,
  }
): { line: AccountTx, error: string }[] | null {

  if (typeof startDate === 'string') {
    startDate = moment(startDate, 'YYYY-MM-DD');
  }
 
  const ajv = new ajvLib();
  const validate = ajv.compile(schema);
  const errs: { line: AccountTx, error: string }[] = [];
  for (const l of account.lines) {
    if (l.date.isBefore(startDate)) continue;
    // If not exact, then treat catname as a prefix:
    if (exactCatnameMatch) {
      if (l.category !== catname) continue;
    } else {
      if (!l.category.startsWith(catname)) continue;
    }
    trace('Validating l.note', l.note, 'against schema for catgory', catname);
    // validate the note against the schema
    if (validate(l.note)) continue;
    trace('FAILED VALIDATION!!!!!');
    // If it fails, track the errors:
    const err = ajv.errorsText(validate.errors, { separator: '\n' });
    if (err) errs.push({ line: l, error: err });
  }
  if (errs.length < 1) return null;
  return errs;
}

export function validateNotesAllSchemas(
  {account, schemas, startDate }:
  { account: { lines: AccountTx[] }, 
    startDate: string | Moment, 
    schemas?: { [catname: string]: JSONSchema8 } 
  }
): {[catname: string]: {line: AccountTx, error: string}[] | null } {
  if (!schemas) schemas = categorySchemas;
  // Fancy way of getting res to be what we can reasonably return from this function:
  const res: Awaited<ReturnType<typeof validateNotesAllSchemas>> = {};
  for (const [catname, schema] of Object.entries(schemas)) {
    res[catname] = validateNoteSchemaForCatgory({account, catname, schema, startDate});
  }
  return res;
}
