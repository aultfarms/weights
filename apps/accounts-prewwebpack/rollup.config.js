import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy-watch';
import { defineConfig } from 'rollup';

const plugins = [ 
  replace({
    preventAssignment: true,
    values: {
      'process.env.NODE_ENV': JSON.stringify('development'),
    }
  }, ),
  resolve({ 
    preferBuiltins: false,  // you need this one to avoid using node resolutions
    browser: true,          // you need this to make sure node things in universal modules don't get included
  }), 
  commonjs(),
];

const watch = {
  buildDelay: 100,
  include: "dist/**/*.js",
  exclude: "dist/index.mjs",
};

// use defineConfig to get typings in editor:
export default defineConfig([
  {
    input: "dist/index.js",
    plugins: [
      ...plugins,
      copy({
        watch: 'public',
        targets: [
          { src: 'public/*', dest: 'dist/.' }
        ],
      }),
    ],
    watch,
    output: {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true
    },
  },
]);
