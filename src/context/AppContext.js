import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [shopName, setShopName] = useState('');
  const [shopId, setShopId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = (name, id) => {
    setShopName(name);
    setShopId(id);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setShopName('');
    setShopId(null);
    setIsLoggedIn(false);
  };

  return (
    <AppContext.Provider value={{ shopName, shopId, isLoggedIn, login, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
