const { execSync } = require('child_process');

// You have to `yarn unplug typescript` to get access to this module for testcafe
let tscbin = execSync('yarn bin tsc').toString().trim();
tscbin = tscbin.replace('/bin/tsc','');


module.exports = {
  compilerOptions: {
    typescript: {
      configPath: "tsconfig.test.json",
      customCompilerModulePath: tscbin,
    }
  }
}
