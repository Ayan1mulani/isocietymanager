let showPopup;

export const setPopupHandler = (handler) => {
  showPopup = handler;
};

export const triggerVisitorPopup = (message) => {
  if (showPopup) {
    showPopup(message);
  }
};