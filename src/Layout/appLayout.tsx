import React, { createContext, useState, useContext } from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Maincard from "../Components/Maincard";

/* ---------------- CONTEXT ---------------- */
interface ToggleContextType {
  toggleMode: "Abstract" | "Expanded";
  setToggleMode: (mode: "Abstract" | "Expanded") => void;
}

const ToggleContext = createContext<ToggleContextType>({
  toggleMode: "Abstract",
  setToggleMode: () => {},
});

export const useToggleMode = () => useContext(ToggleContext);

export interface AppLayoutProps {
  children?: React.ReactNode;
  fullWidth?: boolean;
}

/* ---------------- APP LAYOUT ---------------- */
const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  fullWidth = false,
}) => {
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
        {/* ===== CONTENT ONLY ===== */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: fullWidth ? 1 : 0,
          }}
        >
          {fullWidth ? (
            <Box sx={{ flex: 1 }}>{children ?? <Outlet />}</Box>
          ) : (
            <Maincard fullHeight loading={false}>
              {children ?? <Outlet />}
            </Maincard>
          )}
        </Box>
      </Box>
    </ToggleContext.Provider>
  );
};

export default AppLayout;
