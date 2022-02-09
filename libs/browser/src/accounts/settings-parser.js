const { isNaN, split } = require("lodash");

const stripQuotes = (str) => str.replace(/^["']/,'').replace(/['"]$/,'');
const noTrailingSeparators = (str) => str.replace(/[,;]+$/,'');
const clean = (str) => {
  if (!str && typeof str !== 'number') return '';
  if (typeof str !== 'string') return clean(`${str}`);
  return noTrailingSeparators(stripQuotes(str.trim()).trim()).trim();
}

const isJSON = (str) => !!str.match(/^[\{\[]/);
const isPlainString = (str) => !str.match(/:/); // plain strings have no colons
const hasSemicolon = (str) => !!str.match(/;/);
const hasComma = (str) => !!str.match(/,/);
const probablyNotANumber = (str) => !!str.match(/[^\-\$, .0-9]/); // if it has anything that wouldn't be in a number

const maybeNumber = (str) => {
  const t = +str;
  if (isNaN(t)) return str;
  return t; // a number
}

const parseOneItem = (acc, str) => {
  str = clean(str);
  if (isJSON(str)) return JSON.parse(str);
  if (isPlainString(str)) return maybeNumber(str); // no colons, it's just a single value
  // Otherise, we have a colon, so parse the key and then recursively parse the value
  const matches = str.match(/^([^:]+):(.*)$/);
  const key = clean(matches[1]);
  let val = clean(matches[2]);
  if (key.match(/s$/) && !isJSON(str) && probablyNotANumber(val) && hasComma(val)) {
    // key name ends in "s" and value has commas and is not JSON, put it into an array
    val = split(val, ',').map(v => v.trim());
  } else {
    // Otherwise, it's a normal situation so just recursively parse (could be json)
    val = parseOneItem({}, val);
  }
  return {...acc,
    [key]: val,
  };
}

// this is a note => string
// { } => JSON.parse
// [ ] => JSON.parse
//
// has a colon:
//   has a colon and at least one semicolon:
// anything: value; other thing: other  value; => into { anything: "value", "other thing": "other  value" }
//   has a colon and no semicolons: comma separator
// anything: value, other thing: other value => into { anything: "value", "other thing": "other value" }
// 
// If any values start with a quote, the quotes are stripped
// If any value could be interpreted as a number, it will be converted to a number.
// If any key ends in "s" (i.e. is plural), and has commas, it will be parsed as an array of things
module.exports = (str) => {
  str = clean(str);
  if (isJSON(str)) return JSON.parse(str);
  if (isPlainString(str)) return maybeNumber(str); // no colons, it's just a single value

  if (hasSemicolon(str)) {
    return split(str,';').reduce(parseOneItem,{})
  }

  return parseOneItem({}, str);
}
