export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }
};
