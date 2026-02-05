import React from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

interface Page {
  label: string;
  path: string;
}

interface PageHeaderProps {
  pages: Page[];
  toggleMode: "Abstract" | "Expanded";
  onToggleChange: (mode: "Abstract" | "Expanded") => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  pages,
  toggleMode,
  onToggleChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        background: "#1E3A8A",
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: "35px !important",
          height: 35,
          px: 1,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {/* ===== LEFT : TITLE + DROPDOWN ===== */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            variant="body2"
            onClick={() => navigate("/dashboard")}
            sx={{
              cursor: "pointer",
              fontWeight: 600,
              color: "#fff",
              fontFamily: `"Montserrat", sans-serif`,
              letterSpacing: 0.3,
              lineHeight: "28px",
              whiteSpace: "nowrap",
            }}
          >
            Pukal Reports
          </Typography>

          <Select
            size="small"
            value={location.pathname}
            onChange={(e) => navigate(e.target.value)}
            sx={{
              minWidth: 180,
              height: 24,
              fontSize: "0.7rem",
              backgroundColor: "#fff",
              borderRadius: 0.5,
              "& .MuiSelect-select": {
                py: 0,
                display: "flex",
                alignItems: "center",
              },
            }}
          >
            {pages.map((p) => (
              <MenuItem
                key={p.path}
                value={p.path}
                sx={{ fontSize: "0.7rem" }}
              >
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* ===== RIGHT : TOGGLE ===== */}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={toggleMode}
          onChange={(_, val) => val && onToggleChange(val)}
          sx={{
            height: 24,
            background: "#fff",
            borderRadius: 0.5,
          }}
        >
          <ToggleButton
            value="Abstract"
            sx={{
              height: 24,
              px: 1,
              py: 0,
              fontSize: "0.65rem",
            }}
          >
            Abstract
          </ToggleButton>
          <ToggleButton
            value="Expanded"
            sx={{
              height: 24,
              px: 1,
              py: 0,
              fontSize: "0.65rem",
            }}
          >
            Expanded
          </ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>
    </AppBar>
  );
};

export default PageHeader;
