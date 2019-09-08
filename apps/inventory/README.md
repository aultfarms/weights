2019-07-16 ideas:
0. Backup original sheet prior to modifications, keep 30 days backups
1. Keep google sheet of cattle checks and cattle inventory
2. Script checks all cattle checks against accounting
3. Script checks all cattle inventory items against trello
4. If script finds discrepancy before a "settled" date, flag error to fix
   Else, script should only find new things to add from Trello and accounting sheet
   - need to match head, $, lbs
5. Once full inventory sheet is set, compute fifo entries
6. Could also compute buy/sell contracts done/left from Trello

-------------------------------
Previous ideas:

Starting "inventory" is JSON saved in this folder, created by parsing a
spreadsheet and running FIFO on it.  Should be able to update this from website
at any time if we want to?

1. get starting inventory as JSON.
  - how to figure out starting positions in each trello list?

2. get accounts sheet, look for checks labeled "sales-cattle" and "cattle-purchase-cattle"
  - parse the "head", "lbs", "date", "where", (sell: "contractid", buy: "groupid")  keys
  - "cash" sales will have contractid: "cash".  Purchases should always have groupid though.
3. get trello in/out/dead/sell contracts/buy contracts list
  
4. verify/reconcile all checks,in/out,etc.
  - how to handle "old" in-out?  maybe initial inventory has a "up until date" on it.
5. Show buy contracts - allow for reconcile (labels)
6. Show sell contracts - allow for reconcile (labels)

-------------------------------------

Contracts cards:
2018-06_SOUDERTON: Contracts: 5; Prices: { locked: 2, floating: 3 }; Basis: -$12;
2018-06_SOUDERTON: Contracts: 5; Prices: { '106.78': 2, locked: 1, floating: 3 }; Basis: -$12;
2018-06_SOUDERTON: Contracts: 5; Prices: locked; Basis: -$12;
2018-06_SOUDERTON: Contracts: 5; Prices: 106.78; Basis: -$12;
2018-06_SOUDERTON: Contracts: 5; Prices: floating; Basis: -$12;



