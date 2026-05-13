import React, { useContext } from 'react';
import { Text as RNText } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

const ThemeText = (props) => {
  const { theme } = useContext(ThemeContext);
  
  // Merge the theme's fontFamily with existing styles
  // We put theme.fontFamily FIRST so that if a component explicitly 
  // defines its own fontFamily, it can still override the theme (optional)
  // but usually we want the theme to be the base.
  const combinedStyle = [{ fontFamily: theme.fontFamily }, props.style];

  return (
    <RNText {...props} style={combinedStyle}>
      {props.children}
    </RNText>
  );
};

export default ThemeText;
