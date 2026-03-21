let currentIO = null;

export const setIO = (io) => {
  currentIO = io;
};

export const getIO = () => currentIO;

