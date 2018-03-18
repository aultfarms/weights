//--------------------------------------------------------------------------------------------------
// Copied from Google API quickstart at https://developers.google.com/drive/v3/web/quickstart/nodejs,
// then modified to suit.
//--------------------------------------------------------------------------------------------------
if (process.env.DEBUG && !process.env.DEBUG.match(/follow-redirects/)) {
  process.env.DEBUG += ',-follow-redirects';
}

const Promise = global.Promise = require('bluebird');
Promise.config({longStackTraces: true});
const { info, warn, error } = require('debug-levels')('auth');

const fs = Promise.promisifyAll(require('fs'));
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const opn = require('opn');
const promptly = require('promptly');
const { OAuth2Client } = require('google-auth-library');
  
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/token-drive-sheets
const scopes = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];
const token_path = process.env.HOME+'/.google-credentials/token-drive-sheets.json';

// Get the secret we saved from Google API dashboard
const secret = require(process.env.HOME+'/.google-credentials/client_secret.json');
let oauth2 = null;

//-----------------------------------------------------------------------------
// opts.redirectURIIndex: is an integer and refers to which redirectURI you want to 
//                        use from the client_secret's array of redirectURI's
//
module.exports = async function authorize() {
  return new Promise( (resolve, reject) => {
    // This file returns a promise that, when fulfilled, is the oauth2 client
    // needed by the google drive API's to send authenticated requests.
    oauth2 = new OAuth2Client(secret.web.client_id, 
                              secret.web.client_secret, 
                              secret.web.redirect_uris[1]); // index 1 is localhost:5000, which we're going to listen on
  
    // Check for previous token:
    try {
      oauth2.setCredentials(require(token_path));
      info('Re-using existing credentials.  rm '+token_path+' to force refresh.');
      return resolve(oauth2);
    } catch(err) {
      info('No previous token, requesting new one');
    }
    
    // Get a new token if we don't have one already
    const authUrl = oauth2.generateAuthUrl({
      access_type: 'offline', // offline for node.js scripts
      scope: scopes
    });

    // Create an http server to accept the OAuth2 callback.  Got this idea from
    // the NPM docs for google-auth-library
    const server = http.createServer(async (req, res) => {
      if (req.url.indexOf('/oauth2callback') > -1) {
        info('Received oauth2callback');
        // Get code from query string:
        const qs = querystring.parse(url.parse(req.url).query);
        res.end('Authentication successful!  Please return to the console.')
        server.close();
        info('Exchanging code for token');
        const r = await oauth2.getToken(qs.code);
        oauth2.setCredentials(r.tokens);
        fs.writeFileAsync(token_path, JSON.stringify(r.tokens)); // no need to sit around waiting for this to finish
        info('Token has been acquired and saved.');
        resolve(oauth2); // return the client from the main exported function
      }

    // Once server is listening, open browser to auth URL
    }).listen(5000, () => {
      info('Listening on port 5000 for oauth2callback....opening browser for auth....');
      opn(authUrl);
    });
  });
};

