import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Paper,
  Menu,
  MenuItem,
  TextField,
  Button,
} from "@mui/material";
import dayjs from "dayjs";
import CommonPagination from "../Components/CommonPagination";
import {
  SalesInvoiceReport,
  SalesInvoiceReportService,
} from "../services/salesinvoicereports.service";
import AppLayout from "../Layout/appLayout";

/* ================= CONSTANTS ================= */
const ROWS_PER_PAGE = 25;

/* ================= STYLES ================= */
const headStyle = {
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.75rem",
  cursor: "pointer",
};

const SalesInvoiceReportPage: React.FC = () => {
  const today = dayjs().format("YYYY-MM-DD");

  const [data, setData] = useState<SalesInvoiceReport[]>([]);
  const [page, setPage] = useState(1);

  /* -------- Filters -------- */
  const [filters, setFilters] = useState({
    Date: { from: today, to: today },
    Invoice: "",
    Customer: "",
    Voucher: "",
  });

  const [tempDate, setTempDate] = useState(filters.Date);

  /* -------- Header Filter -------- */
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [activeHeader, setActiveHeader] = useState<string | null>(null);

  /* -------- Search (ONLY FOR DROPDOWN) -------- */
  const [searchText, setSearchText] = useState("");

  /* -------- Summary -------- */
  const [summaryType, setSummaryType] = useState<"sum" | "avg" | null>(null);

  /* ================= LOAD DATA ================= */
  const loadData = async () => {
    const res = await SalesInvoiceReportService.getReports({
      Fromdate: filters.Date.from,
      Todate: filters.Date.to,
    });

    let rows = res.data.data || [];

    if (filters.Invoice)
      rows = rows.filter((r) => r.Do_Inv_No === filters.Invoice);

    if (filters.Customer)
      rows = rows.filter((r) => r.Retailer_Name === filters.Customer);

    if (filters.Voucher)
      rows = rows.filter((r) => r.VoucherTypeGet === filters.Voucher);

    setData(rows);
    setPage(1);
    setSummaryType(null);
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  /* ================= DROPDOWN VALUES (LIKE UNIT ECONOMICS) ================= */
  const invoices = useMemo(
    () =>
      [...new Set(data.map((d) => d.Do_Inv_No))].filter((v) =>
        v?.toLowerCase().includes(searchText.toLowerCase())
      ),
    [data, searchText]
  );

  const customers = useMemo(
    () =>
      [...new Set(data.map((d) => d.Retailer_Name))].filter((v) =>
        v?.toLowerCase().includes(searchText.toLowerCase())
      ),
    [data, searchText]
  );

  const vouchers = useMemo(
    () =>
      [...new Set(data.map((d) => d.VoucherTypeGet))].filter((v) =>
        v?.toLowerCase().includes(searchText.toLowerCase())
      ),
    [data, searchText]
  );

  /* ================= PAGINATION ================= */
  const paginatedData = data.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  /* ================= SUMMARY ================= */
  const getSummary = (field: keyof SalesInvoiceReport) => {
    if (!summaryType) return 0;

    const values = data.map((r) => Number(r[field]) || 0);
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
    setSummaryType(null);
    setSearchText(""); // IMPORTANT (same as UnitEconomics)
  };

  /* ================= RENDER ================= */
  return (
    <AppLayout showHeader={false} fullWidth>
      <Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ background: "#1E3A8A" }}>
              <TableRow>
                <TableCell sx={headStyle}>S.No</TableCell>
                <TableCell sx={headStyle} onClick={(e) => openFilter(e, "Date")}>
                  Date
                </TableCell>
                <TableCell sx={headStyle} onClick={(e) => openFilter(e, "Invoice")}>
                  Invoice
                </TableCell>
                <TableCell sx={headStyle} onClick={(e) => openFilter(e, "Customer")}>
                  Customer
                </TableCell>
                <TableCell sx={headStyle} onClick={(e) => openFilter(e, "Voucher")}>
                  Voucher
                </TableCell>
                <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "BeforeTax")}>
                  Before Tax
                </TableCell>
                <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "Tax")}>
                  Tax
                </TableCell>
                <TableCell align="right" sx={headStyle} onClick={(e) => openFilter(e, "InvoiceAmount")}>
                  Invoice Amount
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedData.map((row, i) => (
                <TableRow key={row.Do_Id}>
                  <TableCell>{(page - 1) * ROWS_PER_PAGE + i + 1}</TableCell>
                  <TableCell>{dayjs(row.Created_on).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>{row.Do_Inv_No}</TableCell>
                  <TableCell>{row.Retailer_Name}</TableCell>
                  <TableCell>{row.VoucherTypeGet}</TableCell>
                  <TableCell align="right">{Number(row.Total_Before_Tax).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(row.Total_Tax).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(row.Total_Invoice_value).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>

            {summaryType && (
              <TableFooter>
                <TableRow sx={{ background: "#f3f4f6" }}>
                  <TableCell colSpan={5} sx={{ fontWeight: 600 }}>
                    {summaryType === "sum" ? "Total" : "Average"}
                  </TableCell>
                  <TableCell align="right">{getSummary("Total_Before_Tax").toFixed(2)}</TableCell>
                  <TableCell align="right">{getSummary("Total_Tax").toFixed(2)}</TableCell>
                  <TableCell align="right">{getSummary("Total_Invoice_value").toFixed(2)}</TableCell>
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
          {/* SEARCH (ONLY DROPDOWN FILTER) */}
          {["Invoice", "Customer", "Voucher"].includes(activeHeader || "") && (
            <Box p={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Box>
          )}

          {/* DATE */}
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
              >
                Apply
              </Button>
            </Box>
          )}

          {(activeHeader === "Invoice"
            ? invoices
            : activeHeader === "Customer"
            ? customers
            : activeHeader === "Voucher"
            ? vouchers
            : []
          ).map((v) => (
            <MenuItem
              key={v}
              onClick={() => {
                setFilters((p) => ({ ...p, [activeHeader!]: v }));
                setSearchText("");
                setFilterAnchor(null);
              }}
            >
              {v}
            </MenuItem>
          ))}

          {["Invoice", "Customer", "Voucher"].includes(activeHeader || "") && (
            <MenuItem
              onClick={() => {
                setFilters((p) => ({ ...p, [activeHeader!]: "" }));
                setSearchText("");
                setFilterAnchor(null);
              }}
            >
              All
            </MenuItem>
          )}

          {["BeforeTax", "Tax", "InvoiceAmount"].includes(activeHeader || "") && (
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
    </AppLayout>
  );
};

export default SalesInvoiceReportPage;
