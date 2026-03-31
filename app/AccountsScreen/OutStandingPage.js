// OutstandingPage.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

export default function OutstandingPage({ nightMode, data, loading }){
  const styles = getStyles(nightMode);
  if(loading){
    return <ActivityIndicator style={{flex:1,justifyContent:'center'}} size="large" color="#1996D3"/>;
  }
  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data||[]}
      keyExtractor={i=>i.id.toString()}
      renderItem={({item})=>(
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.amount}>Balance: {item.data.balance}</Text>
          <Text style={styles.date}>Date: {item.data.date||item.data.bill_date}</Text>
          <Text style={styles.msg}>{item.message}</Text>
        </View>
      )}
    />
  );
}

const getStyles=night=>StyleSheet.create({
  list:{padding:16},
  card:{
    backgroundColor: night?'#1e1e1e':'#fff',
    padding:16,
    borderRadius:8,
    marginBottom:12,
    shadowColor:'#000',
    shadowOffset:{width:0,height:2},
    shadowOpacity: night?0.3:0.1,
    shadowRadius:4,
    elevation:3,
  },
  name:{color: night?'#fff':'#074B7C', fontSize:16, fontWeight:'600'},
  amount:{color:'#1996D3', marginTop:4},
  date:{color:'#6c757d', marginTop:2},
  msg:{color:'#6c757d', marginTop:4},
});
