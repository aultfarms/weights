import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'rollup';

// use defineConfig to get typings in editor:
export default defineConfig([
  {
    input: "dist/index.js",
    plugins: [ resolve({ 
      preferBuiltins: false,  // you need this one to avoid using node resolutions
      browser: true           // you need this to make sure node things in universal modules don't get included
    }), commonjs() ],
    output: {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true
    },
    watch: {
      buildDelay: 200, // delay build until 100 ms after last change
      include: "dist/**/*.js",
      exclude: [ "dist/index.mjs", "dist/index.umd.js" ],
    },
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
