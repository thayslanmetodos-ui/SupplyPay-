import React, { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { showNotification, requestNotificationPermission } from '../utils/notificationUtils';
import { AppNotification } from '../types';

export default function NotificationHandler() {
  const { user } = useAuth();
  const shownNotifications = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.uid) return;

    // Request permission on mount if user is logged in
    requestNotificationPermission();

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    let isInitialLoad = true;
    const unsub = onSnapshot(q, (snapshot) => {
      // On initial load, we don't want to show notifications for old items
      if (isInitialLoad) {
        snapshot.docs.forEach(doc => shownNotifications.current.add(doc.id));
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as AppNotification;
          
          if (!notification.read && !shownNotifications.current.has(notification.id)) {
            shownNotifications.current.add(notification.id);
            
            showNotification('SupplyPay', {
              body: notification.message,
              tag: notification.id,
              data: { url: window.location.origin }
            });
          }
        }
      });
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsub();
  }, [user?.uid]);

  return null;
}
