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
    Button,
    IconButton,
    Menu,
    Switch,
    Typography,
    TextField,
    MenuItem,
    Tooltip,
    Dialog,
    DialogActions,
    DialogTitle,
    DialogContent,
    Checkbox,
    CircularProgress
} from "@mui/material";
import dayjs from "dayjs";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AppLayout from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import { SettingsService } from "../services/reportSettings.services";
import ReportFilterDrawer from "../Components/ReportFilterDrawer";
import CommonPagination from "../Components/CommonPagination";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import {
    staffBasedReportService
} from "../services/staffBasedReport.services";

/* ================= TYPES ================= */

type ColumnConfig = {
    key: string;
    label: string;
    enabled: boolean;
    isNumeric?: boolean;
    order: number;
    groupBy?: number;
};

/* ================= CONSTANTS ================= */

const NUMERIC_KEYS = [
    "Item_Count",
    "Total_Invoice_value",
    "Rate",
    "Bill_Qty",
    "Amount",
];

const DEFAULT_KEYS = [
    "Journal_no",
    "Stock_Journal_date",
    "Stock_Journal_Voucher_type",
    "Product_Name",
    "Godown_Name",
];

type SortableColumnRowProps = {
    column: ColumnConfig;
    onToggle: (key: string) => void;
    hasActiveFilter?: boolean;
};

const SortableColumnRow = ({ column, onToggle, hasActiveFilter, }: SortableColumnRowProps) => {
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

            {/* LABEL */}
            <Box display="flex" alignItems="center" gap={1} sx={{ flex: 1 }}>
                <Typography fontSize="0.75rem">
                    {column.label}
                </Typography>

                {hasActiveFilter && (
                    <Tooltip title="Header filter enabled">
                        <FilterAltIcon fontSize="small" color="action" />
                    </Tooltip>
                )}
            </Box>

            {/* ENABLE / DISABLE */}
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

const CURRENCY_KEYS = ["Total_Invoice_value", "Amt", "Rate"];

/* ================= HELPERS ================= */

const buildColumnsFromApi = (
    rows: any[]
): ColumnConfig[] => {
    if (!rows.length) return [];

    return Object.keys(rows[0]).map((key, index) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),

        // ✅ Only DEFAULT_KEYS enabled initially
        enabled: DEFAULT_KEYS.includes(key),

        isNumeric: NUMERIC_KEYS.includes(key),

        // ✅ Enabled first, Disabled later
        order: DEFAULT_KEYS.includes(key)
            ? DEFAULT_KEYS.indexOf(key)
            : DEFAULT_KEYS.length + index,
    }));
};

