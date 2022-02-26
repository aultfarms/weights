# Ault Farms Accounts
-------------------------------
Putting this note here so I don't forget: Use `console-feed` to get console in the browser dom.

## Usage:
---------

await ledger.load(accounts) => processes all the accounts and returns validated tax and mkt aggregate accounts.

await ledger.loadInSteps(accounts) => same as load, but it yields after each major step w/ any errors, allowing 
you to communicate with a user.

Node: import a directory of account xlsx files with xlsx.
Browser: import a directory of Google Sheets with google.

## Compilation:
---------------

This generates a node version and a browser version.  The node version is a module,
and it is NOT rolled up into a single file.  It is rooted at dist/node/index.js.

The browser version is a module, and it IS rolled up w/ rollup. It is found 
at dist/browser/index.mjs.  

To get typescript to support both, I compile the entire codebase twice, but 
excluding anything in browser/ and test/browser for node, and in node/ and 
test/node for the browser.  Node compilation is just put straight under
dist/ and left as a non-rolled-up module.  Browser compilation is placed
in dist-browser/, and then rolled up into a single module file (index.mjs)
which is output from rollup over in dist/browser/index.mjs and 
dist/test/browser/index.mjs.  

There are currently no non-universal imported modules.  If we ever need one someday,
you can add the shim for it under the browser key in package.json (to replace the
node-only version).  Right now, the browser key is a string that is the main
file to be used in browsers.  You can replace it with an object where each key is
the name of the module to override for browsers.  Add the shim module there, and
then also make a key there that is the same name as the "main" export for the 
package and set it's value to the path to the brower's index.mjs file.  Like:

```json
"browser": {
  "dist/node/index.js": "dist/browser/index.mjs",
  "some_package_to_replace_for_browsers": "other_package"
}
```

## Editor quirks with universal things:
---------------------------------------

In order to get the editor to allow the DOM under src/browser and src/test/browser, 
you put a dummy tsconfig.json file in those folders that just mirrors the main
tsconfig.browser.json file.

## Testing:
-----------

To get Typescript to compile my test TS code into javascript, I just
put them under src/test/.  The top-level test/ folder just holds an
HTML wrapper file that loads the test module when opened in a browser.

To test for the browser therefore, a live-server (auto-reload on file save)
serves the test/index.html file, which loads the dist/test/browser.mjs bundle 
and the dist/browser/index.mjs bundle.  The main browser library is attached
to window, and then the tests are run using that library.

To test for node, it just runs node dist/test/node/index.js, and that
file imports dist/node/index.js to try it out.

!IMPORTANT:
When testing in the browser, you have to put src/test/example_xlsx up to the
path /AF-TESTACCOUNTS in Google Drive AND THEN YOU HAVE TO OPEN EACH ONE AND
SAVE IT AS A GOOGLE SHEET INSTEAD OF AN XLSX!!!  At least until you add the xlsx
library to the google lib and just download the binary file from drive and parse
it with xlsx like node does from the filesystem.


