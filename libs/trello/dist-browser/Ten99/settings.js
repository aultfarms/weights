import debug from 'debug';
const info = debug('af/accounts#ten99/settings:info');
function othernamesParser(str) {
    str = str.trim();
    if (!str)
        return [];
    if (str[0] === '[') { // JSON array of names (use when there are commas in the name)
        return JSON.parse(str);
    }
    if (str[0] === '"') { // single name with a comma, surrounded by double quotes
        return [JSON.parse(str)];
    }
    return str.split(',').map(s => s.trim());
}
// Given a sheet-to-json-like object from a spreadsheet, convert it into
// a valid Ten99Settings
export function importSettings({ rawpeople, rawcategories }) {
    const people = [];
    const categories = [];
    for (const [index, rp] of rawpeople.entries()) {
        const person = {
            name: '',
            taxid: '',
            address: '',
            othernames: [],
        };
        if (typeof rp !== 'object')
            continue;
        if (typeof rp['name'] === 'string')
            person.name = rp['name'];
        if (typeof rp['taxid'] === 'string')
            person.taxid = rp['taxid'];
        if (typeof rp['address'] === 'string')
            person.address = rp['address'];
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
        const cat = {
            name: ''
        };
        if (typeof rc['name'] === 'string')
            cat.name = rc['name'];
        if (typeof rc['alwaysReport'] === 'string' && rc['alwaysReport'].trim())
            cat.alwaysReport = true;
        if (!cat.name) {
            info(`WARNING: line ${index} of categories sheet had no name`);
            continue;
        }
        categories.push(cat);
    }
    return { people, categories };
}
//# sourceMappingURL=settings.js.map