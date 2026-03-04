import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Menu,
    TextField,
    MenuItem,
    Typography,
    Tooltip,
    Button,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import dayjs from "dayjs";
import SettingsIcon from "@mui/icons-material/Settings";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import AppLayout, { useToggleMode } from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import ReportFilterDrawer from "../Components/ReportFilterDrawer";
import CommonPagination from "../Components/CommonPagination";
import { DndContext, closestCenter, } from "@dnd-kit/core";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
    SortableContext, useSortable,
    verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { SalesReportLedgerService, SalesReportItemService, } from "../services/SalesReport.service";

/* ================= CONSTANTS ================= */

const ROWS_PER_PAGE = 25;

const ABSTRACT_DEFAULT_KEYS = [
    "Y1",
    "M6",
    "M2",
    "LM",
    "Ledger_Name",
    "Total_Qty",
    "Q_Pay_Days",
    "Freq_Days",
];

const EXPANDED_DEFAULT_KEYS = [
    "Y1",
    "M6",
    "M2",
    "LM",
    "Item_Name",
    "Total_Qty",
];

const NUMERIC_KEYS = [
    "Y1",
    "M6",
    "M2",
    "LM",
    "M3",
    "M9",
    "Total_Qty",
    "Q_Pay_Days",
    "Freq_Days",
];

/* ================= TYPES ================= */

type ColumnConfig = {
    key: string;
    label: string;
    enabled: boolean;
    isNumeric?: boolean;
    order: number;
};

type FiltersMap = {
    Date: { from: string; to: string };
    columnFilters: Record<string, string[]>;
};

/* ================= HELPERS ================= */

const buildColumnsFromApi = (
    rows: any[],
    mode: "Abstract" | "Expanded"
): ColumnConfig[] => {
    if (!rows.length) return [];

    const defaults =
        mode === "Abstract"
            ? ABSTRACT_DEFAULT_KEYS
            : EXPANDED_DEFAULT_KEYS;

    return Object.keys(rows[0]).map((key, index) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        enabled: defaults.includes(key),
        isNumeric: NUMERIC_KEYS.includes(key),
        order: index,
    }));
};

/* ================= COMPONENT ================= */

