import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import parseLib from './parseLib';

const nameCategoryMapping = {
  'ADM Logansport': 'sales-grain-corn',
  'AGRICOR, INC.': 'feed-hominy',
  'ARCHER DANIELS MIDLAND': 'feed-hulls',
  'AT&T - AultFarms': 'employee-phone',
  'AT&T Mobility - DAD': 'employee-phone',
  'Ag Source, Inc.': 'repairs-grainhandling',
  'Agco Finance - Agco Plus': 'repairs-telehandler',
  'Agronomic Solutions': 'services-regulatory',
  'BBH Trucking': 'feed-trucking-brad',
  'BIG R STORES': 'supplies-general',
  'BLB Trucking': 'repairs-truck-general',
  'Bane Welker Equip - PAY PLYMOUTH EAUL01': 'repairs-tractors',
  'Bane Welker Equip - PAY WINAMAC DAUL01': 'repairs-tractors',
  'Bob Gottschalk': 'SPLIT',
  'Bonnie Montgomery': 'cashrent-fall',
  'Bush Veterinary Services, P.C.': 'medicine',
  'Calf Care': 'medicine',
  'Cargill Incorporated': 'feed-gluten',
  'Ceres Solutions': 'SPLIT',
  'Cole Hardwood': 'bedding-sawdust',
  'Cole Warren Farms': 'feed-syrup',
  'Cornerstone Comfort Solutions': 'repairs-hvac',
  'DRAGO INDIANA': 'repairs-cornhead',
  'DirecTV': 'utilities-tv',
  'Du-Mar Welding LLC': 'supplies-general',
  'Enyart\'s True Value': 'supplies-general',
  'Fansler Lumber Co. Inc.': 'supplies-general',
  'Farm Credit Mid America': 'SPLIT',
  'Ferguson Farms, Inc.': 'repairs-truck-trailer',
  'Fulton County Treasurer': 'taxes-property',
  'GUTWEIN LLP': 'services-legal',
  'Greenmark Equipment': 'repairs-tractors',
  'Gutwein Dairy Consulting, Inc.': 'feed-mineral',
  'H&H Diesel Inc.': 'repairs-truck-general',
  'HOLLOWAY\'S ELECTRIC MOTOR SERVICE': 'repairs-general',
  'Homer Miller': 'bedding-sawdust',
  'INGREDION': 'feed-gluten',
  'Indiana Department of Workforce Development': 'taxes-state-unemployment',
  'Indiana State Chemist': 'miscellaneous-licensefees',
  'Irving Materials, Inc.': 'bedding-chips',
  'JOHNNY ON THE SPOT': 'utilities-sanitation',
  'Jeri Stinson': 'services-cleaning',
  'Joe Miller': 'supplies-twine',
  'Kline\'s CPA Group, P.C.': 'services-accounting',
  'Lawson Products, Inc.': 'supplies-general',
  'Liberty Mutual Acct 401580870': 'insurance-auto',
  'Liberty Mutual Acct 6680': 'insurance-general',
  'NAPA AUTO PARTS': 'supplies-general',
  'NAU Country Insurance': 'insurance-crop',
  'NIPSCO': 'utilities-gas',
  'New Holland Rochester Inc.': 'repairs-tractors',
  'OR Processing': 'feed-candy',
  'OYLER REPAIR SHOP': 'repairs-general',
  'Organix Recycling': 'feed-fruit',
  'POWER BRAKE AND SPRING': 'supplies-general',
  'Pallet Pro LLC': 'bedding-sawdust',
  'Parker & Sons Eqpt., Inc.': 'repairs-jcb',
  'Premier Pallet LLC': 'bedding-sawdust',
  'Protective Insurance Company': 'insurance-workmanscomp',
  'Prudential': 'insurance-life-carl',
  'Rochester LP Gas': 'utilities-gas',
  'SMITH FARM STORE': 'supplies-general',
  'Safeco Insurance': 'insurance-auto',
  'Sam\'s Club': 'miscellaneous-subscriptions',
  'Service Sanitation': 'utilities-sanitation',
  'Silver Star Companies, LLC': 'crop-seed-wheat',
  'The Andersons': 'SPLIT',
  'Transfer from Farm Credit': 'transfer-from:FC.RLOC,to:FF.checking',
  'Tri-State Calf Products': 'cattle-purchase-cattle',
  'ULERICK HEATING & COOLING': 'repairs-hvac',
  'VPSI DUBOIS DISTRIBUTORS': 'medicine',
  'Valley Sanitation': 'utilities-trash',
  'Voya Finanacial': 'insurance-life-rita',
  'Wiers International Trucks SOUTH BEND': 'repairs-truck-general',
  'Wildman Uniform and Linen': 'employee-clothes',
};

const col = val => <td style={{minWidth:'25px'}}>{val ? val : ''}</td>;

const splitRowFarmCredit = (key) => 
  <tr key={key}>
    {col()}
    {col()}
    {col()}
    {col('SPLIT')}
    {col()}
    {col()}
    {col()}
    {col()}
    {col('SPLIT')}
    {col()}
  </tr>;

const objToRow = (r,i) => 
  <tr key={'row'+i}>
    {col(r.date)}
    {col()}
    {col(r.check)}
    {col(r.conf)}
    {col(r.amt)}
    {col()}
    {col()}
    {col()}
    {col(r.name)}
    {col(nameCategoryMapping[r.name] ? nameCategoryMapping[r.name] : '')}
  </tr>
;

class App extends Component {
  
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (this.state.do_parse

    ? <div className="App">
        Paste this into google sheets:
        <table style={ { border: '1px solid grey' } }>
          <tbody>
            { 
              parseLib(this.state.pasted_data).reduce((acc,r,i) => {
                acc.push(objToRow(r,i));
                if (nameCategoryMapping[r.name] === 'SPLIT') {
                  if (r.name === 'Farm Credit Mid America') {
                    // 2 empty rows
                    acc.push(splitRowFarmCredit('row'+i+'_1'));
                    acc.push(splitRowFarmCredit('row'+i+'_2'));
                  }
                }
                return acc;
              }, [])
            }
          </tbody>
        </table>
      </div>

    : <div className="App">
        Paste stuff from bank here:
        <br/>
        <textarea rows="40" cols="120" onChange={ evt => this.setState({ pasted_data: evt.target.value }) }>{this.state.pasted_data}</textarea>
        <br/>
        <button onClick={() => this.setState({ do_parse: true }) } >Convert</button>
      </div>
    )
  }
}

export default App;
