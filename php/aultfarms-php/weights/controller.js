import {Controller} from 'cerebral'
import model from './model'
import Devtools from 'cerebral-module-devtools'
import FirebaseModule from 'cerebral-module-firebase'


const controller = Controller(model);

/*
controller.addSignals({
  newItemTitleChanged: {
    chain: updateItemTitle,
    immediate: true
  },
  newItemTitleSubmitted: addNewItem
});
*/

controller.addModules({
  devtools: Devtools(),
  firebase: FirebaseModule({
    apiKey: 'AIzaSyCbam4p2gz2bsyoQ3dpZY30Rut-wO8PTtg',
    authDomain: 'aultfarms-8ffd6.firebaseapp.com',
    databaseURL: 'https://aultfarms-8ffd6.firebaseio.com',
    storageBucket: 'aultfarms-8ffd6.appspot.com',
  }),
});

export default controller
