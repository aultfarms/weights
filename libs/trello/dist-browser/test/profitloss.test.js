import debug from 'debug';
const info = debug('af/accounts#test/ledger:info');
export default async function run(a, accounts) {
    info('testing loading profitLoss');
    const mkt = a.profitLoss({ ledger: accounts, type: 'mkt', year: 2020 });
    const tax = a.profitLoss({ ledger: accounts, type: 'tax', year: 2020 });
    const mkt2022 = a.profitLoss({ ledger: accounts, type: 'mkt', year: 2022 });
    const tax2022 = a.profitLoss({ ledger: accounts, type: 'tax', year: 2022 });
    if (!mkt)
        throw `profitLoss returned falsey for mkt`;
    if (!tax)
        throw `profitLoss returned falsey for tax`;
    info('passed loading profitLoss');
    info('testing some expected category values from profitLoss');
    const expected = [
        { pl: mkt2022, type: 'mkt', category: 'inventory-cattle-dailygain', value: 29352.73 },
        { pl: tax2022, type: 'tax', category: 'inventory-cattle-dailygain', value: 0 },
        { pl: mkt, type: 'mkt', category: 'equipment-chopper-2013.newholland.fr9050chopper', value: -20000 },
        { pl: tax, type: 'tax', category: 'equipment-chopper-taxonlysplit', value: -31016.19 },
        { pl: mkt, type: 'mkt', category: 'equipment-loader-2015.jcb.ecoskidsteer', value: -20000 }, // a "sold" asset that still had mkt value
    ];
    for (const expect of expected) {
        const cat = a.getCategory(expect.pl.categories, expect.category);
        if (!cat) {
            info('category', expect.category, 'not found.  p&l =', expect.pl);
            throw `profitLoss did not return a ${expect.category} category for type ${expect.type}`;
        }
        if (!a.moneyEquals(a.amount(cat), expect.value)) {
            info('category', expect.category, 'exists but amount is not what was expected.  p&l =', expect.pl);
            throw `profitLoss did not return expected amount (${expect.value}) for ${expect.category} (${a.amount(cat)}) for type ${expect.type}`;
        }
    }
    info('passed expected values from profitLoss');
}
//# sourceMappingURL=profitloss.test.js.map