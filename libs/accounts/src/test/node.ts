import * as libs from '../index.js';
import accountTests from './accounts/accounts.test.js';

(async function() {

  await accountTests(libs.accounts);

})();
