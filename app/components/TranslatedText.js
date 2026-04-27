import React from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

const TranslatedText = (props) => {
  const { t } = useTranslation();
  
  // If the text inside is just a simple string, translate it
  let content = props.children;
  if (typeof content === 'string') {
    content = t(content);
  }

  return <Text {...props}>{content}</Text>;
};

export default TranslatedText;