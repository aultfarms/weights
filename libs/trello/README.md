# Ault Farms Trello client
-------------------------------

You probably won't remember this because it is a little wonky.
You don't import the universal index directly.

You import either the node version or the browser version, and 
call "getClient()" on that to get the universal client that has
been configured for the platform.  Then call "connect" on that
client to set the organization.  You pass the client to the livestock
functions.


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


