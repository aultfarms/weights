export * as sequences from './sequences';
import type { Tag, ErrorRecord } from '../../types';

export type Record = DeadRecord | ErrorRecord;

export type DeadRecord = {
  date: string,
  tags: Tag[],
  note?: string | false,
  id: string,               // ID of card
  idList: string,           // ID of dead list
  cardName: string,         // original card name for debugging
  dateLastActivity: string, // for sorting by "recent"-ness
};


export const state: { tagIndex: {}, records: DeadRecord[] } = {
  tagIndex: {},
  records: [
    // {
    //   date: 2018-03-17,
    //   tags: [ { number: 123, color: 'ORANGE' }],
    //   id: '02kjlwfj0f23',                // ID of the card
    //   idList: '2fj0ijosdf',              // ID of the dead list
    //   cardName: '2018-03-17: ORANGE123', // original card, for debugging
    //   dateLastActivity: '2018-03-17',    // for sorting by "recent"-ness
    // },
  ],
};


