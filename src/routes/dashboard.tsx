import React from "react";
import {
  Box,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
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
    { label: "Sales Report", path: "/salesreport" },
    { label: "Unit Economics", path: "/uniteconomics" },
    { label: "Stock in Hand", path: "/stockinhand"},
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
            px: 5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography fontSize={20} fontWeight={600} mb={1}>
            Menu
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <List disablePadding>
            {menuList.map((item) => (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  width: "fit-content",
                  px: 2,
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>
    </>
  );
};

export default Dashboard;
