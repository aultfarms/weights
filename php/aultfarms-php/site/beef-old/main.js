import 'babel-polyfill'; // This must be first to ensure this loads before all else

import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import Controller from './controller-global';
import {Container} from 'cerebral-view-react';

//////////////////////////////////////////////////////////
// Any global CSS gets required here:
import './assets/bootstrap/css/bootstrap.css'; // stored locally
import './global.css';
import 'purecss/build/pure.css';
import 'purecss/build/grids-responsive.css';
import 'font-awesome/css/font-awesome.min.css';

// Polyfills:
import './polyfill/custom-event'; // for Cerebral
/*

import Pages from 'pages/module';
//import App from 'app/module';
//import Seatmap from 'seatmap/module';
//import Cart from 'cart/module';
//import Checkout from 'checkout/module';

// What this should look like once everything is a module:
const controller = Controller(Model({}));
controller.addModules({
  // WarehouseTix modules:
     pages: ClientPages(), // AdminPages() for admin
//       app: App(),
//   seatmap: Seatmap(),
//      cart: Cart(),
//  checkout: Checkout(),

  // Cerebral modules:
//  router: ClientRouter(),
});

*/





// Pages with signals:
import  PageOrderReceiptsSignals from './page-order-receipts/signals';
import PageRetrieveTicketSignals from './page-retrieve-tickets/signals';
import   PageEventTicketsSignals from './page-event-tickets/signals';
import     PageEventStatsSignals from './page-event-stats/signals';
import       PageNotFoundSignals from './page-not-found/signals';
import       PageCheckoutSignals from './page-checkout/signals';
// Components with signals:
import     AppSignals from './app/signals';
import SeatmapSignals from './seatmap/signals';
import    CartSignals from './cart/signals';
// Admin module:
import { registerAllSignals as registerAdminSignals } from './admin/main.js';

// Main component to render:
import App from './app';

//////////////////////////////////////////////////////////
// Setup the main signals:
_.each([
  PageOrderReceiptsSignals,
  PageRetrieveTicketSignals,
  PageEventTicketsSignals,
  PageEventStatsSignals,
  PageNotFoundSignals,
  PageCheckoutSignals,
  AppSignals,
  SeatmapSignals,
  CartSignals,
], function(register) {
  register(Controller);
});
// Add in any admin signals:
registerAdminSignals(Controller);

//////////////////////////////////////////////////////////
// Modules
import Devtools from 'cerebral-module-devtools';
import Forms from 'cerebral-module-forms';
import Router from 'cerebral-module-router';
import Checkout from './controller-checkout';
import routes from './router';
Controller.addModules({
  checkout: Checkout(),
  forms: Forms({
    rules: { // Forms a sub-module? Maybe export rules with module meta.
      isCard: (number) => card.number(number).isValid,
      isPostal: (code) => card.postalCode(code).isValid,
      isMonth: (month) => card.expirationMonth(month).isValid,
      isYear: (year) => card.expirationYear(year).isValid,
      isPhone: is.nanpPhone,
      isEmail: is.email
    }
  }),
// @ifdef DEVAPI
  devtools: Devtools(),
// @endif
  router: Router(routes, {
    onlyHash: false,
    urlStorePath: [ 'page', 'url' ],
  })
});

///////////////////////////////////////////////////////////
// Render the main App component
ReactDOM.render(
  <Container controller={Controller} app={App} />,
  document.getElementById('app-container')
);
