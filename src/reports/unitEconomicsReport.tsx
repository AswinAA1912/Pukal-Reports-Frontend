import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  TextField,
  Button,
} from "@mui/material";
import dayjs from "dayjs";
import AppLayout from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import CommonPagination from "../Components/CommonPagination";
import { exportToPDF } from "../utils/exportToPDF";
import { exportToExcel } from "../utils/exportToExcel";
import { mapForExport } from "../utils/exportMapper";
import {
  UnitEconomicsReport,
  UnitEconomicsReportService,
} from "../services/unitEconomicsReport.service";

/* ================= CONSTANTS ================= */
const ROWS_PER_PAGE = 25;

/* ================= STYLES ================= */
const headStyle = {
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.75rem",
  cursor: "pointer",
};

const UnitEconomicsReportPage: React.FC = () => {
  const today = dayjs().format("YYYY-MM-DD");

  const [data, setData] = useState<UnitEconomicsReport[]>([]);
  const [page, setPage] = useState(1);

  /* -------- FILTERS -------- */
  const [filters, setFilters] = useState({
    Date: { from: today, to: today },
    Product: "",
  });

  const [tempDate, setTempDate] = useState(filters.Date);

  /* -------- HEADER FILTER -------- */
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [activeHeader, setActiveHeader] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  /* -------- SUMMARY -------- */
  const [summaryType, setSummaryType] = useState<"sum" | "avg">("sum");

  const EXPORT_COLUMNS = [
    { label: "S.No", key: "sno" },
    { label: "Date", key: "Trans_Date", type: "date" },
    { label: "Product", key: "Product_Name" },
    { label: "Quantity", key: "Bill_Qty", type: "number" },
    { label: "Rate", key: "Rate", type: "number" },
    { label: "Amount", key: "Amount", type: "number" },
    { label: "COGS", key: "COGS", type: "number" },
    { label: "COGS Amount", key: "COGS_Amount", type: "number" },
  ];

  /* ================= LOAD DATA ================= */
  useEffect(() => {
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
      setSummaryType("sum");
    };

    loadData();
  }, [filters.Date, filters.Product]);

  /* ================= PAGINATION ================= */
  const paginatedData = data.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  /* ================= DROPDOWNS ================= */
  const products = useMemo(
    () =>
      [...new Set(data.map((d) => d.Product_Name))].filter(
        (p) => p && p.toLowerCase().includes(searchText.toLowerCase())
      ),
    [data, searchText]
  );

  /* ================= SUMMARY ================= */
  const getSummary = (key: keyof UnitEconomicsReport) => {
    if (!summaryType) return 0;
    const values = data.map((r) => Number(r[key]) || 0);
    const total = values.reduce((a, b) => a + b, 0);
    return summaryType === "sum"
      ? total
      : values.length
        ? total / values.length
        : 0;
  };

  /* ================= HEADER CLICK ================= */
  const openFilter = (
    e: React.MouseEvent<HTMLElement>,
    column: string
  ) => {
    setActiveHeader(column);
    setFilterAnchor(e.currentTarget);
    setSearchText("");
    setSummaryType("sum");
  };

  /* ================= EXPORT ================= */
  const handleExportPDF = () => {
    const { headers, data: exportData } = mapForExport(EXPORT_COLUMNS, data);
    exportToPDF("Unit Economics Report", headers, exportData);
  };

  const handleExportExcel = () => {
    const { headers, data: exportData } = mapForExport(EXPORT_COLUMNS, data);
    exportToExcel("Unit Economics Report", headers, exportData);
  };

  const formatINR = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };


  /* ================= RENDER ================= */
  return (
    <>
      <PageHeader
        pages={[
          // { label: "Sales Invoice", path: "/salesinvoice" },
          { label: "Online Sales Report", path: "/salesreport" },
          { label: "Unit Economics", path: "/uniteconomics" },
        ]}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      />
      <AppLayout fullWidth >
        <Box sx={{ overflow: "auto", mt: 1 }}>
          <TableContainer
            component={Paper}
            sx={{
              position: 'relative',
              maxHeight: "calc(100vh - 100px)",
              overflow: "auto"
            }}
          >
            <Table size="small">
              {/* ===== FIXED HEADER ===== */}
              <TableHead sx={{
                background: "#1E3A8A",
                position: "sticky",
                top: 0,
                zIndex: 2
              }}>
                <TableRow>
                  <TableCell sx={headStyle}>S.No</TableCell>
                  <TableCell sx={headStyle} onClick={(e) => openFilter(e, "Date")}>Date</TableCell>
                  <TableCell sx={headStyle} onClick={(e) => openFilter(e, "Product")}>Product</TableCell>
                  <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "Bill_Qty")}>Quantity</TableCell>
                  <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "Rate")}>Rate</TableCell>
                  <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "Amount")}>Amount</TableCell>
                  <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "COGS")}>COGS</TableCell>
                  <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "COGS_Amount")}>COGS Amount</TableCell>
                </TableRow>
              </TableHead>

              {/* ===== FIXED SUMMARY ROW ABOVE BODY ===== */}
              {summaryType && (
                <TableBody>
                  <TableRow
                    sx={{
                      background: "#f3f4f6",
                      position: "sticky",
                      top: 37,
                      zIndex: 1,
                    }}
                  >
                    <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      {getSummary("Bill_Qty").toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      {formatINR(getSummary("Rate"))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      {formatINR(getSummary("Amount"))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      {getSummary("COGS").toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      {formatINR(getSummary("COGS_Amount"))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}

              {/* ===== BODY ===== */}
              <TableBody>
                {paginatedData.map((row, i) => (
                  <TableRow key={`${row.Product_Id}-${i}`}>
                    <TableCell sx={{ fontSize: "0.75rem" }}>
                      {(page - 1) * ROWS_PER_PAGE + i + 1}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>
                      {dayjs(row.Trans_Date).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>{row.Product_Name}</TableCell>
                    <TableCell align="right">{Number(row.Bill_Qty).toFixed(2)}</TableCell>
                    <TableCell align="right">{formatINR(Number(row.Rate))}</TableCell>
                    <TableCell align="right">{formatINR(Number(row.Amount))}</TableCell>
                    <TableCell align="right">{Number(row.COGS).toFixed(2)}</TableCell>
                    <TableCell align="right">{formatINR(Number(row.COGS_Amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ===== FILTER MENU (SAME PATTERN AS REFERENCE) ===== */}
          <Menu
            anchorEl={filterAnchor}
            open={Boolean(filterAnchor)}
            onClose={() => setFilterAnchor(null)}
          >
            {activeHeader === "Product" && (
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
                    }}
                  >
                    {p}
                  </MenuItem>
                ))}
                <MenuItem
                  onClick={() => {
                    setFilters((f) => ({ ...f, Product: "" }));
                    setFilterAnchor(null);
                  }}
                >
                  All
                </MenuItem>
              </Box>
            )}

            {activeHeader === "Date" && (
              <Box p={2} display="flex" flexDirection="column" gap={1}>
                <TextField
                  type="date"
                  value={tempDate.from}
                  onChange={(e) =>
                    setTempDate((p) => ({ ...p, from: e.target.value }))
                  }
                />
                <TextField
                  type="date"
                  value={tempDate.to}
                  onChange={(e) =>
                    setTempDate((p) => ({ ...p, to: e.target.value }))
                  }
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    setFilters((p) => ({ ...p, Date: tempDate }));
                    setFilterAnchor(null);
                  }}
                  sx={{
                    backgroundColor: "#1E3A8A",
                    fontWeight: 600,
                  }}
                >
                  Apply
                </Button>
              </Box>
            )}

            {["Bill_Qty", "Rate", "Amount", "COGS", "COGS_Amount"].includes(activeHeader || "") && (
              <>
                <MenuItem onClick={() => { setSummaryType("sum"); setFilterAnchor(null); }}>
                  Sum
                </MenuItem>
                <MenuItem onClick={() => { setSummaryType("avg"); setFilterAnchor(null); }}>
                  Avg
                </MenuItem>
              </>
            )}
          </Menu>
        </Box>
        <CommonPagination
          totalRows={data.length}
          page={page}
          onPageChange={setPage}
        />
      </AppLayout>
    </>
  );
};

export default UnitEconomicsReportPage;
