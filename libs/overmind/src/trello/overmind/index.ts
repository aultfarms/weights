import { effects, IEffects as IEffectsForExport } from './effects';

export type IEffects = IEffectsForExport;

export interface ITrello {
  effects: IEffects;
};

export const trello = {
  effects,
}

