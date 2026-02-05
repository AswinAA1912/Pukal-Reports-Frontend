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

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuList = [
    { label: "Sales Invoice", path: "/salesinvoice" },
    { label: "Sales Report", path: "/salesreport"},
    { label: "Unit Economics", path: "/uniteconomics" },
  ];

  return (
    <Box sx={{ display: "flex", height: "100%", width: "100%" }}>
      {/* ===== LEFT : WELCOME ===== */}
      <Box
        sx={{
          width: 320,
          p: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
            fontFamily: `"Montserrat", sans-serif`,
            letterSpacing: 1,
            mb: 1,
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          Welcome {user?.Name || "User"},
        </Typography>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontFamily: `"Roboto Slab", serif`,
            textTransform: "uppercase",
            letterSpacing: 2,
            textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {user?.Company_Name || "Company"}
        </Typography>
      </Box>

      {/* ===== CENTER SPLIT BAR ===== */}
      <Divider orientation="vertical" flexItem />

      {/* ===== RIGHT : MENU ===== */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Menu
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <List>
          {menuList.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 1,
                "&:hover": {
                  backgroundColor: "#e3f2fd",
                },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default Dashboard;
