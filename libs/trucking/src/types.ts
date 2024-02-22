export const feedTrelloConfig = {
  board: "Feed",
  deliveredList: "Feed Delivered",
  availableList: "Available Load Numbers",
  webControlsList: "Web Controls",
};

export const grainTrelloConfig = {
  board: "Grain Hauling",
  webControlsList: "Web Controls",
};

export type FeedBoard = {
  delivered: {
    idList: string,
    records: FeedRecord[],
  },
  available: {
    idList: string,
    records: string[],
  },
  webControls: {
    idList: string,
    settings: FeedWebControls,
  }

  errors: string[],
};

export type GrainSellList = {
  idList: string,
  name: string,
  records: GrainRecord[],
};
export type GrainBoard = {
  sellLists: GrainSellList[],
  webControls: {
    idList: string,
    settings: GrainWebControls,
  },
  errors: string[],
};
    

export type FeedRecord = {
  date: string,
  source: string,
  loadNumber: string,
  dest: string,
  weight: number,
  driver: string,
  note?: string | false,
  // From labels:
  invoiced?: boolean,
  paidFor?: boolean,
  truckingPaid?: boolean,
  // From the card:
  id?: string,               // ID of card
  idList?: string,           // ID of Feed Delivered list
  cardName?: string,         // original card name for debugging
  dateLastActivity?: string, // for sorting by "recent"-ness
  // If there are any errors:
  error?: string,
};

export type GrainRecord = {
  date: string,
  sellerList: string,
  dest: string,
  bushels: number,
  ticket: string,
  crop: string,
  driver: string,
  note?: string | false,

  id?: string,               // ID of card
  idList?: string,           // ID of dead list
  cardName?: string,         // original card name for debugging
  dateLastActivity?: string, // for sorting by "recent"-ness

  error?: string,
};

export type FeedWebControls = {
  drivers: string[],
  destinations: string[],
  sources: string[],
};

export type GrainWebControls = {
  drivers: string[],
  destinations: string[],
  crops: string[],
};

export type ErrorRecord = {
  [key: string]: any,
  error: string,
};
