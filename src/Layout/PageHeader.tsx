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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
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

  /** ✅ OPTIONAL SETTINGS SLOT */
  settingsSlot?: React.ReactNode;
}

export const PAGE_HEADER_HEIGHT = 40;
export const PAGE_HEADER_HEIGHT_MOBILE = 72;

const PageHeader: React.FC<PageHeaderProps> = ({
  pages,
  toggleMode,
  onToggleChange,
  onExportPDF,
  onExportExcel,
  settingsSlot,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, companies, switchCompany, logout } = useAuth();
  const [anchorElCompany, setAnchorElCompany] = useState<null | HTMLElement>(null);
  const openCompanyMenu = Boolean(anchorElCompany);

  const [anchorElExport, setAnchorElExport] = useState<null | HTMLElement>(null);
  const openExportMenu = Boolean(anchorElExport);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
          height: isMobile ? PAGE_HEADER_HEIGHT_MOBILE : PAGE_HEADER_HEIGHT,
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: isMobile
              ? `${PAGE_HEADER_HEIGHT_MOBILE}px !important`
              : `${PAGE_HEADER_HEIGHT}px !important`,
            height: isMobile ? PAGE_HEADER_HEIGHT_MOBILE : PAGE_HEADER_HEIGHT,
            px: 1,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: isMobile ? 0.5 : 0,
          }}
        >
          {/* LEFT: App title + pages */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            width: isMobile ? "100%" : "auto",
          }}>
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
              {isMobile ? "Reports" : "Pukal Reports"}
            </Typography>

            <Select
              size="small"
              fullWidth={isMobile}
              value={location.pathname}
              onChange={(e) => navigate(e.target.value)}
              sx={{
                minWidth: isMobile ? "100%" : 180,
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
          {/* CENTER: Company Switch (desktop only) */}
          {!isMobile && (
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
                <Typography variant="body2" sx={{ color: "#fff", fontWeight: 700 }}>
                  {companyName}
                </Typography>
              )}
            </Box>
          )}
          {/* RIGHT: Toggle + Export + Settings + Logout */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              justifyContent: "flex-end",
              width: isMobile ? "100%" : "auto",
            }}
          >
            {toggleMode && onToggleChange && !isMobile && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={toggleMode}
                onChange={(_, val) => val && onToggleChange(val)}
                sx={{
                  height: 26,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                  p: 0.25,

                  "& .MuiToggleButton-root": {
                    fontSize: "0.65rem",
                    px: 1.2,
                    py: 0,
                    border: "none",
                    color: "#444",
                    textTransform: "uppercase",
                  },

                  "& .MuiToggleButton-root.Mui-selected": {
                    backgroundColor: "#1e3a8a",
                    color: "#fff",
                    fontWeight: 700,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  },

                  "& .MuiToggleButton-root.Mui-selected:hover": {
                    backgroundColor: "#1e40af",
                  },
                }}
              >
                <ToggleButton value="Abstract">Abstract</ToggleButton>
                <ToggleButton value="Expanded">Expanded</ToggleButton>
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

                <Menu
                  anchorEl={anchorElExport}
                  open={openExportMenu}
                  onClose={() => setAnchorElExport(null)}
                >
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

            {/* ✅ SETTINGS SLOT (OPTIONAL) */}
            {settingsSlot}

            {isMobile && companies && companies.length > 1 && (
              <IconButton
                size="small"
                onClick={handleCompanyClick}
                sx={{ backgroundColor: "#fff" }}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
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
      <Box sx={{ height: isMobile ? PAGE_HEADER_HEIGHT_MOBILE : PAGE_HEADER_HEIGHT }} />
    </>
  );
};

export default PageHeader;
