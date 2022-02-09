const chalk = require('chalk');
const _ = require('lodash');
const numeral = require('numeral');

module.exports = (type, src, verbose) => {

  const pfx = chalk.cyan('------> ') 
      + chalk.cyan.underline('pretty:') 
      + chalk.cyan(' ');

  const print = function() {
    let args = Array.prototype.slice.call(arguments);
    // any args that are strings can get a chalk color:
    args = _.map(args, (a) => (typeof a === 'string' ? chalk.cyan(a) : a));
    args.unshift(pfx);
    console.log.apply(console,args);
  };

  const lineitem_accounts = () => {
    print('Final result: ' + _.keys(src).length + ' total accounts');
    _.each(src, (act,key) => {
      print(key+': ' + act.length + ' entries');
      if (verbose) {
        _.each(act, (l, no) => 
          print('VERBOSE: Line '+no+': ' + JSON.stringify(l))
        );
      }
    });
  };

  const category_tree = () => {
    const countCats = (curlevel) => {
      if (!curlevel.children) return 0;
      return _.keys(curlevel.children).length 
        + _.reduce(curlevel.children, (sum,item,key) => {
          return sum + countCats(item);
        },0);
    }
    print('Category tree: ' + countCats(src) + ' categories');
    const printCat = ({curlevel, lineprefix, type, is_top, exclude, only, verbose}) => {
      curlevel = curlevel || src;
      lineprefix = lineprefix || '';
      let amt = numeral(curlevel.amount({ type, exclude, only})).format('$0,0.00');
      if (amt !== '$0.00') {
        const str1 = lineprefix + curlevel.name + ':';
        const tabs_in_str = Math.floor(str1.length/8);
        let append_tabs = '';
        for(let i=0; i<(3-tabs_in_str); i++) append_tabs += '\t';
        print(str1+append_tabs+amt);
      }
      if (verbose || is_top) {
        _.each(curlevel.children, (child) => {
          printCat({curlevel: child, lineprefix: lineprefix + '    ',
                    type,exclude,only,verbose});
        });
      }
    };
    print('Credits (excluding transfers):');
    printCat({type:'credits',is_top:true,exclude:'transfer'});
    print('Debits (excluding transfers):');
    printCat({type:'debits',is_top:true,exclude:'transfer'});
    print('Transfers only (credits):');
    printCat({only:'transfer',type:'credits',is_top:true,verbose:true});
    print('Transfers only (debits):');
    printCat({only:'transfer',type:'debits',is_top:true,verbose:true});
  };

  switch(type) {
    case 'lineitem_accounts': return lineitem_accounts(); break;
    case 'category_tree': return category_tree(); break;
    default: throw new Error(chalk.bgRed('pretty: '), chalk.red('unknown type of thing to print: ' + type));
  }

};
