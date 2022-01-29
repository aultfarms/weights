import { Selector } from 'testcafe';

fixture`Google API (GAPI) loading`
  .page`./pagewrapper.html`

test('loading', async t => {
  const { error, warn, log } = await t.getBrowserConsoleMessages()
  console.log('log = ', log);
  console.log('warn = ', warn);
  console.log('error = ', error);

  await t.expect(error.length).eql(0);
});