const formatINR = (value: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(value);

/* ================= COMPONENT ================= */

const StaffBasedReport: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");

    const [rows, setRows] = useState<any[]>([]);
    const rawRows = rows;

    const [columns, setColumns] = useState<ColumnConfig[]>([]);

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    const [settingsAnchor, setSettingsAnchor] =
        useState<null | HTMLElement>(null);
    const [filterAnchor, setFilterAnchor] =
        useState<null | HTMLElement>(null);
    const [activeHeader, setActiveHeader] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    type FiltersMap = {
        Date: { from: string; to: string };
        columnFilters: Record<string, string[]>;
    };

    const [filters, setFilters] = useState<FiltersMap>({
        Date: { from: today, to: today },
        columnFilters: {},
    });
    const [abstractDateKey, setAbstractDateKey] = useState<string | null>(null);
    type SortOrder = "asc" | "desc";

    const [sortConfig, setSortConfig] = useState<{
        key: string | null;
        order: SortOrder;
    }>({
        key: null,
        order: "asc",
    });

    const currentDateKey = `${filters.Date.from}_${filters.Date.to}`;
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [abstractGrouping, setAbstractGrouping] = useState<string[]>([]);
    const [abstractPendingGrouping, setAbstractPendingGrouping] = useState<string[]>([]);
    const [abstractExpandedKeys, setAbstractExpandedKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const serialRef = React.useRef(0);

    const [templateConfig, setTemplateConfig] = useState<{
        abstract: ColumnConfig[];
        expanded: ColumnConfig[];
    } | null>(null);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [isEditTemplate, setIsEditTemplate] = useState(false);
    const [reportName, setReportName] = useState("");
    const [parentReportName, setParentReportName] = useState("");
    const grouping = abstractGrouping;
    const [spConfig, setSpConfig] = useState({
        abstractSP: "",
        expandedSP: ""
    });
    const SP_MAP = {
        Abstract: "Reporting_Online_Stock_Journal_Item_VW",
    };
    const HEADER_HEIGHT = 36;
    const setGrouping = setAbstractGrouping;
    const pendingGrouping = abstractPendingGrouping;
    const setPendingGrouping = setAbstractPendingGrouping;
    const expandedKeys = abstractExpandedKeys;
    const setExpandedKeys = setAbstractExpandedKeys;
    /* ================= LOAD DATA ================= */

    useEffect(() => {
        const isTemplateApplied = templateConfig?.abstract;
        const isResetState = rows.length === 0;

        if (!isTemplateApplied && !isResetState) {
            if (rows.length > 0 && abstractDateKey === currentDateKey) {
                return;
            }
        }

        const loadData = async () => {
            try {
                setLoading(true);

                const service =
                    staffBasedReportService.getStaffBasedReport;

                const res = await service({
                    Fromdate: filters.Date.from,
                    Todate: filters.Date.to,
                });

                const apiRows = res.data.data || [];
                let cols = buildColumnsFromApi(apiRows);

                // If template applied first time
                if (templateConfig?.abstract) {
                    cols = applyTemplateToColumns(cols, templateConfig.abstract);
                }

                // 🔥 Preserve current user settings when columns already exist
                if (columns.length > 0) {
                    cols = cols.map(newCol => {
                        const oldCol = columns.find(c => c.key === newCol.key);

                        if (oldCol) {
                            return {
                                ...newCol,
                                enabled: oldCol.enabled,
                                order: oldCol.order,
                                groupBy: oldCol.groupBy || 0
                            };
                        }

                        return newCol;
                    });

                    // sort by old order
                    cols.sort((a, b) => a.order - b.order);
                }

                setRows(apiRows);
                setAbstractDateKey(currentDateKey);
                setColumns(cols);
                setPage(1);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false); // ✅ Stop loading
            }
        };

        loadData();

    }, [
        filters.Date.from,
        filters.Date.to,
        templateConfig
    ]);

    useEffect(() => {
        setSpConfig({
            abstractSP: SP_MAP.Abstract,
            expandedSP: ""
        });
    }, []);

    const handleResetSettings = () => {
        const todayDate = dayjs().format("YYYY-MM-DD");

        // Clear template
        setTemplateConfig(null);

        // Reset filters
        setFromDate(todayDate);
        setToDate(todayDate);

        setFilters({
            Date: { from: todayDate, to: todayDate },
            columnFilters: {},
        });

        // Reset grouping
        setAbstractGrouping([]);
        setAbstractPendingGrouping([]);
        setAbstractExpandedKeys([]);

        // Reset sort
        setSortConfig({
            key: null,
            order: "asc",
        });

        // ✅ Reset columns to default enabled columns
        setColumns((prev) =>
            prev.map((col, index) => ({
                ...col,
                enabled: DEFAULT_KEYS.includes(col.key),
                groupBy: 0,
                order: DEFAULT_KEYS.includes(col.key)
                    ? DEFAULT_KEYS.indexOf(col.key)
                    : DEFAULT_KEYS.length + index,
            }))
                .sort((a, b) => a.order - b.order)
        );

        // Keep rows, no need to clear data
        setAbstractDateKey(currentDateKey);

        // Reset pagination
        setPage(1);

        // Close menus
        setSettingsAnchor(null);
        setFilterAnchor(null);
    };

    /* ================= FILTERING ================= */

    /* ================= FILTERING ================= */

    const filteredRows = useMemo(() => {
        const filtered = rawRows.filter(row => {
            const rowDate = dayjs(row.Stock_Journal_date);

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

            for (const [key, values] of Object.entries(filters.columnFilters)) {
                if (!values || values.length === 0) continue;

                const rowValue = String(row[key] ?? "")
                    .trim()
                    .toLowerCase();

                const match = values.some(
                    v =>
                        String(v)
                            .trim()
                            .toLowerCase() === rowValue
                );

                if (!match) return false;
            }

            return true;
        });

        /* ✅ FIX: Always latest date to oldest date when date filter applied */
        return filtered.sort((a, b) => {
            return (
                dayjs(b.Stock_Journal_date).valueOf() -
                dayjs(a.Stock_Journal_date).valueOf()
            );
        });
    }, [rawRows, filters]);

    const sortedRows = useMemo(() => {
        if (!sortConfig.key) return filteredRows;

        return [...filteredRows].sort((a, b) => {
            const aVal = a[sortConfig.key!];
            const bVal = b[sortConfig.key!];

            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // Date handling
            if (sortConfig.key === "Stock_Journal_date") {
                return sortConfig.order === "asc"
                    ? dayjs(aVal).valueOf() - dayjs(bVal).valueOf()
                    : dayjs(bVal).valueOf() - dayjs(aVal).valueOf();
            }

            // Numeric
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortConfig.order === "asc"
                    ? aVal - bVal
                    : bVal - aVal;
            }

            // String
            return sortConfig.order === "asc"
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
    }, [filteredRows, sortConfig]);

    /* ================= GROUPING ================= */

    const buildGroupedData = React.useCallback(
        (data: any[], level: number, parentKey = ""): any[] => {
            const groupKey = grouping[level];
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
        [grouping]
    );

    const groupedRows = useMemo(() => {
        if (!grouping.length) return sortedRows;
        return buildGroupedData(sortedRows, 0);
    }, [sortedRows, grouping]);

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
        const rows = grouping.length
            ? flattenRows(groupedRows)
            : sortedRows;

        return rows.slice(
            (page - 1) * rowsPerPage,
            page * rowsPerPage
        );
    }, [groupedRows, sortedRows, grouping, expandedKeys, page, rowsPerPage]);

    /* ================= PAGINATION ================= */

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setColumns(cols => {
            const enabled = cols.filter(c => c.enabled);
            const disabled = cols.filter(c => !c.enabled);

            const activeList = enabled.some(c => c.key === active.id)
                ? enabled
                : disabled;

            const oldIndex = activeList.findIndex(c => c.key === active.id);
            const newIndex = activeList.findIndex(c => c.key === over.id);

            const reordered = arrayMove(activeList, oldIndex, newIndex);

            reordered.forEach((c, i) => (c.order = i));

            return [
                ...reordered,
                ...(!activeList[0].enabled ? enabled : disabled),
            ];
        });
    };

    const sortedColumns = useMemo(() => {
        return [...columns].sort((a, b) => {
            // enabled columns first
            if (a.enabled !== b.enabled) {
                return a.enabled ? -1 : 1;
            }
            // then by order
            return a.order - b.order;
        });
    }, [columns]);

    const enabledColumns = sortedColumns.filter(c => c.enabled);

    const baseRows = grouping.length ? filteredRows : sortedRows;

    const getTotal = (key: string) =>
        Number(
            baseRows.reduce((s, r) => s + Number(r[key] || 0), 0).toFixed(2)
        );

    const handleHeaderClick = (
        e: React.MouseEvent<HTMLElement>,
        header: string
    ) => {
        setActiveHeader(header);
        setSearchText("");
        setFilterAnchor(e.currentTarget);
    };

    useEffect(() => {
        if (sortConfig.key) return;

        const hasLedgerDate = enabledColumns.some(c => c.key === "Stock_Journal_date");
        const hasInvoiceNo = enabledColumns.some(c => c.key === "invoice_no");

        if (!hasLedgerDate && !hasInvoiceNo && enabledColumns.length > 0) {
            setSortConfig({
                key: enabledColumns[0].key,
                order: "asc",
            });
        }
    }, [enabledColumns, sortConfig.key]);

    const sortFilterValues = (
        values: string[],
        key: string,
        order: "asc" | "desc"
    ) => {
        return [...values].sort((a, b) => {
            // Date column
            if (key === "Stock_Journal_date") {
                return order === "asc"
                    ? dayjs(a).valueOf() - dayjs(b).valueOf()
                    : dayjs(b).valueOf() - dayjs(a).valueOf();
            }

            // Numeric column
            if (!isNaN(Number(a)) && !isNaN(Number(b))) {
                return order === "asc"
                    ? Number(a) - Number(b)
                    : Number(b) - Number(a);
            }

            // String column
            return order === "asc"
                ? a.localeCompare(b)
                : b.localeCompare(a);
        });
    };

    const filterOptions = useMemo(() => {
        if (!activeHeader) return [];

        const uniqueValues = Array.from(
            new Set(
                rawRows   // ✅ FIXED
                    .map(r => r[activeHeader])
                    .filter(v => v !== null && v !== undefined && v !== "")
                    .map(v => String(v).trim())
            )
        );

        return sortFilterValues(
            uniqueValues,
            activeHeader,
            sortConfig.order
        );
    }, [activeHeader, rawRows, sortConfig.order]);

    const exportColumns = enabledColumns.map(c => ({
        key: c.key,
        label: c.label,
    }));

    const exportRows = sortedRows.map(row => {
        const obj: any = {};
        exportColumns.forEach(col => {
            let value = row[col.key];

            if (col.key === "Stock_Journal_date") {
                value = dayjs(value).format("DD/MM/YYYY");
            }

            obj[col.label] = value ?? "";
        });
        return obj;
    });

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Staff Based Report"
        );

        XLSX.writeFile(
            workbook,
            `Staff_Based_Report_${dayjs().format("DDMMYYYY")}.xlsx`
        );
    };

    const handleExportPDF = () => {
        const doc = new jsPDF("l", "mm", "a4");

        doc.text(
            "Staff Based Report",
            14,
            10
        );

        autoTable(doc, {
            startY: 15,
            head: [exportColumns.map(c => c.label)],
            body: exportRows.map(r => Object.values(r)),
            styles: { fontSize: 7 },
            headStyles: { fillColor: [30, 58, 138] },
        });

        doc.save(
            `Staff_Based_Report_${dayjs().format("DDMMYYYY")}.pdf`
        );
    };

    /* ================= TEMPLATE ================= */

    const loadTemplate = async (reportId: number) => {
        try {
            setTemplateLoading(true);

            setSelectedTemplateId(reportId);

            const res = await SettingsService.getReportEditData({
                reportId,
                typeId: 1,
            });

            const templateCols = res.data.data.columns || [];

            setTemplateConfig({
                abstract: templateCols,
                expanded: [],
            });

            // autofill names
            if (res.data.data.reportInfo?.Report_Name) {
                setReportName(res.data.data.reportInfo.Report_Name);
            }

            if (res.data.data.reportInfo?.Parent_Report) {
                setParentReportName(
                    res.data.data.reportInfo.Parent_Report
                );
            }

            // force reload data
            setRows([]);
            setColumns([]);
            setAbstractDateKey(null);
            setPage(1);

        } catch (err) {
            console.error(err);
            toast.error("Failed to load template ❌");
        } finally {
            setTemplateLoading(false);
        }
    };

    const applyTemplateToColumns = (
        baseCols: ColumnConfig[],
        templateCols: any[]
    ): ColumnConfig[] => {

        const templateBased = templateCols.map(t => ({
            key: t.key,
            label: t.label || t.key,
            enabled: t.enabled,
            order: t.order ?? 0,
            groupBy: t.groupBy ?? 0,
            isNumeric: NUMERIC_KEYS.includes(t.key),
        }));

        const merged = templateBased.map(col => {
            const base = baseCols.find(b => b.key === col.key);
            return {
                ...col,
                isNumeric: base?.isNumeric ?? col.isNumeric,
            };
        });

        const missing = baseCols
            .filter(b => !templateBased.some(t => t.key === b.key))
            .map(b => ({
                ...b,
                enabled: false,
                groupBy: 0,
            }));

        return [...merged, ...missing];
    };

    useEffect(() => {
        if (!columns.length || !templateConfig) return;

        const autoGroupCols = columns
            .filter(col => col.groupBy && col.enabled)
            .sort((a, b) => (a.groupBy! - b.groupBy!))
            .map(col => col.key);

        setAbstractGrouping(autoGroupCols);
        setAbstractPendingGrouping(autoGroupCols);
        setAbstractExpandedKeys([]);
    }, [columns, templateConfig]);

    const handleQuickSave = async () => {
        try {
            if (!reportName.trim()) {
                toast.error("Enter Report Name");
                return;
            }

            if (!parentReportName?.trim()) {
                toast.error("Parent Report missing");
                return;
            }

            if (!columns.length) {
                toast.error("Load report once");
                return;
            }

            /* =========================================
           GET LOGIN USER ID
        ========================================= */
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            const createdBy = userData?.id || 0;


            const payloadColumns = columns.map(c => ({
                key: c.key,
                label: c.label,
                enabled: c.enabled,
                order: c.order,
                groupBy: abstractGrouping.includes(c.key)
                    ? abstractGrouping.indexOf(c.key) + 1
                    : 0,
                dataType: "nvarchar"
            }));

            if (selectedTemplateId) {
                await SettingsService.updateReport({
                    reportId: selectedTemplateId,
                    typeId: 1,
                    columns: payloadColumns
                });

                toast.success("Template Updated Successfully ✅");
            } else {
                await SettingsService.saveReportSettings({
                    reportName,
                    parentReport: parentReportName,
                    abstractSP: spConfig.abstractSP,
                    expandedSP: spConfig.abstractSP,
                    abstractColumns: payloadColumns,
                    expandedColumns: payloadColumns,
                    createdBy
                });

                toast.success("Template Saved Successfully ✅");
            }

            setSaveDialogOpen(false);

            setTimeout(() => {
                window.location.reload();
            }, 400);

        } catch (err) {
            console.error(err);
            toast.error("Save Failed ❌");
        }
    };

    /* ================= RENDER ================= */

    return (
        <>
            <PageHeader
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
                onReportChange={(template) => {
                    if (!template) {
                        const todayDate = dayjs().format("YYYY-MM-DD");

                        setIsEditTemplate(false);
                        setSelectedTemplateId(null);
                        setReportName("");
                        setParentReportName("");
                        setTemplateConfig(null);

                        setFromDate(todayDate);
                        setToDate(todayDate);

                        setFilters({
                            Date: { from: todayDate, to: todayDate },
                            columnFilters: {},
                        });

                        setSortConfig({
                            key: null,
                            order: "asc",
                        });

                        setAbstractGrouping([]);
                        setAbstractPendingGrouping([]);
                        setAbstractExpandedKeys([]);

                        setRows([]);
                        setColumns([]);
                        setAbstractDateKey(null);
                        setPage(1);

                        setSettingsAnchor(null);
                        setFilterAnchor(null);

                        return;
                    }

                    setIsEditTemplate(true);
                    setSelectedTemplateId(template.Report_Id);
                    setReportName(template.Report_Name);

                    loadTemplate(template.Report_Id);
                }}
                onQuickSave={(parentName) => {
                    setParentReportName(parentName);
                    if (!selectedTemplateId) {
                        setReportName("");
                    }
                    setSaveDialogOpen(true);
                }}
                settingsSlot={
                    <Box display="flex" gap={1}>
                        {/* GROUP BY ICON */}
                        <Tooltip title="Group By">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setPendingGrouping(grouping);
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

                        <Tooltip title="Table Settings">
                            <IconButton size="small"
                                onClick={(e) => setSettingsAnchor(e.currentTarget)}
                                sx={{
                                    height: 24, width: 24,
                                    backgroundColor: "#fff",
                                    borderRadius: 0.5,
                                }} >
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                }

            />

            <ReportFilterDrawer
                open={drawerOpen}
                onToggle={() => setDrawerOpen((p) => !p)}
                onClose={() => setDrawerOpen(false)}
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onApply={() =>
                    setFilters({
                        ...filters,
                        Date: { from: fromDate, to: toDate },
                    })
                }
            />

            <AppLayout fullWidth>
                <Box sx={{ overflow: "auto", mt: 1 }}>
                    {templateLoading && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: "rgba(255,255,255,0.5)",
                                zIndex: 10,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <CircularProgress size={40} />
                        </Box>
                    )}
                    <TableContainer
                        component={Paper}
                        sx={{
                            maxHeight: "calc(100vh - 100px)",
                            "& th, & td": {
                                fontSize: "0.75rem",
                            },
                            position: "relative",
                        }}
                    >
                        {/* LOADING OVERLAY */}
                        {loading && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    backgroundColor: "rgba(255,255,255,0.6)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 10,
                                }}
                            >
                                <CircularProgress size={40} />
                            </Box>
                        )}

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
                                    <TableCell sx={{ color: "#fff", fontSize: "0.75rem", fontWeight: 600, }}>
                                        S.No
                                    </TableCell>
                                    {enabledColumns.map((c) => (
                                        <TableCell
                                            key={c.key}
                                            sx={{
                                                color: "#fff",
                                                cursor: !c.isNumeric ? "pointer" : "default",
                                            }}
                                            onClick={(e) =>
                                                !c.isNumeric && handleHeaderClick(e, c.key)
                                            }
                                        >
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="space-between"
                                            >
                                                {/* HEADER LABEL (FILTER CLICK) */}
                                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                                    {c.label}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow
                                    sx={{
                                        background: "#f3f4f6",
                                        position: "sticky",
                                        top: "var(--mui-table-header-height, 36px)",
                                        zIndex: 2,
                                    }}
                                >
                                    <TableCell>Total</TableCell>
                                    {enabledColumns.map((c) => (
                                        <TableCell key={c.key}>
                                            {c.isNumeric
                                                ? CURRENCY_KEYS.includes(c.key)
                                                    ? formatINR(getTotal(c.key))
                                                    : getTotal(c.key)
                                                : ""}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {(() => {
                                    serialRef.current = grouping.length
                                        ? 0
                                        : (page - 1) * rowsPerPage;

                                    return finalRows.map((row: any, i) => {
                                        if (row.__group) {
                                            const expanded = expandedKeys.includes(row.__key);

                                            return (
                                                <TableRow key={row.__key} sx={{ background: "#E2E8F0" }}>
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
                                                        const currentGroupKey = grouping[row.__level];

                                                        if (c.key === currentGroupKey) {
                                                            return (
                                                                <TableCell key={c.key} sx={{ fontWeight: 700 }}>
                                                                    {row.__value}
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (c.isNumeric) {
                                                            const total = row.__rows.reduce(
                                                                (s: number, r: any) =>
                                                                    s + Number(r[c.key] || 0),
                                                                0
                                                            );

                                                            return (
                                                                <TableCell key={c.key}>
                                                                    {formatINR(total)}
                                                                </TableCell>
                                                            );
                                                        }

                                                        return <TableCell key={c.key} />;
                                                    })}
                                                </TableRow>
                                            );
                                        }

                                        return (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    {!row.__group ? ++serialRef.current : ""}
                                                </TableCell>

                                                {enabledColumns.map(c => (
                                                    <TableCell key={c.key}>
                                                        {c.key === "Stock_Journal_date"
                                                            ? dayjs(row[c.key]).format("DD/MM/YYYY")
                                                            : row[c.key]}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        );
                                    });
                                })()}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <CommonPagination
                        totalRows={filteredRows.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={setRowsPerPage}
                    />
                </Box>
            </AppLayout>

            {activeHeader && (
                <Menu
                    anchorEl={filterAnchor}
                    open={Boolean(filterAnchor)}
                    onClose={() => setFilterAnchor(null)}
                >
                    <Box p={2} sx={{ minWidth: 240 }}>

                        {/* ===== DATE FILTER ===== */}
                        {activeHeader === "Stock_Journal_date" && (
                            <Box display="flex" flexDirection="column" gap={1}>
                                <TextField
                                    type="date"
                                    value={filters.Date.from}
                                    onChange={(e) =>
                                        setFilters(p => ({
                                            ...p,
                                            Date: { ...p.Date, from: e.target.value },
                                        }))
                                    }
                                    size="small"
                                />
                                <TextField
                                    type="date"
                                    value={filters.Date.to}
                                    onChange={(e) =>
                                        setFilters(p => ({
                                            ...p,
                                            Date: { ...p.Date, to: e.target.value },
                                        }))
                                    }
                                    size="small"
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

                        {/* ===== MULTISELECT FILTER (ALL OTHER COLUMNS) ===== */}
                        {activeHeader !== "Stock_Journal_date" && (
                            <>
                                {/* SEARCH */}
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder={`Search ${activeHeader}`}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    sx={{ mb: 1 }}
                                />

                                {/* ALL = CLEAR FILTER */}
                                <MenuItem
                                    dense
                                    sx={{ fontWeight: 600 }}
                                    onClick={() => {
                                        setFilters(p => {
                                            const copy = { ...p.columnFilters };
                                            delete copy[activeHeader]; // 🔥 clear filter
                                            return { ...p, columnFilters: copy };
                                        });
                                    }}
                                >
                                    <Checkbox
                                        size="small"
                                        checked={
                                            !filters.columnFilters[activeHeader] ||
                                            filters.columnFilters[activeHeader].length === 0
                                        }
                                    />
                                    All
                                </MenuItem>

                                {/* OPTIONS */}
                                <Box sx={{ maxHeight: 250, overflow: "auto" }}>
                                    {filterOptions
                                        .filter(v =>
                                            v.toLowerCase().includes(searchText.toLowerCase())
                                        )
                                        .map(v => {
                                            const selected =
                                                filters.columnFilters[activeHeader]?.includes(v) ?? false;

                                            return (
                                                <MenuItem
                                                    key={v}
                                                    dense
                                                    onClick={() => {
                                                        setFilters(p => {
                                                            const existing =
                                                                p.columnFilters[activeHeader] ?? [];

                                                            const updated = existing.includes(v)
                                                                ? existing.filter(x => x !== v)
                                                                : [...existing, v];

                                                            return {
                                                                ...p,
                                                                columnFilters: {
                                                                    ...p.columnFilters,
                                                                    [activeHeader]: updated,
                                                                },
                                                            };
                                                        });
                                                    }}
                                                >
                                                    <Checkbox
                                                        size="small"
                                                        checked={selected}
                                                    />
                                                    {v}
                                                </MenuItem>
                                            );
                                        })}
                                </Box>
                            </>
                        )}
                    </Box>
                </Menu>
            )}

            {/* ===== COLUMN SETTINGS ===== */}
            <Menu
                anchorEl={settingsAnchor}
                open={Boolean(settingsAnchor)}
                onClose={() => setSettingsAnchor(null)}
            >
                <Box p={2} minWidth={300}>
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Typography fontWeight={600}>
                            Column Settings
                        </Typography>

                        <Button
                            size="small"
                            color="info"
                            onClick={handleResetSettings}
                        >
                            Reset
                        </Button>
                    </Box>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        {/* ENABLED */}
                        <Typography fontSize="0.7rem" fontWeight={600} mb={0.5}>
                            Enabled Columns
                        </Typography>

                        <SortableContext
                            items={sortedColumns.filter(c => c.enabled).map(c => c.key)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sortedColumns
                                .filter(c => c.enabled)
                                .map(c => (
                                    <SortableColumnRow
                                        key={c.key}
                                        column={c}
                                        hasActiveFilter={
                                            c.key === "Stock_Journal_date"
                                                ? filters.Date.from !== today || filters.Date.to !== today
                                                : (filters.columnFilters[c.key]?.length ?? 0) > 0
                                        }
                                        onToggle={key =>
                                            setColumns(cols =>
                                                cols.map(x =>
                                                    x.key === key
                                                        ? { ...x, enabled: false }
                                                        : x
                                                )
                                            )
                                        }
                                    />
                                ))}
                        </SortableContext>

                        {/* DISABLED */}
                        <Typography fontSize="0.7rem" fontWeight={600} mt={1} mb={0.5}>
                            Disabled Columns
                        </Typography>

                        <SortableContext
                            items={sortedColumns.filter(c => !c.enabled).map(c => c.key)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sortedColumns
                                .filter(c => !c.enabled)
                                .map(c => (
                                    <SortableColumnRow
                                        key={c.key}
                                        column={c}
                                        hasActiveFilter={
                                            c.key === "Stock_Journal_date"
                                                ? filters.Date.from !== today || filters.Date.to !== today
                                                : (filters.columnFilters[c.key]?.length ?? 0) > 0
                                        }
                                        onToggle={key =>
                                            setColumns(cols =>
                                                cols.map(x =>
                                                    x.key === key
                                                        ? { ...x, enabled: true }
                                                        : x
                                                )
                                            )
                                        }
                                    />
                                ))}
                        </SortableContext>
                    </DndContext>
                </Box>
            </Menu>

            {/* *******GROUPING******* */}
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
                            value={pendingGrouping[level] || ""}
                            onChange={e => {
                                const copy = [...pendingGrouping];
                                copy[level] = e.target.value;
                                setPendingGrouping(copy);
                            }}
                        >
                            <MenuItem value="">
                                No Grouping (Level {level + 1})
                            </MenuItem>

                            {enabledColumns.map(col => (
                                <MenuItem
                                    key={col.key}
                                    value={col.key}
                                    disabled={pendingGrouping.includes(col.key)}
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
                            setGrouping(pendingGrouping.filter(Boolean));
                            setExpandedKeys([]);
                            setGroupDialogOpen(false);
                        }}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            {/* *****TEMPLATE***** */}

            <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
                <DialogTitle>
                    {isEditTemplate ? "Edit Template" : "Create Template"}
                </DialogTitle>

                <DialogContent>
                    <TextField
                        fullWidth
                        size="small"
                        label="Report Name"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                    />
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleQuickSave}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default StaffBasedReport;