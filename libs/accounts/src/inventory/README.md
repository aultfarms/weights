How do I want to do this?


Option 1:
- Account-Inventory has inventory-cattle, inventory-grain-corn, inventory-grain-beans, inventory-stover, etc., etc.
- every line in an inventory account has units, est. $/unit.
- inventory-cattle
  * has mkt_amount/mkt_balance columns and tax_amount/tax_balance columns
  * tax_amount is FIFO stuff
  * Before this, I just estimated ave. weight per head and set a fixed price for that weight for the entire inventory.
  * mkt_amount: each time "head" is changed, how to change inventory $$?
    - estimate ave. purchase price for the past year and ave. sale price for the past year, compute ave. weight for herd,
      then split linear between purchase/sale.
    - BETTER IDEA: have script compute notes for every change to tell you FIFO ave. weight and put into its own column, then you can choose to 
      set a manual price for that weight and it will use that price until it finds another entry which changes it.
    - sync will involve 2 kinds of changes: updates to the notes/amounts, and inserting new rows.  
    - Should also have a "good up to here" indicator.
  * transactions from FBB will subtract from the head and update the ave weight/head, but the mkt sheet will 
    actually reflect the market change with a $$ figure that is != the bank sheet.  This way, if the mkt sheet
    underestimated/overestimated the value, it will be corrected by the difference between the mkt amount
    and the actual transaction amount.
  * I could add in official support for contracts which will give us the ave. estimated price for inventory.
  * Must remove head to match the dead list

- inventory-corn
  * mkt only
  * Has manual entry once per year adding to inventory, have expected ave price/bu in note
  * Has manual entry once per year zeroing out inventory
  * Reflects every single sale, only updates the bushels, not the $/bu (until a manual $/bu update),
    therefore the $ entries will not match the FBB entries, only bu.
  * I could add in official support for contracts which will give us the ave. estimated price for inventory.

- inventory-stover
  * mkt only
  * Has manual entry once per year adding to inventory
  * Has periodic (weekly?) entries reducing inventory
