import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'rollup';

const plugins = [ resolve({ 
  preferBuiltins: false,  // you need this one to avoid using node resolutions
  browser: true           // you need this to make sure node things in universal modules don't get included
}), commonjs() ];

const watch = {
  buildDelay: 200, // delay build until 100 ms after last change
  include: "dist/**/*.js",
  exclude: [ "dist/browser.mjs", "dist/test/browser.mjs" ],
};

// use defineConfig to get typings in editor:
export default defineConfig([
  {
    input: "dist/browser.js",
    plugins,
    watch,
    output: {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true
    },
  },
  {
    input: "dist/test/index.js",
    plugins,
    watch,
    output: {
      file: "dist/test/index.mjs",
      format: "esm",
      sourcemap: true
    }
  },

/*
  // Only build UMD bundle when not in watch
  {
    input: "dist/index.js",
    plugins: [ resolve() ],
    output: {
      file: "dist/index.umd.js",
      format: "umd",
    },
    watch: false,
  }   
*/
]);
