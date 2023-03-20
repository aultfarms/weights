import debug from 'debug';
const info = debug('af/accounts#test/ten99:info');
export default async function run(ten99, ledger) {
    const { moneyEquals } = ten99;
    const testSettings = {
        people: [
            { name: "Repairman", taxid: "111111111", address: "123 Nowhere Lane,\nWest Lake, FL 12345", othernames: ["Repairman2"] },
        ],
        categories: [{ name: 'repairs' }],
    };
    const testSettingsWithMissingPerson = {
        people: [],
        categories: [{ name: 'repairs', alwaysReport: true }],
    };
    info('testing making a 1099 with valid things');
    const annual = ten99.ten99({ ledger, year: 2020, settings: testSettings });
    if (Object.keys(annual.missing_people_from_required_categories).length !== 0) {
        info(`FAIL: missing people categories should have been empty, but it is`, annual.missing_people_from_required_categories, 'instead');
        throw `There should have been no categories with missing people on this 1099, but there were ${Object.keys(annual.missing_people_from_required_categories)} categories with missing people.`;
    }
    if (annual.ten99[0]?.person.name !== testSettings.people[0].name) {
        info('FAIL: the annual 1099 entries are: ', annual.ten99);
        throw `There should only be one person in the ten99 with the name ${testSettings.people[0].name} but it is either not there or not the only person.`;
    }
    if (!moneyEquals(annual.ten99[0]?.total, -1772.48)) {
        throw `Total does not match hand-calculated value.  Total should be -1,772.48 but it is ${annual.ten99[0]?.total} instead`;
    }
    info('passed making a 1099 with valid things');
    info('testing making a 1099 with invalid things to get a missing person');
    const annual2 = ten99.ten99({ ledger, year: 2020, settings: testSettingsWithMissingPerson });
    const missing_repairs = annual2.missing_people_from_required_categories['repairs'];
    if (!missing_repairs || !missing_repairs.find(r => r === 'Repairman') || !missing_repairs.find(r => r === 'Repairman2')) {
        info('FAIL: missing people =', annual2.missing_people_from_required_categories);
        throw `Should have shown ["Repairman", "Repairman2"] as missing people for category repairs, but either or none of them was there.`;
    }
    if (missing_repairs.length !== 2) {
        throw `Should have been exactly 2 people listed as missing under repairs. There are ${missing_repairs.length} instead.`;
    }
    if (Object.keys(annual2.missing_people_from_required_categories).length !== 1) {
        throw `Should have only been one 'repairs' category listed with missing people, but there were ${Object.keys(annual2.missing_people_from_required_categories).length} instead.`;
    }
    info('passed making a 1099 with invalid things to get a missing person');
    info('testing making a workbook from the valid 1099');
    const wb = ten99.ten99ToWorkbook(annual.ten99);
    if (!wb.SheetNames.find(s => s === '1099-summary') || !wb.SheetNames.find(s => s === 'AllPeopleTransactions')) {
        throw `Workbook should have had 1099-summary and 1099-transactions sheets.  It has these sheets instead: ${wb.SheetNames.join(', ')}`;
    }
    info('passed making a workbook from the valid 1099');
    info('testing importSettings from raw objects');
    const raw = {
        rawpeople: [
            { name: 'Bob Schmob', taxid: '17', address: '123 Nowhere Lane\nLake, FL 11111' },
            { name: 'Ted Schmob', taxid: '18', address: '123 Nowhere Lane\nLake, FL 11111', othernames: 'Bud' },
            { name: 'Ned Schmob', taxid: '19', address: '123 Nowhere Lane\nLake, FL 11111', othernames: 'Tud, Lud' },
            { name: 'Jed Schmob', taxid: '20', othernames: '[ "Tud, with a comma", "Lud"]' },
            { name: 'Ded Schmob', taxid: '21', othernames: '"Dud, with a comma"', '__EMPTY__': '' },
        ],
        rawcategories: [
            { name: 'cat1' },
            { name: 'cat2', alwaysReport: '' },
            { name: 'cat3', alwaysReport: 'TRUE' },
        ],
    };
    const settings = ten99.importSettings(raw);
    if (settings.people.length !== 5) {
        throw `Should have had 5 people after import, but had ${settings.people.length} instead`;
    }
    if (settings.people[0]?.othernames.length !== 0) {
        throw `Settings had othernames where there were none`;
    }
    if (settings.people[1]?.othernames[0] !== 'Bud') {
        throw `Settings failed to parse a single othername`;
    }
    if (settings.people[2]?.othernames[0] !== 'Tud' && settings.people[2]?.othernames[0] !== 'Lud') {
        throw `Settings failed to parse two othernames separated by a comma`;
    }
    if (settings.people[3]?.othernames[0] !== 'Tud, with a comma' && settings.people[3]?.othernames[0] !== 'Lud') {
        throw `Settings failed to parse a JSON array of othernames`;
    }
    if (settings.people[4]?.othernames[0] !== 'Dud, with a comma') {
        throw `Settings failed to parse a single othername surrounded by quotes`;
    }
    if (settings.categories.length !== 3) {
        throw `Settings should have had 3 categories, but it had ${settings.categories.length} instead`;
    }
    if (typeof settings.categories[0]?.alwaysReport !== 'undefined') {
        throw `Settings failed to leave alwaysReport undefined when it was not present`;
    }
    if (typeof settings.categories[1]?.alwaysReport !== 'undefined') {
        throw `Settings failed to leave alwaysReport undefined when it was an empty string`;
    }
    if (settings.categories[2]?.alwaysReport !== true) {
        throw `Settings failed to make proper alwaysReport as true, it is ${settings.categories[2]?.alwaysReport} instead`;
    }
    info('Passed testing importSettings');
}
//# sourceMappingURL=ten99.test.js.map