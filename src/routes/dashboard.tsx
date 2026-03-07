import React from "react";
import {
  Box,
  Typography,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../Layout/Header";

const HEADER_HEIGHT = 64;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuList = [
    // { label: "Sales Invoice", path: "/salesinvoice" },
    { label: "Online Sales Report", path: "/salesreport" },
    { label: "Unit Economics", path: "/uniteconomics" },
    { label: "Stock in Hand", path: "/stockinhand" },
    { label: "Sales Report LOL", path: "/salesreportLOL" },
    { label: "Sales Analytics Report", path: "/salesreportlr" },
    { label: "Ledger Wise Item", path: "/reports/ledger-item" },
    
    
  ];

  return (
    <>
      {/* ===== HEADER ===== */}
      <Header headerColor="#1E3A8A" showSearch={false} />

      {/* ===== DASHBOARD BODY (FULL FIXED LAYER) ===== */}
      <Box
        sx={{
          display: "flex",
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          width: "100%",
          overflow: "hidden",
          backgroundColor: "#cfe6ec",
        }}
      >
        {/* ===== LEFT PANEL ===== */}
        <Box
          sx={{
            width: 360,
            px: 5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: 32,
              fontWeight: 400,
              mb: 1,
            }}
          >
            Welcome {user?.Name || "admin"},
          </Typography>

          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              fontFamily: "serif",
            }}
          >
            {user?.Company_Name || "PUKAL FOODS PVT LTD"}
          </Typography>
        </Box>

        {/* ===== CENTER DIVIDER ===== */}
        <Divider orientation="vertical" flexItem />

        {/* ===== RIGHT MENU ===== */}
        <Box
          sx={{
            flex: 1,
            px: 6,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography fontSize={22} fontWeight={700} mb={2}>
            MENU
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 2,
            }}
          >
            {menuList.map((item) => (
              <Box
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  cursor: "pointer",
                  p: 2,
                  borderRadius: 2,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                    background: "#b1c6da",
                  },
                }}
              >
                <Typography fontSize={16} fontWeight={600}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default Dashboard;
