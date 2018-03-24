import { Module } from 'cerebral';
import * as signals from './sequences';

export default Module(m => {
  return {
    state: {
      authorized: false,
      lists: {
        // feed: {
        //   name: 'Feed Delivered'
        //   id: 'kdj20fi32jld',
        //   cards: { ... },  // the regular trello list of cards
        // }
      },
    },
  
    signals,

    // assumes global 'trello' provider exists in controller
  };
});

