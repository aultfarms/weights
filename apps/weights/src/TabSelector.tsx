import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import debug from 'debug';
import { context } from './state';

import './TabSelector.css';

export const TabSelector = observer(function TabSelector() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  return (
    <div className="tabselector">

      <div className={'tabselectorbutton'}>
        <a onClick={() => (false)/*() => /*actions.changeToPreviousDateWithWeights()*/}>|&lt;</a>
        &nbsp;
        <input className="tabselectordateinput"
          value={state.date}
          type="date"
          onChange={evt => actions.changeDate(evt.target.value)}
          onBlur={() => actions.loadWeights()}
        />
        &nbsp;
        <a onClick={() => (false)/*actions.changeToNextDateWithWeights()*/}>&gt;|</a>
        &nbsp;&nbsp;
        <input type="checkbox" 
          defaultChecked={state.includeTodayInPastStats} 
          onChange={(evt) => actions.changeIncludeTodayInPastStats(evt.target.checked)} 
        />Today Stats
      </div>

      <div className={'tabselectorbutton ' + (state.tabSelector.active === 'weights' ? 'tabselectorbuttonactive' : '')}
        onClick={ () => actions.changeTab({ active: 'weights' }) }
      >
        Weights
      </div>

      <div className={'tabselectorbutton ' + (state.tabSelector.active === 'errors' ? 'tabselectorbuttonactive' : '')}
        onClick={ () => actions.changeTab({ active: 'errors' }) }
      >
        Errors
      </div>

      <div className={'tabselectorbutton ' + (state.tabSelector.active === 'prefs' ? 'tabselectorbuttonactive' : '')}
        onClick={ () => actions.changeTab({ active: 'prefs' }) }
      >
        Prefs
      </div>

    </div>
  );

});

