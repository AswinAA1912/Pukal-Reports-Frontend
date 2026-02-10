import React, { useState, useEffect, useMemo } from "react";
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
  Button,
  MenuItem,
  TextField,
} from "@mui/material";
import dayjs from "dayjs";
import AppLayout, { useToggleMode } from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import CommonPagination from "../Components/CommonPagination";
import {
  OnlineSalesReportService,
  OnlineSalesReportItemService,
} from "../services/OnlineSalesReport.service";
import { exportToPDF } from "../utils/exportToPDF";
import { exportToExcel } from "../utils/exportToExcel";
import { mapForExport } from "../utils/exportMapper";


const ROWS_PER_PAGE = 25;

const NUMERIC_HEADERS = ["Count", "Amount", "Rate", "Quantity"];

type HeaderFilters = {
  Date: { from: string; to: string };
  Customer: string;
  Invoice: string;
  Product: string;
};

const OnlineSalesReportPage: React.FC = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const { toggleMode, setToggleMode } = useToggleMode();

  const [rawAbstract, setRawAbstract] = useState<any[]>([]);
  const [rawExpanded, setRawExpanded] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [expandedPage, setExpandedPage] = useState(1);

  const [retailers, setRetailers] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);

  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [activeHeader, setActiveHeader] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const [summaryType, setSummaryType] = useState<"sum" | "avg">("sum");

  const [filters, setFilters] = useState<HeaderFilters>({
    Date: { from: today, to: today },
    Customer: "",
    Invoice: "",
    Product: "",
  });

  const ABSTRACT_COLUMNS = [
    { label: "S.No", key: "sno" },
    { label: "Date", key: "Ledger_Date", type: "date" },
    { label: "Invoice", key: "invoice_no" },
    { label: "Customer", key: "Retailer_Name" },
    { label: "Count", key: "Item_Count", type: "number" },
    { label: "Amount", key: "Total_Invoice_value", altKey: "Amount", type: "number" },
  ];

  const EXPANDED_COLUMNS = [
    { label: "S.No", key: "sno" },
    { label: "Date", key: "Ledger_Date", type: "date" },
    { label: "Invoice", key: "invoice_no" },
    { label: "Customer", key: "Retailer_Name" },
    { label: "Product", key: "Product_Name" },
    { label: "Quantity", key: "Bill_Qty", type: "number" },
    { label: "Rate", key: "Rate", type: "number" },
    { label: "Amount", key: "Total_Invoice_value", altKey: "Amount", type: "number" },
  ];

  const handleExportPDF = () => {
    const isAbstract = toggleMode === "Abstract";
    const rows = isAbstract ? filteredAbstract : filteredExpanded;
    const columns = isAbstract ? ABSTRACT_COLUMNS : EXPANDED_COLUMNS;

    const { headers, data } = mapForExport(columns, rows);

    exportToPDF(
      `Online Sales Report (${toggleMode})`,
      headers,
      data
    );
  };

  const handleExportExcel = () => {
    const isAbstract = toggleMode === "Abstract";
    const rows = isAbstract ? filteredAbstract : filteredExpanded;
    const columns = isAbstract ? ABSTRACT_COLUMNS : EXPANDED_COLUMNS;

    const { headers, data } = mapForExport(columns, rows);

    exportToExcel(
      `Online Sales Report (${toggleMode})`,
      headers,
      data
    );
  };

  const formatINR = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };


  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (toggleMode === "Abstract") {
      OnlineSalesReportService.getReports({
        Fromdate: filters.Date.from,
        Todate: filters.Date.to,
      }).then((res) => {
        const rows = res.data.data || [];
        setRawAbstract(rows);
        setRetailers([...new Set(rows.map((r: any) => r.Retailer_Name))]);
        setInvoices([...new Set(rows.map((r: any) => r.invoice_no))]);
      });
    } else {
      OnlineSalesReportItemService.getReportsitem({
        Fromdate: filters.Date.from,
        Todate: filters.Date.to,
      }).then((res) => {
        const rows = res.data.data || [];
        setRawExpanded(rows);
        setRetailers([...new Set(rows.map((r: any) => r.Retailer_Name))]);
        setInvoices([...new Set(rows.map((r: any) => r.invoice_no))]);
        setProducts([...new Set(rows.map((r: any) => r.Product_Name))]);
      });
    }
  }, [toggleMode, filters.Date]);

  /* ================= APPLY FILTERS ================= */
  const filteredAbstract = useMemo(() => {
    return rawAbstract.filter((r) => {
      const rowDate = dayjs(r.Ledger_Date);

      if (
        filters.Date.from &&
        rowDate.isBefore(dayjs(filters.Date.from), "day")
      )
        return false;

      if (
        filters.Date.to &&
        rowDate.isAfter(dayjs(filters.Date.to), "day")
      )
        return false;

      if (filters.Customer && r.Retailer_Name !== filters.Customer) return false;
      if (filters.Invoice && r.invoice_no !== filters.Invoice) return false;

      return true;
    });
  }, [rawAbstract, filters]);


  const filteredExpanded = useMemo(() => {
    return rawExpanded.filter((r) => {
      const rowDate = dayjs(r.Ledger_Date);

      if (
        filters.Date.from &&
        rowDate.isBefore(dayjs(filters.Date.from), "day")
      )
        return false;

      if (
        filters.Date.to &&
        rowDate.isAfter(dayjs(filters.Date.to), "day")
      )
        return false;

      if (filters.Customer && r.Retailer_Name !== filters.Customer) return false;
      if (filters.Invoice && r.invoice_no !== filters.Invoice) return false;
      if (filters.Product && r.Product_Name !== filters.Product) return false;

      return true;
    });
  }, [rawExpanded, filters]);


  /* ================= PAGINATION ================= */
  const paginatedAbstract = filteredAbstract.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  const paginatedExpanded = filteredExpanded.slice(
    (expandedPage - 1) * ROWS_PER_PAGE,
    expandedPage * ROWS_PER_PAGE
  );

  /* ================= SUMMARY ================= */
  const getSummary = (rows: any[], column: string) => {
    if (!summaryType) return 0;
    const values = rows.map((r) => {
      switch (column) {
        case "Count":
          return Number(r.Item_Count || 0);
        case "Amount":
          return Number(
            toggleMode === "Abstract"
              ? r.Total_Invoice_value
              : r.Amount
          ) || 0;
        case "Rate":
          return Number(r.Rate || 0);
        case "Quantity":
          return Number(r.Bill_Qty || 0);
        default:
          return 0;
      }
    });
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
    column: string
  ) => {
    setActiveHeader(column);
    setFilterAnchor(e.currentTarget);
    setSearchText("");
  };

  /* ================= TABLE ================= */
  const renderTable = (
    rows: any[],
    paginated: any[],
    columns: string[],
    pageNo: number,
    isAbstract: boolean
  ) => (
    <Box
      sx={{
        overflow: "hidden",
        maxHeight: "calc(100vh - 100px)",
      }}
    >
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 0,
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
              {columns.map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor:
                      ["Date", "Customer", "Invoice", "Product", ...NUMERIC_HEADERS].includes(
                        h
                      )
                        ? "pointer"
                        : "default",
                  }}
                  onClick={(e) =>
                    ["Date", "Customer", "Invoice", "Product", ...NUMERIC_HEADERS].includes(
                      h
                    )
                      ? handleHeaderClick(e, h)
                      : undefined
                  }
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* ===== FIXED SUMMARY ROW ABOVE BODY ===== */}
          {summaryType && (
            < TableBody >
              <TableRow
                sx={{
                  background: "#f3f4f6",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  position: "sticky",
                  top: 37,
                  zIndex: 1,
                }}
              >
                <TableCell sx={{ fontWeight: 700 }}>
                  {summaryType === "sum" ? "Total" : "Average"}
                </TableCell>
                {columns.slice(1).map((c) => {
                  if (c === "Rate" || c === "Amount") {
                    return (
                      <TableCell key={c} sx={{ fontWeight: 700 }}>
                        {formatINR(getSummary(rows, c))}
                      </TableCell>
                    );
                  } else if (NUMERIC_HEADERS.includes(c)) {
                    return (
                      <TableCell key={c} sx={{ fontWeight: 700 }}>
                        {getSummary(rows, c).toFixed(2)}
                      </TableCell>
                    );
                  } else {
                    return <TableCell key={c} />;
                  }
                })}
              </TableRow>
            </TableBody>

          )}

          {/* ===== TABLE BODY ===== */}
          <TableBody>
            {paginated.map((row, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontSize: "0.75rem" }}>
                  {(pageNo - 1) * ROWS_PER_PAGE + i + 1}
                </TableCell>
                {columns.slice(1).map((c) => {
                  switch (c) {
                    case "Date":
                      return (
                        <TableCell sx={{ fontSize: "0.75rem" }} key={c}>
                          {dayjs(row.Ledger_Date).format("DD/MM/YYYY")}
                        </TableCell>
                      );
                    case "Invoice":
                      return <TableCell sx={{ fontSize: "0.75rem" }} key={c}>{row.invoice_no}</TableCell>;
                    case "Customer":
                      return <TableCell sx={{ fontSize: "0.75rem" }} key={c}>{row.Retailer_Name}</TableCell>;
                    case "Product":
                      return <TableCell sx={{ fontSize: "0.75rem" }} key={c}>{row.Product_Name}</TableCell>;
                    case "Count":
                      return <TableCell sx={{ fontSize: "0.75rem" }} key={c}>{row.Item_Count}</TableCell>;
                    case "Quantity":
                      return <TableCell sx={{ fontSize: "0.75rem" }} key={c}>{row.Bill_Qty}</TableCell>;
                    case "Rate":
                      return <TableCell sx={{ fontSize: "0.75rem" }} key={c}>{formatINR(row.Rate)}</TableCell>;
                    case "Amount":
                      return (
                        <TableCell sx={{ fontSize: "0.75rem" }} key={c}>
                          {formatINR(
                            isAbstract
                              ? row.Total_Invoice_value
                              : row.Amount
                          )}
                        </TableCell>
                      );

                    default:
                      return <TableCell key={c} />;
                  }
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box >
  );

  /* ================= RENDER ================= */
  return (
    <>
      <PageHeader
        pages={[
          // { label: "Sales Invoice", path: "/salesinvoice" },
          { label: "Online Sales Report", path: "/salesreport" },
          { label: "Unit Economics", path: "/uniteconomics" },
        ]}
        toggleMode={toggleMode}
        onToggleChange={setToggleMode}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      />
      <AppLayout fullWidth >

        <Box sx={{ mt: 1 }}>
          {toggleMode === "Abstract" ? (
            <>
              {renderTable(
                filteredAbstract,
                paginatedAbstract,
                ["S.No", "Date", "Invoice", "Customer", "Count", "Amount"],
                page,
                true
              )}
              <CommonPagination
                totalRows={filteredAbstract.length}
                page={page}
                onPageChange={setPage}
              />
            </>
          ) : (
            <>
              {renderTable(
                filteredExpanded,
                paginatedExpanded,
                [
                  "S.No",
                  "Date",
                  "Invoice",
                  "Customer",
                  "Product",
                  "Quantity",
                  "Rate",
                  "Amount",
                ],
                expandedPage,
                false
              )}
            </>
          )}

          {/* ================= FILTER MENU ================= */}
          <Menu
            anchorEl={filterAnchor}
            open={Boolean(filterAnchor)}
            onClose={() => setFilterAnchor(null)}
          >
            {/* ===== DATE FILTER ===== */}
            {activeHeader === "Date" && (
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
                  size="small"
                  variant="contained"
                  onClick={() => setFilterAnchor(null)}
                  sx={{
                    backgroundColor: "#1E3A8A",
                    fontWeight: 600,
                  }}
                >
                  Apply
                </Button>
              </Box>
            )}

            {/* ===== TEXT FILTERS ===== */}
            {activeHeader &&
              ["Customer", "Invoice", "Product"].includes(activeHeader) && (
                <Box p={2} sx={{ minWidth: 220 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={`Search ${activeHeader}`}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    sx={{ mb: 1 }}
                  />

                  {(activeHeader === "Customer"
                    ? retailers
                    : activeHeader === "Invoice"
                      ? invoices
                      : products
                  )
                    .filter((v) =>
                      v.toLowerCase().includes(searchText.toLowerCase())
                    )
                    .map((v) => (
                      <MenuItem
                        key={v}
                        onClick={() => {
                          setFilters((p) => ({ ...p, [activeHeader]: v }));
                          setPage(1);
                          setExpandedPage(1);
                          setFilterAnchor(null);
                        }}
                      >
                        {v}
                      </MenuItem>
                    ))}

                  <MenuItem
                    onClick={() => {
                      setFilters((p) => ({ ...p, [activeHeader]: "" }));
                      setPage(1);
                      setExpandedPage(1);
                      setFilterAnchor(null);
                    }}
                  >
                    All
                  </MenuItem>
                </Box>
              )}

            {/* ===== NUMERIC SUMMARY ===== */}
            {activeHeader && NUMERIC_HEADERS.includes(activeHeader) && (
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
        <CommonPagination
          totalRows={filteredExpanded.length}
          page={expandedPage}
          onPageChange={setExpandedPage}
        />
      </AppLayout>
    </>
  );
};

export default OnlineSalesReportPage;
