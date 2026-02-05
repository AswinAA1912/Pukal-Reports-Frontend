import React from "react";
import { TableHead, TableRow, TableCell } from "@mui/material";

/* ================= TYPES ================= */

export type ReportColumn = {
  label: string;              // What user sees
  key: string;                // Actual data key
  align?: "left" | "right";
  filterType?: "date" | "text" | "numeric";
};

interface ReportTableHeaderProps {
  columns: ReportColumn[];
  onHeaderClick: (
    e: React.MouseEvent<HTMLElement>,
    column: ReportColumn
  ) => void;
}

/* ================= STYLES ================= */

const headStyle = {
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.75rem",
  cursor: "pointer",
  userSelect: "none",
};

/* ================= COMPONENT ================= */

const ReportTableHeader: React.FC<ReportTableHeaderProps> = ({
  columns,
  onHeaderClick,
}) => {
  return (
    <TableHead sx={{ background: "#1E3A8A" }}>
      <TableRow>
        {columns.map((col) => (
          <TableCell
            key={col.key}
            align={col.align || "left"}
            sx={{
              ...headStyle,
              cursor: col.filterType ? "pointer" : "default",
            }}
            onClick={
              col.filterType
                ? (e) => onHeaderClick(e, col)
                : undefined
            }
          >
            {col.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

export default ReportTableHeader;
