const chalk = require('chalk');

module.exports = {
  green: (msg) => console.log(chalk.green (msg)),
    red: (msg) => console.log(chalk.red   (msg)),
   blue: (msg) => console.log(chalk.blue  (msg)),
 yellow: (msg) => console.log(chalk.yellow(msg)),
    dbg: (...args) => console.log(chalk.red(args)),
};
