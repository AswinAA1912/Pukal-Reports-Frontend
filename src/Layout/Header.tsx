import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  InputBase,
  alpha,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
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
  const { logout, token, user, companies, switchCompany } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  if (!token) return null;

  const handleCompanyClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCompanyClose = async (company?: any) => {
    setAnchorEl(null);
    if (company) await switchCompany(company);
  };

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

        {/* Switch Company */}
        {user && companies && companies.length > 1 && (
          <>
            <Button
              color="inherit"
              endIcon={<ArrowDropDownIcon />}
              onClick={handleCompanyClick}
              sx={{
                ml: 2,
                color: "#fff", // ✅ make button text white
                textTransform: "none", // keep company name as-is
              }}
            >
              {user.Company_Name || "Select Company"}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={() => handleCompanyClose()}
              PaperProps={{
                sx: { minWidth: 200 },
              }}
            >
              {companies.map((company) => {
                const isSelected = company.id === user.companyId;
                return (
                  <MenuItem
                    key={company.id}
                    onClick={() => handleCompanyClose(company)}
                    sx={{
                      backgroundColor: isSelected ? "rgba(0,0,0,0.08)" : "inherit", 
                      fontWeight: isSelected ? "bold" : "normal",                   
                    }}
                  >
                    {company.name}
                  </MenuItem>
                );
              })}
            </Menu>
          </>
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
