import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { profitloss } from '@aultfarms/accounts';
import { context } from './state';
import Paper from '@mui/material/Paper';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData, 
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
const options: ChartOptions<'line'> = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Chart.js Line Chart',
    },
  },
};
const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const warn = debug('accounts#Chart:warn');
const info = debug('accounts#Chart:info');

export const Chart = observer(function Chart() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  const final = actions.ledger()?.final;
  const pls = actions.profitlosses();
  if (!pls) return (
    <div style={{ margin: '10px' }}>
      <div>No profit/loss statements available yet</div>
      <Button 
        disabled={!state.stepResult.rev || !(actions.ledger()?.final)} 
        variant="contained" 
        onClick={() => actions.computeProfitLoss()}
      >
        Create Profit/Loss Statements
      </Button>
    </div>
  );

  let years = Object.keys(pls).sort().reverse();

  let catindex: { [cat: string]: true } = {};
  for (const year of years) {
    const p = pls[year]!;
    if (!p[state.profitloss.type]?.categories) {
      warn('WARNING: profit loss for year ', year, ' and type ', state.profitloss.type, ' does not exist!');
      continue;
    }
    profitloss.treeToCategoryNames(p[state.profitloss.type].categories, catindex, { excludeRoot: true });
  }
  const catnames = Object.keys(catindex).sort();

  const displayCategoryFilter = () => {
    let options: string[] = [ 'All', ...catnames];

    // note that evt starts with an underscore, that tells typescript I know it isn't used
    const onChange = (_evt: any, name: string | null) => {
      actions.selectedAccountCategory(name || 'All');
    };
    const onKeyDown = (evt: any) => {
      if (evt.key === 'Enter') {
        evt.defaultMuiPrevented = true;
        actions.selectedAccountCategory(evt.target.value);
        evt.target.blur();
      }
    };
    return <Autocomplete
      disablePortal
      id="category-chooser"
      options={options}
      sx={{ width: 500 }}
      renderInput={(params) => <TextField {...params} label="Filter to Category" />}
      autoSelect
      value={state.selectedAccount.category || 'All'}
      onChange={onChange}
      onKeyDown={onKeyDown}
      style={{ padding: '10px' }}
    />;
  }


  const displayTypeChooser = () => {
    const toggleType = (_evt: React.MouseEvent<HTMLElement>, val: 'mkt' | 'tax') => {
      actions.profitlossType(val);
    };

    return (
      <div style={{ padding: '10px' }}>
        <ToggleButtonGroup 
          color='primary'
          onChange={toggleType} 
          exclusive 
          value={state.profitloss.type}
        >
          <ToggleButton value="mkt">Mkt</ToggleButton>
          <ToggleButton value="tax">Tax</ToggleButton>
        </ToggleButtonGroup>
      </div>
    );
  }


  // From https://stackoverflow.com/questions/45771849/chartjs-random-colors-for-each-part-of-pie-chart-with-data-dynamically-from-data
  const randomNum = () => Math.floor(Math.random() * (235 - 52 + 1) + 52);
  const randomRGB = () => `rgb(${randomNum()}, ${randomNum()}, ${randomNum()})`;

  const displayChart = () => {
    const type = state.profitloss.type;
    let catname = state.selectedAccount.category || 'root';
    if (catname === 'All') catname = 'root';
    const data: ChartData<'line'> = { labels, datasets: [] };
    const nowMonth = dayjs().endOf('month');
    for (const year of years) {
      const pl = pls[year]![type];
      // 12 months
      const amounts: number[] = [];
      for (let i=1; i <= 12; i++) {
        // Note single "M" below for non-zero-padded month to simplify
        const date = dayjs(`${year}-${i}-01`, 'YYYY-M-DD').endOf('month').endOf('day');
        if (date.isAfter(nowMonth)) continue; // no points in the future
        const cfg: profitloss.AmountConfig = { end: date, debug: true };
        if (catname && catname !== 'root') cfg.only = catname;
        const amount = profitloss.amount(pl.categories, cfg);
        amounts.push(amount);
      }
      const yearcolor = randomRGB();
      data.datasets.push({
        label: year,
        data: amounts,
        borderColor: yearcolor, //'rgb(255, 99, 132)',
        backgroundColor: yearcolor, //'rgb(255, 99, 132)',
      });
    }

    return <Line options={options} data={data} />;
  }

  return (
    <Paper elevation={1}>
      <div style={{ paddingLeft: '10px', paddingRight: '10px', display: 'flex', flexDirection: 'row' }}>
        <h1>Profit/Loss - {state.profitloss.type === 'mkt' ? 'Market' : 'Tax'}</h1>
        <div style={{ flexGrow: 1 }}></div>
        {displayCategoryFilter()}
        {displayTypeChooser()}
        <div style={{width: '20px'}}></div>
      </div>
      {displayChart()}
    </Paper>
  )
});
