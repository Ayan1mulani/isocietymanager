// // Utils/PendingVisitorHandler.js
// import { useEffect } from 'react';
// import { usePermissions } from './ConetextApi';
// import { navigate } from '../NavigationService';

// export default function PendingVisitorHandler() {
//   const { pendingVisitor, setPendingVisitor } = usePermissions();

//   useEffect(() => {
//     if (!pendingVisitor?.id) return;
// navigate('VisitorNotificationMessage', { visitor });
//     setPendingVisitor(null); // clear immediately — one-shot
//   }, [pendingVisitor]);

//   return null;
// }