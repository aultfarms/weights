import type { RawSheetAccount } from '../ledger/index.js';

export const testacct: RawSheetAccount = {
  "filename": "TEST",
  "name": "bank.checking",
  "lines": [
    { // index 0
      "postDate": "2020-04-01",
      "description": "START",
      "balance": "$0.00 "
    },
    { // index 1
      "postDate": "2020-04-05",
      "checkNum": "1002",
      "description": "Check",
      "debit": "$100,000.00 ",
      "balance": "-$100,000.00",
      "who": "FertCompany1",
      "category": "transfer-from:bank.checking,to:inventory.crop.prepay.fertco"
    },
    { // index 2
      "postDate": "2020-04-28",
      "description": "Transfer to futures",
      "debit": "$13,225.00 ",
      "balance": "-$113,225.00",
      "who": "Transfer",
      "category": "transfer-from:bank.checking,to:futures.cash"
    },
    { // index 3
      "writtenDate": "2020-05-04",
      "postDate": "2020-05-07",
      "checkNum": "1003",
      "debit": "$4,500.00 ",
      "balance": "-$117,725.00",
      "who": "FertCompany1",
      "category": "crop-herbicide-roundup",
      "note": "gallons: 400; note: overrun from prepay account for this invoice"
    },
    { // index 4
      "writtenDate": "2020-08-31",
      "postDate": "2020-09-10",
      "checkNum": "25000",
      "description": "ON-LINE BILL PAY",
      "debit": "$21,631.67",
      "balance": "-$139,356.67",
      "who": "FuelSupplier1",
      "category": "SPLIT"
    },
    { // index 5
      "description": "SPLIT",
      "splitAmount": "-$7,804.92",
      "balance": "-$139,356.67",
      "who": "SPLIT",
      "category": "fuel-dieseloffroad",
      "note": "gallons: 3699",
      "__EMPTY": "$2.11/gal"
    },
    { // index 6
      "description": "SPLIT",
      "splitAmount": "-$13,826.75",
      "balance": "-$139,356.67",
      "who": "SPLIT",
      "category": "fuel-dieselonroad",
      "note": "gallons: 3000",
      "__EMPTY": "$2.90/gal"
    },
  ],
};

export const testacctWithSettings: RawSheetAccount = {
  "filename": "Account-Bank.xlsx",
  "name": "bank.rloc",
  "lines": [
    {
      "writtenDate": "COMMENT",
      "checkNum": "Available:",
      "description": "$1,000,000.00"
    },
    {
      "writtenDate": "SETTINGS",
      "postDate": "balancetype: inverted"
    },
    {
      "postDate": "2020-08-12",
      "description": "START",
      "balance": "$0.00"
    },
    {
      "postDate": "2020-08-11",
      "description": "10012345",
      "debit": "$5,910.00",
      "balance": "$5,910.00",
      "who": "Bank1",
      "category": "loan-bankfees"
    },
    {
      "postDate": "2020-08-12",
      "description": "LINE OF CREDIT DRAW",
      "debit": "$1,000.00",
      "balance": "$6,910.00",
      "who": "Internal Transfer",
      "category": "transfer-from:bank.rloc,to:bank.checking"
    },
  ],
}

export const testacctAsset =   {
  "filename": "Account-Assets.xlsx",
  "name": "bldg_imprv.2020TEST",
  "lines": [
    {
      "category": "SETTINGS",
      "parcelid": "accounttype: asset; asOfDate: 2020-12-31; priorDate: 2019-12-31"
    },
    {
      "category": "COMMENT",
      "parcelid": "TOTALS",
      "purchaseValue": "$50,000.00 ",
      "taxCost": "$106,000.00 ",
      "taxPriorDepr": "$38,000.00 ",
      "taxCurrentDepr": "$4,700.00 ",
      "taxTotalDepr": "$42,700.00 ",
      "taxCurrentValue": "$63,300.00 ",
      "mktPriorValue": "$270,000.00 ",
      "mktCurrentValue": "$260,000.00 ",
      "mktCurrentDepr": "$10,000.00 "
    },
    {
      "category": "bldg-house-home-test.house",
      "parcelid": "11 22 33 444 555 020-004",
      "description": "Test House 1",
      "purchaseDate": "1998-01-01",
      "purchaseValue": "$70,000.00",
      "taxAssetid": "90",
      "taxDescription": "bldg-house-home-test.house",
      "taxTotalDepr": "",
      "taxPriorValue": "",
      "taxCurrentValue": "",
      "mktPriorValue": "$70,000.00 ",
      "mktCurrentValue": "$60,000.00 ",
      "mktCurrentDepr": "$10,000.00 ",
      "saleDate": "",
      "saleValue": "",
    },
  ],
};
