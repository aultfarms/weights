import debug from 'debug';

const info = debug('af/accounts#ten99/settings:info');

export type Ten99SettingsCategory = {
  name: string, // name of category
  alwaysReport?: boolean,
};

export type Ten99SettingsPerson = {
  name: string,
  taxid: string,
  address: string, // multi-line string
  othernames: string[],
};

export type Ten99Settings = {
  categories: Ten99SettingsCategory[],
  people: Ten99SettingsPerson[],
};


function othernamesParser(str: string): string[] {
  str = str.trim();
  if (!str) return [];
  if (str[0] === '[') { // JSON array of names (use when there are commas in the name)
    return (JSON.parse(str) as string[]);
  }
  if (str[0] === '"') { // single name with a comma, surrounded by double quotes
    return [ (JSON.parse(str) as string) ];
  }
  return str.split(',').map(s => s.trim());
}

// Given a sheet-to-json-like object from a spreadsheet, convert it into
// a valid Ten99Settings
export function importSettings(
  { rawpeople, rawcategories }: 
  { rawpeople: any[], rawcategories: any[] }
): Ten99Settings {
  const people: Ten99SettingsPerson[] = [];
  const categories: Ten99SettingsCategory[] = [];

  for (const [index, rp] of rawpeople.entries()) {
    const person: Ten99SettingsPerson = {
      name: '',
      taxid: '',
      address: '',
      othernames: [],
    };
    if (typeof rp !== 'object') continue;
    if (typeof rp['name'] === 'string') person.name = rp['name'];
    if (typeof rp['taxid'] === 'string') person.taxid = rp['taxid'];
    if (typeof rp['address'] === 'string') person.address = rp['address'];
    if (typeof rp['othernames'] === 'string' && rp['othernames'].trim() !== '') {
      person.othernames = othernamesParser(rp['othernames']);
    }
    if (!person.name) {
      info(`WARNING: line ${index} of people sheet had no name`);
      continue;
    }
    people.push(person);
  }

  for (const [index, rc] of rawcategories.entries()) {
    const cat: Ten99SettingsCategory = {
      name: ''
    };
    if (typeof rc['name'] === 'string') cat.name = rc['name'];
    if (typeof rc['alwaysReport'] === 'string' && rc['alwaysReport'].trim()) cat.alwaysReport = true;
    if (!cat.name) {
      info(`WARNING: line ${index} of categories sheet had no name`);
      continue;
    }
    categories.push(cat);
  }

  return { people, categories };
}
