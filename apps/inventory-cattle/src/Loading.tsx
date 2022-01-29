import * as React from 'react';
import { useOvermind } from './overmind';

export function Loading() {
  const { state } = useOvermind();

  if (state.allLoaded) return null;

  return <div className="loading">
    Load Receipts (Drive)<br/>
    Load Accounts (Sheets)<br/>
    Load In/Out records (Trello)<br/>
  </div>;
}
