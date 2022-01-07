import React, { useEffect, useRef, useState } from 'react';

import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';

import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';

import './styles.css';

function Header() {
  const skipInitialRender = useRef(false);

  const [isDarkMode, setIsDarkMode] = useState(Boolean(localStorage.getItem('darkMode')));

  useEffect(() => {
    if (!skipInitialRender.current) {
      skipInitialRender.current = true;

      if (!isDarkMode) {
        return;
      }
    }

    const computedStyle = getComputedStyle(document.documentElement);
    const darkColor = computedStyle.getPropertyValue('--color-dark');
    const whiteColor = computedStyle.getPropertyValue('--color-white');

    document.documentElement.style.setProperty('--color-dark', whiteColor);
    document.documentElement.style.setProperty('--color-white', darkColor);

    if (isDarkMode) {
      localStorage.setItem('darkMode', 'true');
    } else {
      localStorage.removeItem('darkMode');
    }
  }, [isDarkMode]);

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <h1>Feeders</h1>
      <FormControlLabel
        classes={{
          root: 'dark-mode-label-wrapper',
          label: 'dark-mode-label',
        }}
        control={
          <Switch
            disableRipple
            inputProps={{ 'aria-label': 'Dark mode' }}
            checked={isDarkMode}
            onChange={(event) => setIsDarkMode(event.target.checked)}
          />
        }
        label={isDarkMode ? <DarkMode /> : <LightMode />}
      />
    </Stack>
  );
}

export default Header;