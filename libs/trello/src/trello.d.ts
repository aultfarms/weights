declare module 'trello' {
  class Trello {
    constructor(devKey: string, token: string);
    makeRequest: (
      method: 'get' | 'put' | 'post' | 'delete', 
      uri: string, 
      params: any, 
    ) => Promise<any>;
  }
  export = Trello;
};
