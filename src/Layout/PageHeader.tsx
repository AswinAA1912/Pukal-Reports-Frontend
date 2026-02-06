import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Menu,
  Tooltip,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useNavigate, useLocation } from "react-router-dom";

export type ToggleMode = "Abstract" | "Expanded";

export interface Page {
  label: string;
  path: string;
}

interface PageHeaderProps {
  pages: Page[];

  /** OPTIONAL TOGGLE */
  toggleMode?: ToggleMode;
  onToggleChange?: (mode: ToggleMode) => void;

  /** OPTIONAL EXPORT */
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export const PAGE_HEADER_HEIGHT = 40;

const PageHeader: React.FC<PageHeaderProps> = ({
  pages,
  toggleMode,
  onToggleChange,
  onExportPDF,
  onExportExcel,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      {/* ===== FIXED HEADER ===== */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          background: "#1E3A8A",
          height: PAGE_HEADER_HEIGHT,
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: `${PAGE_HEADER_HEIGHT}px !important`,
            height: PAGE_HEADER_HEIGHT,
            px: 1,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          {/* LEFT */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography
              variant="body2"
              onClick={() => navigate("/dashboard")}
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                color: "#fff",
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
                <MenuItem key={p.path} value={p.path} sx={{ fontSize: "0.7rem" }}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* RIGHT */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* TOGGLE (ONLY IF PROVIDED) */}
            {toggleMode && onToggleChange && (
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
                <ToggleButton value="Abstract" sx={{ fontSize: "0.65rem" }}>
                  Abstract
                </ToggleButton>
                <ToggleButton value="Expanded" sx={{ fontSize: "0.65rem" }}>
                  Expanded
                </ToggleButton>
              </ToggleButtonGroup>
            )}

            {/* EXPORT */}
            {(onExportPDF || onExportExcel) && (
              <>
                <Tooltip title="Export">
                  <IconButton
                    size="small"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                      height: 24,
                      width: 24,
                      backgroundColor: "#fff",
                      borderRadius: 0.5,
                    }}
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={() => setAnchorEl(null)}
                >
                  {onExportPDF && (
                    <MenuItem
                      onClick={() => {
                        setAnchorEl(null);
                        onExportPDF();
                      }}
                    >
                      Export as PDF
                    </MenuItem>
                  )}
                  {onExportExcel && (
                    <MenuItem
                      onClick={() => {
                        setAnchorEl(null);
                        onExportExcel();
                      }}
                    >
                      Export as Excel
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* ===== SPACER TO PREVENT OVERLAP ===== */}
      <Box sx={{ height: PAGE_HEADER_HEIGHT }} />
    </>
  );
};

export default PageHeader;
