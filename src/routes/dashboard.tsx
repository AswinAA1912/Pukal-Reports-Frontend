import React from "react";
import {
  Box,
  Typography,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../Layout/Header";
import { useQuery } from "@tanstack/react-query";
import { MenuService } from "../services/menus.service";

const HEADER_HEIGHT = 64;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: menuList = [], isLoading } = useQuery({
    queryKey: ["dashboard-menus"],
    queryFn: async () => {
      const res = await MenuService.getMenus();

      return res.data.data
        .filter((menu: any) => menu.menu_type === 1 && menu.is_active === 3)
        .flatMap((menu: any) =>
          (menu.SubMenu || []).filter((sub: any) => sub.is_active === 3)
        )
        .sort((a: any, b: any) => a.display_order - b.display_order);
    },
  });

  return (
    <>
      <Header headerColor="#1E3A8A" showSearch={false} />

      <Box
        sx={{
          display: "flex",
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          width: "100%",
          overflow: "hidden",
          backgroundColor: "#cfe6ec",
        }}
      >
        {/* LEFT PANEL */}
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

        <Divider orientation="vertical" flexItem />

        {/* RIGHT MENU */}
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

          {isLoading ? (
            <Box textAlign="center">
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 2,
              }}
            >
              {menuList.map((item: any) => (
                <Box
                  key={item.id}
                  onClick={() => navigate(item.rUrl)}
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
                    {item.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

export default Dashboard;