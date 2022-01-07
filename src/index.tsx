import React from 'react';
import ReactDOM from 'react-dom';

import App from './modules/App';

import './index.css';
import './mui-overrides.css';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
