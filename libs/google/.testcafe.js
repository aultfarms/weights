const { execSync } = require('child_process');

// You have to `yarn unplug typescript` to get access to this module for testcafe
const tscloc = execSync('yarn bin tsc').toString().trim().replace('/bin/tsc','');
console.log('tscloc = ', tscloc);

module.exports = {
  src: "test/**/*.test.ts",
  browsers: "chrome",
  appCommand: "yarn run http-server .",
  appInitDelay: 200,
  debugOnFail: true,
  compilerOptions: {
    typescript: {
      configPath: "tsconfig.test.json",
      customCompilerModulePath: tscloc,
    }
  }
}
