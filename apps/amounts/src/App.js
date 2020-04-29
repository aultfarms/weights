import React from 'react';
import './App.css';
import _ from 'lodash';
import numeral from 'numeral';
import writtenNumber from 'written-number';

class App extends React.Component {
  constructor() {
    super();
    this.state = { paste: '' }
  }

  pasteChanged(evt) {
    this.setState({ paste: evt.target.value});
  }

  renderAmounts() {
    const lines = _.split(this.state.paste.trim(),'\n');
    console.log('lines = ', lines);
    return _.map(lines, (l,i) => {
      const dollars = numeral(l.trim().replace(/\.[0-9]*$/,'')).value();
      const cents = l.trim().replace(/^.*\.([0-9]*)$/,'$1');
  
      let str = writtenNumber(dollars, { noAnd: true });
      str = _.join(
        _.map(str.split(' '), s => s.toUpperCase()[0] + s.slice(1)),
        ' '
      );
      str += ' Dollars and ' + cents + ' Cents';
      console.log('returning str = ', str);
      return <div key={`amount${i}`}>{str}</div>
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          Paste check amounts below, one per line
          <textarea rows="20" cols="80" wrap="hard" 
                    onChange={evt => this.pasteChanged(evt)}
                    value={this.state.paste} />
        <div style={{margin: '10px', padding: '10px', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#000000', textAlign: 'left', fontFamily: 'courier', fontSize: '14px'}}>
          {this.renderAmounts()}
        </div>
        </header>
      </div>
    );
  }
}

export default App;
