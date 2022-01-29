// Global type for a Tag:

export type ErrorRecord = {
  cardName?: string,
  idList?: string,
  id?: string,
  error: string,
};

export type Tag = {
  number: number;
  color: string;
  groupname?: string;
};

export type TagRange = {
  start: Tag;
  end: Tag;
};

export type Group = {
  groupname: string;
  date: string;
  tag_ranges: TagRange[];
};

