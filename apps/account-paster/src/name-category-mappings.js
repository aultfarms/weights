// All names/keys get standardized this way:
export const standardizeName = orig => {
  if (!orig) return '';
  let a = orig;
  a = a.replace(/[^a-zA-Z]/g,''); // remove puntuation and spaces
  a = a.toUpperCase(); // case insensitive
  a = a.replace(/(LLC|INC)/,''); // no LLC or INC
  console.log(`Turned ${orig} into ${a}`);
  return a;
};

const standardizeNameKeys = obj => Object.keys(obj)
  .reduce((acc,k) => {
    acc[standardizeName(k)] = obj[k];
    return acc;
  }, {});
   

export const nameCategoryMapping = standardizeNameKeys({
  'ADM Logansport': 'sales-grain-corn',
  'AGRICOR, INC.': 'feed-hominy',
  'ARCHER DANIELS MIDLAND': 'feed-hulls',
  'AT&T - AultFarms': 'utilities-cellphones',
  'AT&T Mobility - DAD': 'utilities-cellphones',
  'AT&T Mobility': 'utilities-cellphones',
  'Ag Source, Inc.': 'repairs-grainhandling',
  'Agco Finance - Agco Plus': 'repairs-telehandler',
  'AGCO FINANCE LLC': 'repairs-telehandler',
  'Agronomic Solutions': 'services-regulatory',
  'ALRO STEEL': 'supplies-steel',
  'BBH Trucking': 'feed-trucking-brad',
  'BIG R STORES': 'supplies-general',
  'STOCK+FIELD-CORPORATE': 'supplies-general',
  'BLB Trucking': 'repairs-truck-general',
  'Bane Welker Equip - PAY PLYMOUTH EAUL01': 'repairs-tractors',
  'BANE-WELKER-PLYMOUTH': 'repairs-tractors',
  'Bane Welker Equip - PAY WINAMAC DAUL01': 'repairs-tractors',
  'BANE-WELKER-WINAMAC': 'repairs-tractors',
  'Bob Gottschalk': 'SPLIT',
  'Bonnie Montgomery': 'cashrent-fall',
  'Bush Veterinary Services, P.C.': 'medicine',
  'Calf Care': 'medicine',
  'Cargill Incorporated': 'feed-gluten',
  'C & J SCOTT FARMS INC': 'supplies-twine',
  'Ceres Solutions': 'SPLIT',
  'Cole Hardwood': 'bedding-sawdust',
  'Cole Warren Farms': 'feed-syrup',
  'Cornerstone Comfort Solutions': 'repairs-hvac',
  'DRAGO INDIANA': 'repairs-cornhead',
  'DirecTV': 'utilities-tv',
  'AT&T': 'utilities-tv',
  'Du-Mar Welding LLC': 'supplies-general',
  'Enyart\'s True Value': 'supplies-general',
  'Fansler Lumber Co. Inc.': 'supplies-general',
  'Farm Credit Mid America': 'SPLIT',
  'First Bank of Berne': 'SPLIT',
  'Ferguson Farms, Inc.': 'repairs-truck-trailer',
  'Fulton County Treasurer': 'taxes-property',
  'GUTWEIN LLP': 'services-legal',
  'Greenmark Equipment': 'repairs-tractors',
  'Gutwein Dairy Consulting, Inc.': 'feed-mineral',
  'H&H Diesel Inc.': 'repairs-truck-general',
  'HOLLOWAY\'S ELECTRIC MOTOR SERVICE': 'repairs-general',
  'Homer Miller': 'bedding-sawdust',
  'INGREDION': 'feed-gluten',
  'Indiana Department of Workforce Development': 'taxes-state-unemployment',
  'Indiana State Chemist': 'miscellaneous-licensefees',
  'Irving Materials, Inc.': 'bedding-chips',
  'JOHNNY ON THE SPOT': 'utilities-sanitation',
  'Jeri Stinson': 'services-cleaning',
  'Joe Miller': 'supplies-twine',
  'Kline\'s CPA Group, P.C.': 'services-accounting',
  'Lawson Products, Inc.': 'supplies-general',
  'LDC Claypool Holdings LLC': 'feed-hulls',
  'Liberty Mutual Acct 401580870': 'insurance-auto',
  'Liberty Mutual Acct 6680': 'insurance-general',
  'MOON FENCING': 'repairs-fence',
  'McGREW\'S WELL DRILLING INC': 'repairs-well',
  'NAPA AUTO PARTS': 'supplies-general',
  'NAPA ROCHESTER': 'supplies-general',
  'NAU Country Insurance': 'insurance-crop',
  'NIPSCO': 'utilities-gas',
  'New Holland Rochester Inc.': 'repairs-tractors',
  'OR Processing': 'feed-candy',
  'OYLER REPAIR SHOP': 'repairs-general',
  'Organix Recycling': 'feed-fruit',
  'POWER BRAKE AND SPRING': 'supplies-general',
  'POWER BRAKE AND SPRING SERVICE': 'supplies-general',
  'Pallet Pro LLC': 'bedding-sawdust',
  'Parker & Sons Eqpt., Inc.': 'repairs-jcb',
  'Premier Pallet LLC': 'bedding-sawdust',
  'Protective Insurance Company': 'insurance-workmanscomp',
  'Prudential': 'insurance-life-carl',
  'Rochester LP Gas': 'utilities-gas',
  'SMITH FARM STORE': 'supplies-general',
  'SMITH FARM STORE-RENSSELAER': 'supplies-general',
  'Safeco Insurance': 'insurance-auto',
  'Sam\'s Club': 'miscellaneous-subscriptions',
  'Service Sanitation': 'utilities-sanitation',
  'Silver Star Companies, LLC': 'crop-seed-wheat',
  'The Andersons': 'SPLIT',
  'THE ANDERSONS INC-N MANCHESTER': 'SPLIT',
  'THE TIRE STORE': 'repairs-pickups',
  'Transfer from Farm Credit': 'transfer-from:FC.RLOC,to:FF.checking',
  'Tri-State Calf Products': 'cattle-purchase-cattle',
  'ULERICK HEATING & COOLING': 'repairs-hvac',
  'VPSI DUBOIS DISTRIBUTORS': 'medicine',
  'VETERINARY AND POULTRY SUPPLY, I': 'medicine',
  'Valley Sanitation': 'utilities-trash',
  'Voya Finanacial': 'insurance-life-rita',
  'Wiers International Trucks SOUTH BEND': 'repairs-truck-general',
  'WIERS INTERNATIONAL TRUCKS': 'repairs-truck-general',
  'Wildman Uniform and Linen': 'employee-clothes',
});

// If you want more/less than 2 splits inserted for a payee, put them here:
export const splitMapping = standardizeNameKeys({
  'Ceres': 3,
});
