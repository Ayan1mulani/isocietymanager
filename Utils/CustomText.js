import React from 'react';
import { Text } from 'react-native';

const CustomText = ({ style, children, ...props }) => {
  return (
    <Text {...props} style={[{ fontFamily: 'Poppins-Regular' }, style]}>
      {children}
    </Text>
  );
};

export default CustomText;
