import _  from 'lodash';
import Cerebral from 'cerebral';
import CerebralBaobab from 'cerebral-model-baobab';
import SuperagentPromise from 'superagent-promise';
import SuperagentCore from 'superagent';
import Promise from 'bluebird';
var superagent = SuperagentPromise(SuperagentCore, Promise);

import model from './model';

const controller = Cerebral(CerebralBaobab(model));

/////////////////////////////////////////////////////////
// Services available to actions:
controller.addServices({
  superagent,
});

export default controller;
