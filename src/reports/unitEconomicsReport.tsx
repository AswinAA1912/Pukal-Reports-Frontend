import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableFooter,
  Paper,
  Menu,
  MenuItem,
  TextField,
  Button,
} from "@mui/material";
import dayjs from "dayjs";
import AppLayout from "../Layout/appLayout";
import CommonPagination from "../Components/CommonPagination";
import ReportTableHeader, {
  ReportColumn,
} from "../Components/ReportTableHeader";
import {
  UnitEconomicsReport,
  UnitEconomicsReportService,
} from "../services/unitEconomicsReport.service";

/* ================= CONSTANTS ================= */
const ROWS_PER_PAGE = 25;

/* ================= COLUMNS ================= */
const columns: ReportColumn[] = [
  { label: "S.No", key: "sno" },
  { label: "Date", key: "Trans_Date", filterType: "date" },
  { label: "Product", key: "Product_Name", filterType: "text" },
  { label: "Quantity", key: "Bill_Qty", align: "right", filterType: "numeric" },
  { label: "Rate", key: "Rate", align: "right", filterType: "numeric" },
  { label: "Amount", key: "Amount", align: "right", filterType: "numeric" },
  { label: "COGS", key: "COGS", align: "right", filterType: "numeric" },
  {
    label: "COGS Amount",
    key: "COGS_Amount",
    align: "right",
    filterType: "numeric",
  },
];

/* ================= COMPONENT ================= */
const UnitEconomicsReportPage: React.FC = () => {
  const today = dayjs().format("YYYY-MM-DD");

  const [data, setData] = useState<UnitEconomicsReport[]>([]);
  const [page, setPage] = useState(1);

  /* -------- Filters -------- */
  const [filters, setFilters] = useState({
    Date: { from: today, to: today },
    Product: "",
  });

  /* -------- Header Filter -------- */
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [activeColumn, setActiveColumn] = useState<ReportColumn | null>(null);

  /* -------- Menu Search -------- */
  const [searchText, setSearchText] = useState("");

  /* -------- Summary -------- */
  const [summaryType, setSummaryType] = useState<"sum" | "avg" | null>(null);

  /* ================= LOAD DATA ================= */
  const loadData = async () => {
    const res = await UnitEconomicsReportService.getReports({
      Fromdate: filters.Date.from,
      Todate: filters.Date.to,
    });

    let rows = res.data.data || [];

    if (filters.Product) {
      rows = rows.filter((r) => r.Product_Name === filters.Product);
    }

    setData(rows);
    setPage(1);
    setSummaryType(null);
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  /* ================= PAGINATION ================= */
  const paginatedData = data.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  /* ================= DROPDOWN VALUES ================= */
  const products = useMemo(
    () =>
      [...new Set(data.map((d) => d.Product_Name))].filter((p) =>
        p.toLowerCase().includes(searchText.toLowerCase())
      ),
    [data, searchText]
  );

  /* ================= NUMERIC COLUMNS ================= */
  const numericColumns = columns.filter(
    (c) => c.filterType === "numeric"
  );

  /* ================= SUMMARY CALCULATION ================= */
  const getSummaryValue = (key: string) => {
    const values = data.map((r) => Number((r as any)[key]) || 0);
    const total = values.reduce((a, b) => a + b, 0);

    return summaryType === "sum"
      ? total
      : values.length
      ? total / values.length
      : 0;
  };

  /* ================= HEADER CLICK ================= */
  const handleHeaderClick = (
    e: React.MouseEvent<HTMLElement>,
    column: ReportColumn
  ) => {
    setActiveColumn(column);
    setFilterAnchor(e.currentTarget);
    setSearchText("");
  };

  /* ================= RENDER ================= */
  return (
    <AppLayout showHeader={false} fullWidth>
      <Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <ReportTableHeader
              columns={columns}
              onHeaderClick={handleHeaderClick}
            />

            <TableBody>
              {paginatedData.map((row, i) => (
                <TableRow key={`${row.Product_Id}-${i}`}>
                  <TableCell sx={{ fontSize: "0.75rem" }}>
                    {(page - 1) * ROWS_PER_PAGE + i + 1}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem" }}>
                    {dayjs(row.Trans_Date).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.75rem" }}>
                    {row.Product_Name}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                    {row.Bill_Qty}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                    {Number(row.Rate).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                    {Number(row.Amount).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                    {Number(row.COGS).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                    {Number(row.COGS_Amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            {/* ✅ SUMMARY FOR ALL NUMERIC COLUMNS */}
            {summaryType && (
              <TableFooter>
                <TableRow sx={{ background: "#f3f4f6" }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 600 }}>
                    {summaryType === "sum" ? "Total" : "Average"}
                  </TableCell>

                  {numericColumns.map((col) => (
                    <TableCell
                      key={col.key}
                      align="right"
                      sx={{ fontWeight: 600 }}
                    >
                      {getSummaryValue(col.key).toFixed(2)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </TableContainer>

        <CommonPagination
          totalRows={data.length}
          page={page}
          onPageChange={setPage}
        />

        {/* ================= FILTER MENU ================= */}
        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={() => setFilterAnchor(null)}
        >
          {/* DATE */}
          {activeColumn?.filterType === "date" && (
            <Box p={2} display="flex" flexDirection="column" gap={1}>
              <TextField
                type="date"
                value={filters.Date.from}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    Date: { ...p.Date, from: e.target.value },
                  }))
                }
              />
              <TextField
                type="date"
                value={filters.Date.to}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    Date: { ...p.Date, to: e.target.value },
                  }))
                }
              />
              <Button
                variant="contained"
                onClick={() => setFilterAnchor(null)}
                sx={{ backgroundColor: "#1E3A8A", fontWeight: 600 }}
              >
                Apply
              </Button>
            </Box>
          )}

          {/* PRODUCT */}
          {activeColumn?.key === "Product_Name" && (
            <Box p={2} sx={{ minWidth: 220 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search Product"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{ mb: 1 }}
              />

              {products.map((p) => (
                <MenuItem
                  key={p}
                  onClick={() => {
                    setFilters((f) => ({ ...f, Product: p }));
                    setFilterAnchor(null);
                    setSearchText("");
                  }}
                >
                  {p}
                </MenuItem>
              ))}

              <MenuItem
                onClick={() => {
                  setFilters((f) => ({ ...f, Product: "" }));
                  setFilterAnchor(null);
                  setSearchText("");
                }}
              >
                All
              </MenuItem>
            </Box>
          )}

          {/* SUMMARY */}
          {activeColumn?.filterType === "numeric" && (
            <>
              <MenuItem
                onClick={() => {
                  setSummaryType("sum");
                  setFilterAnchor(null);
                }}
              >
                Sum
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSummaryType("avg");
                  setFilterAnchor(null);
                }}
              >
                Avg
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>
    </AppLayout>
  );
};

export default UnitEconomicsReportPage;
