// dev key: 3ad06cb25802014a3f24f479e886771c
// URL to refresh client lib: https://api.trello.com/1/client.js?key=3ad06cb25802014a3f24f479e886771c

import oerror from '@overleaf/o-error'
import Promise from 'bluebird'

interface Window {
  Trello?: any; // global Trello client
}

const waitUntilLoaded = () => Promise.try(() => {
  let count = 0;
  const check = (): (Promise<boolean> | boolean) => {
    
    if ((window as Window).Trello) return true;
    if (count++ > 50) throw new Error('Could not load Trello client library');
    return Promise.delay(250).then(check);
  };
  return Promise.try(check);
});


export interface IEffects {
  authorize: () => Promise<boolean>;
  deauthorize: () => void;
  get: (path: string, params: any) => Promise<any>;
  put: (path: string, params: any) => Promise<any>;
  post: (path: string, params: any) => Promise<any>;
};

// Promisify the normal Trello client:
export const effects: IEffects = {
  //-------------------------------------------------
  // call authorize first before any other functions in this provider:
  authorize: async (): Promise<boolean> => {
    await waitUntilLoaded();
    return new Promise((resolve,reject) => {
      (window as Window).Trello.authorize({
        type: 'redirect',
        name: 'Ault Farms - Invoices',
        persist: true,
        scope: { read: 'true', write: 'true' },
        expiration: 'never',
        success: resolve,
        error: (err: any) => reject(oerror.tag(err,'Failed to authorize trello')),
      });
    })
  },

  deauthorize: async () => {
    await waitUntilLoaded();
    return new Promise<void>((resolve,reject)  => {
      try { (window as Window).Trello.deauthorize(); resolve(); }
      catch(err: any) { reject(oerror.tag(err, 'Failed to deauthorize Trello client!')) }
    })
  },

  get: async (path: string, params?: any): Promise<any> => (
    new Promise((resolve,reject) => 
      (window as Window).Trello.get(path,params||{},
        resolve,
        (err: any) => reject(oerror.tag(err, 'Failed Trello.get!')) 
      ) 
    )
  ),

  put: async (path: string, params?: any): Promise<any> => (
    new Promise((resolve,reject) => 
      (window as Window).Trello.put( path,params||{},
        resolve,
        (err: any) => reject(oerror.tag(err, 'Failed Trello.get!')) 
      ) 
    )
  ),

  post: async (path: string,params?: any): Promise<any> => (
    new Promise((resolve,reject) => 
      (window as Window).Trello.post( path,params||{},
        resolve,
        (err: any) => reject(oerror.tag(err, 'Failed Trello.get!')) 
      ) 
    )
  ),



};


