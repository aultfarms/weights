import { Module, sequence } from 'cerebral';
import { set, toggle } from 'cerebral/operators';
import { state, props } from 'cerebral/tags';

import trelloProvider from '../../providers/trello';
import trelloModule from '../trello';
import { authorize } from '../trello/sequences';

import feedModule from '../feed';
import { init as feedInit } from '../feed/sequences';

export default Module(m => {
  return {

    state: { 
      invoicetabs: {
        curtab: '',
      },
      page: {
        name: 'invoices', // invoices, payments, trucking
        drawer: {
          open: false,
        },
      },
    },

    signals: {

      init: [
        sequence('app.init->trello.authorize', authorize),
        sequence('app.init->feed.init', feedInit),
      ],

      drawerToggle: [ toggle(state`page.drawerOpen`) ],

      newTabRequested: [ set(state`invoicetabs.curtab`, props`val`) ],

    },

    modules: {
      trello: trelloModule,
      feed: feedModule,
    },

    providers: {
      trello: trelloProvider,
    },
  };
});
