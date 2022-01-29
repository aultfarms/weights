import * as sequences from './sequences';

export default {
  sequences,
  state: {
    treatmentCodes: [
      { "code": "Z", "name": "Zuprevo" },
      { "code": "Za", "name": "Zactran" },
      { "code": "Dr", "name": "Draxxin" },
      { "code": "N", "name": "Nuflor" },
      { "code": "No", "name": "Noromycin" },
      { "code": "P", "name": "Pennicillin" },
      { "code": "Px", "name": "Polyflex" },
      { "code": "By", "name": "Baytril" },
      { "code": "Ex", "name": "Excenel" },
      { "code": "S", "name": "Sulfa" },
      { "code": "D", "name": "Dex" },
      { "code": "E", "name": "Electrolytes" },
      { "code": "Ht", "name": "High Temp" },
      { "code": "Lt", "name": "Low Temp" },
      { "code": "Nt", "name": "No Temp" }
    ],
    colors: {
        "ORANGE": "#FF9900",
        "YELLOW": "#E9E602",
      "MARTYELL": "#FF00FF",
         "BLACK": "#000000",
           "RED": "#FF0000",
         "WHITE": "#FFFFFF"
    },
    records: [
      // {
      //   date: 2018-03-17,
      //   treatment: 'DrExHt',
      //   tags: [
      //     { number: 123, color: 'ORANGE' }
      //   ]
      // },
    ],
  },

};
