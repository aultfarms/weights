import debug from 'debug';
// trello.test.js has all the universal tests
import trelloTests from '../trello.test.js';
const info = debug('af/trello#test/browser:info');
localStorage.debug = '*';
// Wait for the window to finish loading
document.addEventListener('DOMContentLoaded', async () => {
    const libsundertest = window.libsundertest;
    const root = document.getElementById("root");
    if (!root) {
        console.log('ERROR: did not find root element!');
    }
    else {
        root.innerHTML = "The test is running!  Check the console.";
        try {
            console.log('Starting tests, should see info statements after this');
            const client = libsundertest.getClient();
            info('Testing trello universal...');
            await trelloTests(client, libsundertest);
        }
        catch (e) {
            info('FAILED: tests threw exception: ', e);
        }
    }
});
//# sourceMappingURL=index.js.map