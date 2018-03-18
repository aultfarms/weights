import Promise from 'bluebird';
import { CerebralError } from 'cerebral';


export const waitTrelloExists = ({trello}) => new Promise((resolve, reject) =>  {
  let count = 0;
  const check = () => {
    if (count++ > 50) throw new TrelloExistsError('Could not load Trello client library');
    if (trello.isLoaded()) return resolve();
    setTimeout(check, 250);
    return null;
  };
  check();
  return null;
});

