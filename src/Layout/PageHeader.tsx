import React, { useState, useMemo } from "react";
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
  Button,
  alpha,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, Company } from "../auth/authContext";

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

  const { user, companies, switchCompany, logout } = useAuth();
  const [anchorElCompany, setAnchorElCompany] = useState<null | HTMLElement>(null);
  const openCompanyMenu = Boolean(anchorElCompany);

  const [anchorElExport, setAnchorElExport] = useState<null | HTMLElement>(null);
  const openExportMenu = Boolean(anchorElExport);

  // Company name for display
  const companyName = useMemo(() => user?.Company_Name || "", [user]);

  // Handle company menu
  const handleCompanyClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElCompany(event.currentTarget);
  };

  const handleCompanyClose = async (company?: Company) => {
    setAnchorElCompany(null);
    if (company) {
      await switchCompany(company);
      window.location.reload();
    }
  };

  return (
    <>
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
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
          }}
        >
          {/* LEFT: App title + pages */}
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

          {/* CENTER: Company Switch */}
          <Box sx={{ textAlign: "center" }}>
            {user && companies && companies.length > 1 ? (
              <>
                <Button
                  color="inherit"
                  endIcon={<ArrowDropDownIcon />}
                  onClick={handleCompanyClick}
                  sx={{ color: "#fff", textTransform: "none", fontWeight: 700 }}
                >
                  {companyName || "Select Company"}
                </Button>
                <Menu
                  anchorEl={anchorElCompany}
                  open={openCompanyMenu}
                  onClose={() => handleCompanyClose()}
                  PaperProps={{ sx: { minWidth: 180 } }}
                >
                  {companies.map((company) => {
                    const isSelected = company.id === user.companyId;
                    return (
                      <MenuItem
                        key={company.id}
                        onClick={() => handleCompanyClose(company)}
                        sx={{
                          backgroundColor: isSelected ? alpha("#fff", 0.15) : "inherit",
                          fontWeight: isSelected ? "bold" : "normal",
                        }}
                      >
                        {company.name}
                      </MenuItem>
                    );
                  })}
                </Menu>
              </>
            ) : (
              <Typography
                variant="body2"
                sx={{ color: "#fff", fontWeight: 700 }}
              >
                {companyName}
              </Typography>
            )}
          </Box>

          {/* RIGHT: Toggle + Export + Logout */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
            {toggleMode && onToggleChange && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={toggleMode}
                onChange={(_, val) => val && onToggleChange(val)}
                sx={{ height: 24, background: "#fff", borderRadius: 0.5 }}
              >
                <ToggleButton value="Abstract" sx={{ fontSize: "0.65rem" }}>Abstract</ToggleButton>
                <ToggleButton value="Expanded" sx={{ fontSize: "0.65rem" }}>Expanded</ToggleButton>
              </ToggleButtonGroup>
            )}

            {(onExportPDF || onExportExcel) && (
              <>
                <Tooltip title="Export">
                  <IconButton
                    size="small"
                    onClick={(e) => setAnchorElExport(e.currentTarget)}
                    sx={{ height: 24, width: 24, backgroundColor: "#fff", borderRadius: 0.5 }}
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Menu anchorEl={anchorElExport} open={openExportMenu} onClose={() => setAnchorElExport(null)}>
                  {onExportPDF && (
                    <MenuItem
                      onClick={() => {
                        setAnchorElExport(null);
                        onExportPDF();
                      }}
                    >
                      Export as PDF
                    </MenuItem>
                  )}
                  {onExportExcel && (
                    <MenuItem
                      onClick={() => {
                        setAnchorElExport(null);
                        onExportExcel();
                      }}
                    >
                      Export as Excel
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}

            {/* Logout */}
            <Tooltip title="Logout">
              <IconButton
                size="small"
                onClick={logout}
                sx={{
                  ml: 1,
                  backgroundColor: "#c02222",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  "&:hover": {
                    backgroundColor: "#a61c1c",
                  },
                }}
              >
                <PowerSettingsNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Spacer */}
      <Box sx={{ height: PAGE_HEADER_HEIGHT }} />
    </>
  );
};

export default PageHeader;
