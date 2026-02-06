// Header.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  InputBase,
  alpha,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";

interface HeaderProps {
  headerColor?: string;
  showSearch?: boolean;
}

const HEADER_HEIGHT = 64;

const Header: React.FC<HeaderProps> = ({
  headerColor = "#1E3A8A",
  showSearch = false,
}) => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();

  if (!token) return null;

  return (
    <AppBar
      position="fixed"
      sx={{
        background: headerColor,
        height: HEADER_HEIGHT,
        zIndex: (theme) => theme.zIndex.drawer + 10,
      }}
    >
      <Toolbar sx={{ height: HEADER_HEIGHT }}>
        <IconButton
          edge="start"
          color="inherit"
          sx={{ display: { xs: "flex", md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          onClick={() => navigate("/")}
          sx={{
            cursor: "pointer",
            fontWeight: 900,
            color: "#FFFFFF",
            fontFamily: `"Montserrat", sans-serif`,
          }}
        >
          Pukal Reports
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {showSearch && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: alpha("#fff", 0.15),
              px: 1,
              borderRadius: 1,
            }}
          >
            <SearchIcon />
            <InputBase placeholder="Search…" sx={{ ml: 1, color: "inherit" }} />
          </Box>
        )}

        <Button
          variant="outlined"
          size="small"
          onClick={logout}
          sx={{ ml: 2, color: "#fff", borderColor: "#fff" }}
        >
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
export { HEADER_HEIGHT };
