module.exports = (lineobj,msg) => {
  if (typeof lineobj !== 'string')  {
//    return new Error(lineobj.acct?.name+': LINE '+lineobj.lineno+': '+msg+', line = '+JSON.stringify(lineobj,false,'  '));
    return new Error(lineobj.acct?.name+': LINE '+lineobj.lineno+': '+msg);
  }
  return new Error(lineobj); // otherwise, first item is just message
};
