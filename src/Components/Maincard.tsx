import React from "react";
import { Box, CircularProgress, Typography, Paper ,SxProps, Theme } from "@mui/material";
import { styled } from "@mui/material/styles";

interface MaincardProps {
  children: React.ReactNode;
  loading: boolean;
  fullHeight?: boolean;
  title?: string;
   sx?: SxProps<Theme>;
}

const Maincard: React.ComponentType<MaincardProps> = ({ children, loading, fullHeight = false }) => {
  return (
    <CardContainer fullHeight={fullHeight} elevation={2}>
      
      {loading ? (
        <LoadingOverlay>
          <CircularProgress size={48} />
          <Typography variant="body1" sx={{ mt: 2, color: "text.secondary" }}>
            Loading...
          </Typography>
        </LoadingOverlay>
      ) : (
        <CardContentStyled>{children}</CardContentStyled>
      )}
    </CardContainer>
  );
};

export default Maincard;

/* Styled Components */
interface CardContainerProps {
  fullHeight: boolean;
}

const CardContainer = styled(Paper, { shouldForwardProp: (prop) => prop !== "fullHeight" })<CardContainerProps>(
  ({ theme, fullHeight }) => ({
    display: "flex",
    flexDirection: "column",
    height: fullHeight ? "89vh" : "auto", // responsive height
    minHeight: fullHeight ? "400px" : "auto",
    borderRadius: `${Number(theme.shape.borderRadius) * 2}px`, // Fixed: Ensure it's treated as a number
    overflow: "hidden",
    backgroundColor: "#e5d8c5", // Changed from theme.palette.background.paper to your desired color
  })
);


// eslint-disable-next-line no-empty-pattern
const LoadingOverlay = styled(Box)(({ }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "300px",
  backgroundColor: "#e5d8c5", // Changed from theme.palette.background.default to your desired color
}));

const CardContentStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  padding: theme.spacing(3),
  backgroundColor: "#c5dce5", // Added backgroundColor to ensure content area also has the color
}));