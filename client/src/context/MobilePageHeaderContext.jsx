import { createContext, useContext, useMemo, useState } from "react";

const MobilePageHeaderContext = createContext(null);

export const MobilePageHeaderProvider = ({ children }) => {
  const [headerActions, setHeaderActions] = useState(null);

  const value = useMemo(
    () => ({ headerActions, setHeaderActions }),
    [headerActions],
  );

  return (
    <MobilePageHeaderContext.Provider value={value}>
      {children}
    </MobilePageHeaderContext.Provider>
  );
};

export const useMobilePageHeader = () => {
  const ctx = useContext(MobilePageHeaderContext);
  if (!ctx) {
    return { headerActions: null, setHeaderActions: () => {} };
  }
  return ctx;
};