const SalesReport: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");
    const { toggleMode, setToggleMode } = useToggleMode();

    /* ===== DATA ===== */
    const [abstractRows, setAbstractRows] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<any[]>([]);
    const rawRows =
        toggleMode === "Expanded" ? expandedRows : abstractRows;

    /* ===== COLUMNS ===== */
    const [abstractColumns, setAbstractColumns] = useState<ColumnConfig[]>([]);
    const [expandedColumns, setExpandedColumns] = useState<ColumnConfig[]>([]);
    const columns =
        toggleMode === "Expanded"
            ? expandedColumns
            : abstractColumns;
    const setColumns =
        toggleMode === "Expanded"
            ? setExpandedColumns
            : setAbstractColumns;

    /* ===== UI STATE ===== */
    const [page, setPage] = useState(1);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [settingsAnchor, setSettingsAnchor] =
        useState<null | HTMLElement>(null);
    const [filterAnchor, setFilterAnchor] =
        useState<null | HTMLElement>(null);
    const [activeHeader, setActiveHeader] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");

    /* ===== FILTERS ===== */
    const [filters, setFilters] = useState<FiltersMap>({
        Date: { from: today, to: today },
        columnFilters: {},
    });
    /* ===== GROUPING STATE ===== */
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [abstractGrouping, setAbstractGrouping] = useState<string[]>([]);
    const [expandedGrouping, setExpandedGrouping] = useState<string[]>([]);

    const [abstractPendingGrouping, setAbstractPendingGrouping] = useState<string[]>([]);
    const [expandedPendingGrouping, setExpandedPendingGrouping] = useState<string[]>([]);

    const [abstractExpandedKeys, setAbstractExpandedKeys] = useState<string[]>([]);
    const [expandedExpandedKeys, setExpandedExpandedKeys] = useState<string[]>([]);

    const HEADER_HEIGHT = 36;

    /* ================= LOAD DATA ================= */

    useEffect(() => {
        const service =
            toggleMode === "Expanded"
                ? SalesReportItemService.getReports
                : SalesReportLedgerService.getReports;

        service({
            Fromdate: filters.Date.from,
            Todate: filters.Date.to,
        }).then(res => {
            const apiRows = res.data.data || [];
            const cols = buildColumnsFromApi(apiRows, toggleMode);

            if (toggleMode === "Expanded") {
                setExpandedRows(apiRows);
                setExpandedColumns(prev => (prev.length ? prev : cols));
            } else {
                setAbstractRows(apiRows);
                setAbstractColumns(prev => (prev.length ? prev : cols));
            }

            setPage(1);
        });
    }, [toggleMode, filters.Date.from, filters.Date.to]);

    const appliedGroupBy =
        toggleMode === "Expanded"
            ? expandedGrouping
            : abstractGrouping;

    const setAppliedGroupBy =
        toggleMode === "Expanded"
            ? setExpandedGrouping
            : setAbstractGrouping;

    const pendingGroupBy =
        toggleMode === "Expanded"
            ? expandedPendingGrouping
            : abstractPendingGrouping;

    const setPendingGroupBy =
        toggleMode === "Expanded"
            ? setExpandedPendingGrouping
            : setAbstractPendingGrouping;

    const expandedKeys =
        toggleMode === "Expanded"
            ? expandedExpandedKeys
            : abstractExpandedKeys;

    const setExpandedKeys =
        toggleMode === "Expanded"
            ? setExpandedExpandedKeys
            : setAbstractExpandedKeys;

    /* ================= FILTERING ================= */

    const filteredRows = useMemo(() => {
        return rawRows.filter(row => {
            for (const [key, values] of Object.entries(filters.columnFilters)) {
                if (!values.length) continue;
                if (!values.includes(String(row[key] ?? ""))) return false;
            }
            return true;
        });
    }, [rawRows, filters]);

    /* ================= TOTALS ================= */

    const getTotal = (key: string) => {
        const total = filteredRows.reduce(
            (sum, row) => sum + Number(row[key] || 0),
            0
        );

        return total.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    /* ================= PAGINATION ================= */

    const buildGroupedData = React.useCallback(
        (data: any[], level: number, parentKey = ""): any[] => {
            const groupKey = appliedGroupBy[level];
            if (!groupKey) return data;

            const map = new Map<string, any[]>();

            for (const row of data) {
                const val = String(row[groupKey] ?? "Others");
                if (!map.has(val)) map.set(val, []);
                map.get(val)!.push(row);
            }

            return Array.from(map.entries()).map(([value, rows]) => ({
                __group: true,
                __key: `${parentKey}${groupKey}:${value}`,
                __value: value,
                __level: level,
                __rows: rows,
            }));
        },
        [appliedGroupBy]
    );

    // 2️⃣ GROUP WHOLE DATA
    const groupedRows = useMemo(() => {
        if (!appliedGroupBy.length) return filteredRows;
        return buildGroupedData(filteredRows, 0);
    }, [filteredRows, appliedGroupBy, buildGroupedData]);

    const flattenRows = (rows: any[]): any[] => {
        const result: any[] = [];

        const walk = (list: any[]) => {
            for (const r of list) {
                result.push(r);
                if (r.__group && expandedKeys.includes(r.__key)) {
                    walk(
                        buildGroupedData(
                            r.__rows,
                            r.__level + 1,
                            `${r.__key} > `
                        )
                    );
                }
            }
        };

        walk(rows);
        return result;
    };

    const finalRows = useMemo(() => {
        const rows = appliedGroupBy.length
            ? flattenRows(groupedRows)
            : filteredRows;

        return rows.slice(
            (page - 1) * ROWS_PER_PAGE,
            page * ROWS_PER_PAGE
        );
    }, [groupedRows, filteredRows, page, appliedGroupBy, expandedKeys]);

    const enabledColumns = useMemo(
        () =>
            [...columns]
                .filter(c => c.enabled)
                .sort((a, b) => a.order - b.order),
        [columns]
    );

    /* ================= EXPORTS ================= */

    const buildExportRows = (): any[] => {
        const result: any[] = [];

        const walk = (list: any[]) => {
            for (const r of list) {
                // GROUP HEADER ROW
                if (r.__group) {
                    const row: any = {};
                    enabledColumns.forEach(c => {
                        if (c.key === appliedGroupBy[r.__level]) {
                            row[c.label] = r.__value;
                        } else if (c.isNumeric) {
                            row[c.label] = getGroupTotal(r.__rows, c.key);
                        } else {
                            row[c.label] = "";
                        }
                    });

                    result.push(row);

                    // CHILD ROWS
                    walk(
                        buildGroupedData(
                            r.__rows,
                            r.__level + 1,
                            `${r.__key} > `
                        )
                    );
                }
                // NORMAL ROW
                else {
                    const row: any = {};
                    enabledColumns.forEach(c => {
                        row[c.label] = r[c.key] ?? "";
                    });
                    result.push(row);
                }
            }
        };

        if (appliedGroupBy.length) {
            walk(groupedRows);
        } else {
            filteredRows.forEach(r => {
                const row: any = {};
                enabledColumns.forEach(c => {
                    row[c.label] = r[c.key] ?? "";
                });
                result.push(row);
            });
        }

        return result;
    };

    const handleExportExcel = () => {
        const rows = buildExportRows();

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            toggleMode === "Expanded" ? "Expanded Report" : "Abstract Report"
        );

        XLSX.writeFile(
            workbook,
            `Sales_Report_${toggleMode}_${dayjs().format("DDMMYYYY")}.xlsx`
        );
    };

    const handleExportPDF = () => {
        const doc = new jsPDF("l", "mm", "a4");

        doc.text(
            `Sales Report (${toggleMode})`,
            14,
            10
        );

        const rows = buildExportRows();

        autoTable(doc, {
            startY: 15,
            head: [enabledColumns.map(c => c.label)],
            body: rows.map(r => Object.values(r)),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [30, 58, 138] },
        });

        doc.save(
            `Sales_Report_${toggleMode}_${dayjs().format("DDMMYYYY")}.pdf`
        );
    };

    /* ================= FILTER MENU ================= */

    const filterOptions = useMemo(() => {
        if (!activeHeader) return [];
        return Array.from(
            new Set(
                rawRows
                    .map(r => r[activeHeader])
                    .filter(v => v !== null && v !== undefined && v !== "")
                    .map(v => String(v))
            )
        );
    }, [activeHeader, rawRows]);

    const groupableColumns = useMemo(() => {
        return enabledColumns.map(c => ({
            key: c.key,
            label: c.label,
        }));
    }, [enabledColumns]);

    const serialRef = React.useRef(0);

    const getGroupTotal = (
        rows: any[],
        key: string
    ) => {
        const total = rows.reduce(
            (sum, r) => sum + Number(r[key] || 0),
            0
        );

        return total
            ? total.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
            : "0.00";
    };

    const renderRows = (rows: any[], level = 0) =>
        rows.map((row: any, rowIndex: number) => {
            if (row.__group) {
                const expanded = expandedKeys.includes(row.__key);
                const groupKey = appliedGroupBy[level];

                return (
                    <React.Fragment key={row.__key}>
                        {/* ===== GROUP HEADER ===== */}
                        <TableRow sx={{ background: "#E2E8F0" }}>
                            <TableCell>
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        setExpandedKeys(p =>
                                            p.includes(row.__key)
                                                ? p.filter(x => x !== row.__key)
                                                : [...p, row.__key]
                                        )
                                    }
                                >
                                    {expanded ? (
                                        <ExpandMoreIcon fontSize="small" />
                                    ) : (
                                        <ChevronRightIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </TableCell>

                            {enabledColumns.map(c => {
                                // GROUP COLUMN → show label
                                if (c.key === groupKey) {
                                    return (
                                        <TableCell key={c.key} sx={{ fontWeight: 700 }}>
                                            {row.__value}
                                        </TableCell>
                                    );
                                }
                                // NUMERIC COLUMNS → show group totals
                                if (c.isNumeric) {
                                    return (
                                        <TableCell key={c.key} sx={{ fontWeight: 600 }}>
                                            {getGroupTotal(row.__rows, c.key)}
                                        </TableCell>
                                    );
                                }
                                // OTHER COLUMNS → empty
                                return <TableCell key={c.key} />;
                            })}
                        </TableRow>

                        {/* ===== CHILD ROWS ===== */}
                        {expanded &&
                            renderRows(
                                buildGroupedData(
                                    row.__rows,
                                    row.__level + 1,
                                    `${row.__key} > `
                                ),
                                row.__level + 1
                            )}
                    </React.Fragment>
                );
            }

            return (
                <TableRow key={row.Id ?? rowIndex}>
                    <TableCell>
                        {++serialRef.current}
                    </TableCell>

                    {enabledColumns.map(c => (
                        <TableCell key={c.key}>
                            {row[c.key]}
                        </TableCell>
                    ))}
                </TableRow>
            );
        });

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
                    size="small"
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
    /* ================= RENDER ================= */

    return (
        <>
            <PageHeader
                pages={[
                    { label: "Online Sales Report", path: "/salesreport" },
                    { label: "Unit Economics", path: "/uniteconomics" },
                    { label: "Stock in Hand", path: "/stockinhand" },
                    { label: "Online Sales Report LOL", path: "/salesreportLOL" },
                    { label: "Sales Analytics Report", path: "/salesreportlr" }
                ]}
                toggleMode={toggleMode}
                onToggleChange={setToggleMode}
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                settingsSlot={
                    <Box display="flex" gap={1}>
                        {/* GROUP BY ICON */}
                        <Tooltip title="Group By">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setPendingGroupBy(appliedGroupBy);
                                    setGroupDialogOpen(true);
                                }}
                                sx={{
                                    height: 24,
                                    width: 24,
                                    backgroundColor: "#fff",
                                    borderRadius: 0.5,
                                }}
                            >
                                <GroupWorkIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        {/* COLUMN SETTINGS */}
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
                fromDate={filters.Date.from}
                toDate={filters.Date.to}
                onFromDateChange={v =>
                    setFilters(p => ({ ...p, Date: { ...p.Date, from: v } }))
                }
                onToDateChange={v =>
                    setFilters(p => ({ ...p, Date: { ...p.Date, to: v } }))
                }
                onApply={() => setDrawerOpen(false)}
            />

            <AppLayout fullWidth>
                <Box sx={{ overflow: "auto", mt: 1 }}>
                    <TableContainer
                        component={Paper}
                        sx={{
                            maxHeight: "calc(100vh - 100px)",
                            "& th, & td": { fontSize: "0.75rem" },
                        }}
                    >
                        <Table size="small">
                            <TableHead
                                sx={{
                                    background: "#1E3A8A",
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 3,
                                    height: HEADER_HEIGHT,
                                }}
                            >
                                <TableRow>
                                    <TableCell sx={{ color: "#fff" }}>S.No</TableCell>

                                    {enabledColumns.map(c => (
                                        <TableCell
                                            key={c.key}
                                            sx={{
                                                color: "#fff",
                                                cursor: "pointer",
                                                backgroundColor: appliedGroupBy.includes(c.key)
                                                    ? "#1E40AF"
                                                    : "inherit",
                                                fontWeight: appliedGroupBy.includes(c.key) ? 700 : 500,
                                            }}
                                            onClick={e => {
                                                setActiveHeader(c.key);
                                                setFilterAnchor(e.currentTarget);
                                            }}
                                        >
                                            {c.label}
                                        </TableCell>
                                    ))}
                                </TableRow>

                                {/* ===== TOTAL ROW ===== */}
                                <TableRow sx={{ background: "#f3f4f6" }}>
                                    <TableCell>Total</TableCell>
                                    {enabledColumns.map(c => (
                                        <TableCell key={c.key}>
                                            {c.isNumeric ? getTotal(c.key) : ""}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {(() => {
                                    serialRef.current = appliedGroupBy.length
                                        ? 0
                                        : (page - 1) * ROWS_PER_PAGE;
                                    return renderRows(finalRows);
                                })()}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <CommonPagination
                        totalRows={filteredRows.length}
                        page={page}
                        onPageChange={setPage}
                    />
                </Box>
            </AppLayout>

            {/* ===== FILTER MENU ===== */}
            {activeHeader && (
                <Menu
                    anchorEl={filterAnchor}
                    open={Boolean(filterAnchor)}
                    onClose={() => setFilterAnchor(null)}
                >
                    <Box p={2} minWidth={240}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder={`Search ${activeHeader}`}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />

                        <MenuItem
                            onClick={() => {
                                setFilters(p => {
                                    const copy = { ...p.columnFilters };
                                    delete copy[activeHeader];
                                    return { ...p, columnFilters: copy };
                                });
                                setFilterAnchor(null);
                            }}
                        >
                            All
                        </MenuItem>

                        {filterOptions
                            .filter(v =>
                                v
                                    .toLowerCase()
                                    .includes(searchText.toLowerCase())
                            )
                            .map(v => {
                                const selected =
                                    filters.columnFilters[activeHeader]?.includes(
                                        v
                                    ) ?? false;

                                return (
                                    <MenuItem
                                        key={v}
                                        selected={selected}
                                        onClick={() =>
                                            setFilters(p => {
                                                const existing =
                                                    p.columnFilters[activeHeader] ?? [];
                                                return {
                                                    ...p,
                                                    columnFilters: {
                                                        ...p.columnFilters,
                                                        [activeHeader]: selected
                                                            ? existing.filter(x => x !== v)
                                                            : [...existing, v],
                                                    },
                                                };
                                            })
                                        }
                                    >
                                        {v}
                                    </MenuItem>
                                );
                            })}
                    </Box>
                </Menu>
            )}

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
                                    showFilter={!!filters.columnFilters[col.key]?.length}
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
                                size="small"
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

            {/* ===== GROUPING ===== */}
            <Dialog
                open={groupDialogOpen}
                onClose={() => setGroupDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Group By Columns</DialogTitle>

                <DialogContent>
                    {[0, 1, 2].map(level => (
                        <TextField
                            key={level}
                            select
                            fullWidth
                            margin="dense"
                            label={`Level ${level + 1}`}
                            value={pendingGroupBy[level] || ""}
                            onChange={e => {
                                const copy = [...pendingGroupBy];
                                copy[level] = e.target.value;
                                setPendingGroupBy(copy);
                            }}
                        >
                            <MenuItem value="">
                                No Grouping (Level {level + 1})
                            </MenuItem>

                            {groupableColumns.map(col => (
                                <MenuItem
                                    key={col.key}
                                    value={col.key}
                                    disabled={pendingGroupBy.includes(col.key)}
                                >
                                    {col.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    ))}
                </DialogContent>

                <DialogActions>
                    <Button color="warning" onClick={() => setGroupDialogOpen(false)}>
                        Close
                    </Button>

                    <Button
                        variant="contained"
                        color="info"
                        onClick={() => {
                            setAppliedGroupBy(pendingGroupBy.filter(Boolean));
                            setExpandedKeys([]);
                            setGroupDialogOpen(false);
                        }}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SalesReport;