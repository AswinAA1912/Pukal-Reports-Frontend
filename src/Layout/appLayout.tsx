import React, { createContext, useState, useContext } from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Header from "./Header";
import PageHeader from "./PageHeader";
import Maincard from "../Components/Maincard";
import { useAuth } from "../auth/authContext";

/* ---------------- CONTEXT ---------------- */
interface ToggleContextType {
  toggleMode: "Abstract" | "Expanded";
  setToggleMode: (mode: "Abstract" | "Expanded") => void;
}

const ToggleContext = createContext<ToggleContextType>({
  toggleMode: "Abstract",
  setToggleMode: () => { },
});

export interface AppLayoutProps {
  children?: React.ReactNode;
  showHeader?: boolean;
  fullWidth?: boolean;
  headerVariant?: "dashboard" | "page";
  pages?: { label: string; path: string }[];
}


export const useToggleMode = () => useContext(ToggleContext);

/* ---------------- APP LAYOUT ---------------- */
const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showHeader = true,
  fullWidth = false,
  headerVariant = "dashboard",
  pages = [],
}) => {
  const { token } = useAuth();

  const [toggleMode, setToggleMode] = useState<"Abstract" | "Expanded">(
    "Abstract"
  );

  return (
    <ToggleContext.Provider value={{ toggleMode, setToggleMode }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: fullWidth
            ? "#F1F5F9"
            : "linear-gradient(to bottom, #87CEFA, #B0E0E6)",
        }}
      >
        {/* Header */}
        {token && showHeader && headerVariant === "dashboard" && (
          <Header headerColor="#1E3A8A" showSearch={false} />
        )}

        {token && showHeader && headerVariant === "page"
         && (
          <PageHeader
            pages={pages}
            toggleMode={toggleMode}
            onToggleChange={setToggleMode}
          />
        )}


        {/* Content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: token && showHeader ? "calc(100vh - 56px)" : "100vh",
            overflow: "auto",
            p: fullWidth ? 1 : 0,
          }}
        >
          {fullWidth ? (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "visible" }}>
              {children ?? <Outlet />}
            </Box>
          ) : (
            <Maincard fullHeight loading={false}>
              <Box sx={{ flex: 1, minHeight: 0, overflowY: "visible" }}>
                {children ?? <Outlet />}
              </Box>
            </Maincard>
          )}
        </Box>
      </Box>
    </ToggleContext.Provider>
  );
};

export default AppLayout;