// I took this from: https://github.com/mmalecki/ansispan/blob/master/lib/ansispan.js
// directly and modified for typescript.  There are some octal numbers in the original 
// that rollup was barfing on , so since it was this short I just grabbed the original
// to change it here.
export default function ansispan(str: string) {
  Object.keys(foregroundColors).forEach(function (ansi) {
    let span = '<span style="color: ' + foregroundColors[ansi] + '">';

    //
    // `\033[Xm` == `\033[0;Xm` sets foreground color to `X`.
    //

    str = str.replace(
//      new RegExp('\033\\[' + ansi + 'm', 'g'),
      new RegExp('\x1B\\[' + ansi + 'm', 'g'),
      span
    ).replace(
      new RegExp('\x1B\\[0;' + ansi + 'm', 'g'),
      span
    );
  });
  //
  // `\033[1m` enables bold font, `\033[22m` disables it
  //
  //str = str.replace(/\033\[1m/g, '<b>').replace(/\033\[22m/g, '</b>');
  str = str.replace(/\x1B\[1m/g, '<b>').replace(/\x1B\[22m/g, '</b>');

  //
  // `\033[3m` enables italics font, `\033[23m` disables it
  //
  //str = str.replace(/\033\[3m/g, '<i>').replace(/\033\[23m/g, '</i>');
  str = str.replace(/\x1B\[3m/g, '<i>').replace(/\x1B\[23m/g, '</i>');

  //str = str.replace(/\033\[m/g, '</span>');
  str = str.replace(/\x1B\[m/g, '</span>');
  //str = str.replace(/\033\[0m/g, '</span>');
  str = str.replace(/\x1B\[0m/g, '</span>');
  //return str.replace(/\033\[39m/g, '</span>');
  return str.replace(/\x1B\[39m/g, '</span>');
};

export const foregroundColors = {
  '30': 'black',
  '31': 'red',
  '32': 'green',
  '33': 'yellow',
  '34': 'blue',
  '35': 'purple',
  '36': 'cyan',
  '37': 'white'
};

