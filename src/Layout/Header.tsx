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
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  headerColor = "#1E3A8A",
  showSearch = false,
  onMenuClick,
}) => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();

    if (!token) return null;

  const handleLogout = () => {
    
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <AppBar position="static" sx={{ background: headerColor }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={onMenuClick}
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
            letterSpacing: "0.5px",
            textShadow: "0 2px 6px rgba(0,0,0,0.35)",
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
          onClick={handleLogout}
          sx={{ ml: 2, color: "#fff", borderColor: "#fff" }}
        >
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
