import React from "react";
import { Box, Pagination, Typography } from "@mui/material";

interface CommonPaginationProps {
  totalRows: number;
  page: number;
  rowsPerPage?: number;
  onPageChange: (page: number) => void;
}

const CommonPagination: React.FC<CommonPaginationProps> = ({
  totalRows,
  page,
  rowsPerPage = 20,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  if (totalPages <= 1) return null;

  return (
    <Box
      mt={2}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,          
          color: "#01050a",         
          letterSpacing: 0.2,
        }}
      >
        Showing {(page - 1) * rowsPerPage + 1}–
        {Math.min(page * rowsPerPage, totalRows)} of {totalRows}
      </Typography>

      <Pagination
        count={totalPages}
        page={page}
        onChange={(_, value) => onPageChange(value)}
        shape="rounded"
        sx={{
          "& .MuiPaginationItem-root": {
            color: "#0D47A1",
            borderColor: "#0D47A1",
          },
          "& .Mui-selected": {
            backgroundColor: "#0D47A1",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#08306B",
            },
          },
          "& .MuiPaginationItem-root:hover": {
            backgroundColor: "#E3F2FD",
          },
        }}
      />
    </Box>
  );
};

export default CommonPagination;
