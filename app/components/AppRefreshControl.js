import React from 'react';
import { RefreshControl } from 'react-native';

const AppRefreshControl = ({
  refreshing,
  onRefresh,
  tintColor = '#1996D3',
}) => {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={[tintColor]} // Android
      progressBackgroundColor="#fff"
    />
  );
};

export default AppRefreshControl;