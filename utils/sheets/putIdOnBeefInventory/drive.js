//-----------------------------------------------------------
// wrappers and utilities to help with google's drive api

const Promise = global.Promise = require('bluebird');
Promise.config({longStackTraces: true});
const _ = require('lodash');
const api = _.mapValues(require('googleapis').drive('v3'), Promise.promisifyAll);
const {info,warn,error} = require('debug-levels')('drive');

module.exports = async function() {
  const auth = await require('./auth')();

  //---------------------------------------------------------------------
  // Given a folder (i.e. 'root'), ask Google for only folders inside it 
  // which match the given name
  const findFileInFolder = async ({id,name}) => api.files.listAsync({
         q: `name='${name}' and trashed=false`,
    fileId: id,
    spaces: 'drive',
//    fields: 'files(id,name)',
      auth,
  }).then(res => res.data.files)
  .then(files => {
    if (files && files.length > 1) {
      info('Found more than 1 file ('+files.length+'), filtering for case-sensitive now');
      // Their search is case-insensitve so it will return all matches with same case.
      files = _.filter(files, f => f.name === name); // do our own case-sensitive search
      if (files.length > 1) {
        warn('WARNING: Found '+files.length+' files with name ', name, ': ', files);
      }
    }
    if (!files || files.length < 1) {
      error('ERROR: Did not find folder', name);
      return null;
    }
    return files[0];
  });


  //-----------------------------------------------------------------------
  // Given a path line /a/b/c, it will find the ID of the file at that path.
  const findFileAtPath = async ({path,id='root'}) => {
    if (!path || path.length < 1) { // path is empty, we're done
      return id;
    }
    // If leading slash, this is root:
    if (path[0] === '/') path = path.slice(1); // just get rid of preceding slash since id defaults to 'root'
    const name = _.split(path, '/')[0]; // get the top one
    const found = await findFileInFolder({id,name}); // find it's info
    if (!found) {
      warn('WARNING: searched for path '+path+', but found null');
      return null;
    }
    const rest = _.split(path, '/').slice(1);
    return findFileAtPath({ path: _.join(rest,'/'), id: found.id });
  };

  return {
    findFileInFolder,
    findFileAtPath,
    auth,
  };
}
