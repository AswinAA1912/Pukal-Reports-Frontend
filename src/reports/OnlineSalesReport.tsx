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
  Tooltip,
  IconButton,
  Typography,
  Switch,

} from "@mui/material";
import dayjs from "dayjs";
import SettingsIcon from "@mui/icons-material/Settings";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ReportFilterDrawer from "../Components/ReportFilterDrawer";
import AppLayout, { useToggleMode } from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import CommonPagination from "../Components/CommonPagination";
import {
  OnlineSalesReportService,
  OnlineSalesReportItemService,
} from "../services/OnlineSalesReport.service";
import { DndContext, closestCenter, } from "@dnd-kit/core";
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { exportToPDF } from "../utils/exportToPDF";
import { exportToExcel } from "../utils/exportToExcel";

type ColumnConfig = {
  key: string;
  label: string;
  enabled: boolean;
  order: number;
  type?: "date" | "number" | "text";
};

const OnlineSalesReportPage: React.FC = () => {
  const { toggleMode, setToggleMode } = useToggleMode();

  const [rawAbstract, setRawAbstract] = useState<any[]>([]);
  const [rawExpanded, setRawExpanded] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [expandedPage, setExpandedPage] = useState(1);

  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [activeHeader, setActiveHeader] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [settingsAnchor, setSettingsAnchor] =
    useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});

  const ABSTRACT_INITIAL_COLUMNS: ColumnConfig[] = [
    { key: "sno", label: "S.No", enabled: true, order: 0 },
    { key: "Ledger_Date", label: "Date", enabled: true, order: 1, type: "date" },
    { key: "invoice_no", label: "Invoice", enabled: true, order: 2 },
    { key: "Retailer_Name", label: "Customer", enabled: true, order: 3 },
    { key: "Item_Count", label: "Count", enabled: true, order: 4, type: "number" },
    { key: "Total_Invoice_value", label: "Amount", enabled: true, order: 5, type: "number" },
  ];

  const EXPANDED_INITIAL_COLUMNS: ColumnConfig[] = [
    { key: "sno", label: "S.No", enabled: true, order: 0 },
    { key: "Ledger_Date", label: "Date", enabled: true, order: 1, type: "date" },
    { key: "invoice_no", label: "Invoice", enabled: true, order: 2 },
    { key: "Retailer_Name", label: "Customer", enabled: true, order: 3 },
    { key: "Product_Name", label: "Product", enabled: true, order: 4 },
    { key: "Bill_Qty", label: "Quantity", enabled: true, order: 5, type: "number" },
    { key: "Rate", label: "Rate", enabled: true, order: 6, type: "number" },
    { key: "Total_Invoice_value", label: "Amount", enabled: true, order: 7, type: "number" },
  ];

  const [abstractColumns, setAbstractColumns] = useState<ColumnConfig[]>(ABSTRACT_INITIAL_COLUMNS);
  const [expandedColumns, setExpandedColumns] = useState<ColumnConfig[]>(EXPANDED_INITIAL_COLUMNS);

  const columns =
    toggleMode === "Abstract"
      ? abstractColumns
      : expandedColumns;

  const activeCol = columns.find(c => c.key === activeHeader);

  const setColumns =
    toggleMode === "Abstract"
      ? setAbstractColumns
      : setExpandedColumns;

  const enabledColumns = useMemo(
    () =>
      columns
        .filter(c => c.enabled)
        .sort((a, b) => a.order - b.order),
    [columns]
  );

  const handleExportPDF = () => {
    const rows =
      toggleMode === "Abstract"
        ? filteredAbstract
        : filteredExpanded;

    const headers = enabledColumns.map(c => c.label);

    const data = rows.map(row =>
      enabledColumns.map(c => {
        switch (c.key) {
          case "Ledger_Date":
            return dayjs(row.Ledger_Date).format("DD/MM/YYYY");
          case "Total_Invoice_value":
            return toggleMode === "Abstract"
              ? row.Total_Invoice_value
              : row.Amount;
          default:
            return row[c.key] ?? "";
        }
      })
    );

    exportToPDF(
      `Online Sales Report (${toggleMode})`,
      headers,
      data
    );
  };

  const handleExportExcel = () => {
    const rows =
      toggleMode === "Abstract"
        ? filteredAbstract
        : filteredExpanded;

    const headers = enabledColumns.map(c => c.label);

    const data = rows.map(row =>
      enabledColumns.map(c => {
        switch (c.key) {
          case "Ledger_Date":
            return dayjs(row.Ledger_Date).format("DD/MM/YYYY");
          case "Total_Invoice_value":
            return toggleMode === "Abstract"
              ? row.Total_Invoice_value
              : row.Amount;
          default:
            return row[c.key] ?? "";
        }
      })
    );

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
    const dateFilter = columnFilters["Ledger_Date"] || {};

    const fromDate = dateFilter.from || dayjs().format("YYYY-MM-DD");
    const toDate = dateFilter.to || dayjs().format("YYYY-MM-DD");

    if (toggleMode === "Abstract") {
      OnlineSalesReportService.getReports({
        Fromdate: fromDate,
        Todate: toDate,
      }).then((res) => {
        const rows = res.data.data || [];
        setRawAbstract(rows);

        setAbstractColumns(
          generateColumns(rows, ABSTRACT_INITIAL_COLUMNS)
        );
      });
    } else {
      OnlineSalesReportItemService.getReportsitem({
        Fromdate: fromDate,
        Todate: toDate,
      }).then((res) => {
        const rows = res.data.data || [];
        setRawExpanded(rows);

        setExpandedColumns(
          generateColumns(rows, EXPANDED_INITIAL_COLUMNS)
        );
      });
    }
  }, [toggleMode]);

  /* ================= APPLY FILTERS ================= */

  const applyFilters = (rows: any[]) => {
    return rows.filter((row) => {
      return Object.entries(columnFilters).every(([key, value]) => {

        if (value === "" || value === null || value === undefined) return true;

        // ✅ DATE RANGE
        if (key === "Ledger_Date" && typeof value === "object") {
          const rowDate = dayjs(row[key]);

          if (value.from && rowDate.isBefore(dayjs(value.from), "day")) return false;
          if (value.to && rowDate.isAfter(dayjs(value.to), "day")) return false;

          return true;
        }

        // ✅ GENERIC TEXT / NUMBER MATCH
        return String(row[key] ?? "")
          .toLowerCase()
          .includes(String(value).toLowerCase());
      });
    });
  };

  const filteredAbstract = useMemo(
    () => applyFilters(rawAbstract),
    [rawAbstract, columnFilters]
  );

  const filteredExpanded = useMemo(
    () => applyFilters(rawExpanded),
    [rawExpanded, columnFilters]
  );


  /* ================= PAGINATION ================= */
  const paginatedAbstract = filteredAbstract.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const paginatedExpanded = filteredExpanded.slice(
    (expandedPage - 1) * rowsPerPage,
    expandedPage * rowsPerPage
  );

  /* ================= SUMMARY ================= */
  const getTotal = (rows: any[], key: string) => {
    return rows.reduce((sum, r) => {
      switch (key) {
        case "Item_Count":
          return sum + Number(r.Item_Count || 0);

        case "Total_Invoice_value":
          return sum + Number(
            toggleMode === "Abstract"
              ? r.Total_Invoice_value
              : r.Amount
          );

        case "Rate":
          return sum + Number(r.Rate || 0);

        case "Bill_Qty":
          return sum + Number(r.Bill_Qty || 0);

        default:
          return sum;
      }
    }, 0);
  };


  /* ================= HEADER CLICK ================= */
  const handleHeaderClick = (
    e: React.MouseEvent<HTMLElement>,
    columnKey: string
  ) => {
    setActiveHeader(columnKey);
    setSearchText("");
    setFilterAnchor(e.currentTarget);
  };

  /* ================= TABLE ================= */
  const renderTable = (
    rows: any[],
    paginated: any[],
    pageNo: number
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
          <TableHead
            sx={{
              background: "#1E3A8A",
              position: "sticky",
              top: 0,
              zIndex: 2
            }}
          >
            <TableRow>
              {enabledColumns.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={(e) => handleHeaderClick(e, col.key)}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* ===== FIXED SUMMARY ROW ABOVE BODY ===== */}
          <TableBody>

            {/* ===== TOTAL ROW (ALWAYS VISIBLE) ===== */}
            <TableRow
              sx={{
                background: "#f3f4f6",
                fontWeight: 700,
                position: "sticky",
                top: 37,
                zIndex: 2,
              }}
            >
              <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>

              {enabledColumns.slice(1).map(col => {
                if (col.type === "number") {
                  const value = getTotal(rows, col.key);
                  return (
                    <TableCell key={col.key}>
                      {col.label === "Amount" || col.label === "Rate"
                        ? formatINR(value)
                        : value.toFixed(2)}
                    </TableCell>
                  );
                }
                return <TableCell key={col.key} />;
              })}
            </TableRow>
          </TableBody>


          {/* ===== TABLE BODY ===== */}
          <TableBody>
            {paginated.map((row, i) => (
              <TableRow key={i}>
                {enabledColumns.map((col) => {
                  switch (col.key) {

                    case "sno":
                      return (
                        <TableCell key={col.key}>
                          {(pageNo - 1) * rowsPerPage + i + 1}
                        </TableCell>
                      );

                    case "Ledger_Date":
                      return (
                        <TableCell key={col.key}>
                          {dayjs(row.Ledger_Date).format("DD/MM/YYYY")}
                        </TableCell>
                      );

                    case "invoice_no":
                      return <TableCell key={col.key}>{row.invoice_no}</TableCell>;

                    case "Retailer_Name":
                      return <TableCell key={col.key}>{row.Retailer_Name}</TableCell>;

                    case "Product_Name":
                      return <TableCell key={col.key}>{row.Product_Name}</TableCell>;

                    case "Item_Count":
                      return <TableCell key={col.key}>{row.Item_Count}</TableCell>;

                    case "Bill_Qty":
                      return <TableCell key={col.key}>{row.Bill_Qty}</TableCell>;

                    case "Rate":
                      return <TableCell key={col.key}>{formatINR(row.Rate)}</TableCell>;

                    case "Total_Invoice_value":
                      return (
                        <TableCell key={col.key}>
                          {formatINR(
                            toggleMode === "Abstract"
                              ? row.Total_Invoice_value
                              : row.Amount
                          )}
                        </TableCell>
                      );

                    default:
                      return <TableCell key={col.key}>{row[col.key]}</TableCell>;
                  }
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box >
  );


  const SortableColumnItem: React.FC<{
    column: ColumnConfig;
    showFilter: boolean;
    onToggle: (key: string) => void;
  }> = ({ column, showFilter, onToggle }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: column.key });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <Box
        ref={setNodeRef}
        style={style}
        display="flex"
        alignItems="center"
        gap={1}
        mb={1}
      >
        {/* DRAG HANDLE */}
        <IconButton
          size="small"
          {...listeners}
          {...attributes}
          sx={{ cursor: "grab" }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>

        {/* LABEL + FILTER ICON */}
        <Box display="flex" alignItems="center" gap={1} sx={{ flex: 1 }}>
          <Typography fontSize="0.75rem">
            {column.label}
          </Typography>

          {showFilter && (
            <Tooltip title="Header filter enabled">
              <FilterAltIcon fontSize="small" color="action" />
            </Tooltip>
          )}
        </Box>

        {/* ENABLE / DISABLE SWITCH */}
        <Switch
          size="medium"
          checked={column.enabled}
          onChange={() => onToggle(column.key)}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: "#1E3A8A",
            },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: "#b5b9c4",
            },
            "& .MuiSwitch-track": {
              backgroundColor: "#CBD5E1",
            },
          }}
        />
      </Box>
    );
  };

  const generateColumns = (
    data: any[],
    baseColumns: ColumnConfig[]
  ): ColumnConfig[] => {
    if (!data.length) return baseColumns;

    const existingKeys = baseColumns.map(c => c.key);

    const dynamicCols: ColumnConfig[] = Object.keys(data[0])
      .filter(key => !existingKeys.includes(key))
      .map((key, index) => ({
        key,
        label: key
          .replace(/_/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase()),
        enabled: false,
        order: baseColumns.length + index,
      }));

    return [...baseColumns, ...dynamicCols];
  };

  /* ================= RENDER ================= */
  return (
    <>
      <PageHeader
        toggleMode={toggleMode}
        onToggleChange={setToggleMode}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        settingsSlot={
          <Box display="flex" gap={1}>
            <Tooltip title="Column Settings">
              <IconButton
                size="small"
                onClick={e => setSettingsAnchor(e.currentTarget)}
                sx={{
                  height: 24,
                  width: 24,
                  backgroundColor: "#fff",
                  borderRadius: 0.5,
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      <ReportFilterDrawer
        open={drawerOpen}
        onToggle={() => setDrawerOpen(p => !p)}
        onClose={() => setDrawerOpen(false)}
        fromDate={columnFilters["Ledger_Date"]?.from || ""}
        toDate={columnFilters["Ledger_Date"]?.to || ""}
        onFromDateChange={(v) =>
          setColumnFilters((prev) => ({
            ...prev,
            Ledger_Date: {
              ...prev["Ledger_Date"],
              from: v,
            },
          }))
        }

        onToDateChange={(v) =>
          setColumnFilters((prev) => ({
            ...prev,
            Ledger_Date: {
              ...prev["Ledger_Date"],
              to: v,
            },
          }))
        }
        onApply={() => setDrawerOpen(false)}
      />
      <AppLayout fullWidth >

        <Box sx={{ mt: 1 }}>
          {toggleMode === "Abstract" ? (
            <>
              {renderTable(
                filteredAbstract,
                paginatedAbstract,
                page
              )}
              <CommonPagination
                totalRows={filteredAbstract.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          ) : (
            <>
              {renderTable(
                filteredExpanded,
                paginatedExpanded,
                expandedPage
              )}
              {toggleMode == "Expanded" && (
                <CommonPagination
                  totalRows={filteredExpanded.length}
                  page={expandedPage}
                  rowsPerPage={rowsPerPage}
                  onPageChange={setExpandedPage}
                  onRowsPerPageChange={setRowsPerPage}
                />
              )}
            </>
          )}

          {/* ================= FILTER MENU ================= */}
          <Menu
            anchorEl={filterAnchor}
            open={
              Boolean(filterAnchor) &&
              Boolean(activeHeader) &&
              activeCol?.type !== "number"
            }
            onClose={() => setFilterAnchor(null)}
          >

            {/* ===== DATE FILTER ===== */}
            {activeHeader && (
              <Box p={2} sx={{ minWidth: 220 }}>

                {/* ✅ DATE FILTER */}
                {activeHeader === "Ledger_Date" ? (
                  <>
                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      sx={{ mb: 1 }}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          [activeHeader]: {
                            ...prev[activeHeader],
                            from: e.target.value,
                          },
                        }))
                      }
                    />

                    <TextField
                      type="date"
                      size="small"
                      fullWidth
                      sx={{ mb: 1 }}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          [activeHeader]: {
                            ...prev[activeHeader],
                            to: e.target.value,
                          },
                        }))
                      }
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setFilterAnchor(null)}
                    >
                      Apply
                    </Button>
                  </>
                ) : (
                  <>
                    {/* ✅ SEARCH */}
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Search"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      sx={{ mb: 1 }}
                    />

                    {/* ✅ CLEAR FILTER */}
                    <MenuItem
                      sx={{ fontWeight: 600 }}
                      onClick={() => {
                        setColumnFilters((prev) => ({
                          ...prev,
                          [activeHeader]: "",
                        }));
                        setFilterAnchor(null);
                      }}
                    >
                      All
                    </MenuItem>

                    {/* ✅ VALUES */}
                    {[...new Set(
                      (toggleMode === "Abstract"
                        ? rawAbstract
                        : rawExpanded
                      ).map((r) => r[activeHeader])
                    )]
                      .filter(Boolean)
                      .filter((v) =>
                        String(v).toLowerCase().includes(searchText.toLowerCase())
                      )
                      .map((v) => (
                        <MenuItem
                          key={v}
                          onClick={() => {
                            setColumnFilters((prev) => ({
                              ...prev,
                              [activeHeader]: v,
                            }));
                            setFilterAnchor(null);
                          }}
                        >
                          {v}
                        </MenuItem>
                      ))}
                  </>
                )}
              </Box>
            )}

          </Menu>
        </Box>
      </AppLayout>

      {/* ===== COLUMN SETTINGS MENU ===== */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        PaperProps={{
          sx: {
            width: 280,
            maxHeight: 420,
          },
        }}
      >
        <Box px={2} py={1}>
          <Typography fontWeight={600} fontSize={13}>
            Enabled Columns
          </Typography>
        </Box>

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;

            setColumns(prev => {
              const enabledCols = prev
                .filter(c => c.enabled)
                .sort((a, b) => a.order - b.order);

              const oldIndex = enabledCols.findIndex(c => c.key === active.id);
              const newIndex = enabledCols.findIndex(c => c.key === over.id);

              const reordered = arrayMove(enabledCols, oldIndex, newIndex);

              return prev.map(col => {
                const idx = reordered.findIndex(r => r.key === col.key);
                return idx !== -1 ? { ...col, order: idx } : col;
              });
            });
          }}
        >
          <SortableContext
            items={columns.filter(c => c.enabled).map(c => c.key)}
            strategy={verticalListSortingStrategy}
          >
            {columns
              .filter(c => c.enabled)
              .sort((a, b) => a.order - b.order)
              .map(col => (
                <SortableColumnItem
                  column={col}
                  showFilter={
                    col.key === "Ledger_Date"
                      ? !!columnFilters[col.key]?.from || !!columnFilters[col.key]?.to
                      : !!columnFilters[col.key]
                  }
                  onToggle={() =>
                    setColumns(prev =>
                      prev.map(c =>
                        c.key === col.key
                          ? { ...c, enabled: false }
                          : c
                      )
                    )
                  }
                />
              ))}
          </SortableContext>
        </DndContext>

        <Box px={2} py={1} mt={1}>
          <Typography fontWeight={600} fontSize={13}>
            Disabled Columns
          </Typography>
        </Box>

        {columns
          .filter(c => !c.enabled)
          .sort((a, b) => a.order - b.order)
          .map(col => (
            <Box
              key={col.key}
              display="flex"
              alignItems="center"
              gap={1}
              px={1}
              py={0.5}
              mb={1}
            >
              {/* LABEL */}
              <Box sx={{ flex: 1 }}>
                <Typography fontSize="0.75rem">
                  {col.label}
                </Typography>
              </Box>

              {/* ENABLE SWITCH */}
              <Switch
                size="medium"
                checked={false}
                onChange={() =>
                  setColumns(prev =>
                    prev.map(c =>
                      c.key === col.key
                        ? { ...c, enabled: true }
                        : c
                    )
                  )
                }
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#1E3A8A",
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#b5b9c4",
                  },
                  "& .MuiSwitch-track": {
                    backgroundColor: "#CBD5E1",
                  },
                }}
              />
            </Box>
          ))}
      </Menu>
    </>
  );
};

export default OnlineSalesReportPage;
