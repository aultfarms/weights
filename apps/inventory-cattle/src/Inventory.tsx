import * as React from 'react'

import { useOvermind } from './overmind';

export function Inventory() {
  const {state} = useOvermind();

  return <div className="inventory">
    I am the inventory, loaded = {state.allLoaded}
  </div>;
}
