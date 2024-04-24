//import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import { context } from './state';

import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import './NavBar.css';

export const NavBar = observer(function App() {
  //const _ctx = React.useContext(context);
  //const { state, actions } = ctx;
  return (
    <AppBar position="static" className="navbar">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ mr: 2, display: { xs: 'flex', md: 'flex' } }}
          >
            <img width="100px" src="aultfarms_logo.png" />
          </Typography>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ mr: 2, display: { xs: 'flex', md: 'flex' } }}
          >
            Grain Hauling
          </Typography>
        </Toolbar>
      </Container>
    </AppBar>
   );
});