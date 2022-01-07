import React from 'react';

import Container from '@mui/material/Container';

import Header from './components/header';
import FeederTable from './components/feeder-table';

import './App.css';

function App() {
  return (
    <Container>
      <Header />
      <FeederTable />
    </Container>
  );
}

export default App;
