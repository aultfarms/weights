import React from 'react';
import FontAwesome from 'react-fontawesome';

import {connect} from '@cerebral/react';
import {state,signal} from 'cerebral/tags';

import './TabSelector.css';

export default connect({
  tabSelector: state`tabSelector`,
  changeTab: signal`changeTab`,
}, function TabSelector(props) {
  const   prefsClicked = evt => props.changeTab({ active: 'prefs' });
  const weightsClicked = evt => props.changeTab({ active: 'weights' });
  const     tagClicked = evt => props.changeTab({ active: 'tag' });
  const   groupClicked = evt => props.changeTab({ active: 'group' });
  const    deadClicked = evt => props.changeTab({ active: 'dead' });

  return (
    <div className="tabselector">
      <div className={'tabselectorbutton ' + (props.tabSelector.active === 'prefs' ? 'tabselectorbuttonactive' : '')}
           onClick={prefsClicked}>
        <FontAwesome name='bars' />
      </div>
      <div className={'tabselectorbutton ' + (props.tabSelector.active === 'weights' ? 'tabselectorbuttonactive' : '')}
           onClick={weightsClicked}>
        Weights
      </div>
      <div className={'tabselectorbutton ' + (props.tabSelector.active === 'tag' ? 'tabselectorbuttonactive' : '')}
           onClick={tagClicked}>
        Tag
      </div>
      <div className={'tabselectorbutton ' + (props.tabSelector.active === 'group' ? 'tabselectorbuttonactive' : '')}
           onClick={groupClicked}>
        Group
      </div>
      <div className={'tabselectorbutton ' + (props.tabSelector.active === 'dead' ? 'tabselectorbuttonactive' : '')}
           onClick={deadClicked}>
        Dead
      </div>

    </div>
  );

});

