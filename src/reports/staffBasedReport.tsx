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
import AppLayout, { useToggleMode } from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import ReportFilterDrawer from "../Components/ReportFilterDrawer";
import CommonPagination from "../Components/CommonPagination";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { SettingsService } from "../services/reportSettings.services";
import {
    costCenterListService, staffBasedReportService
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

const CURRENCY_KEYS = ["Total_Invoice_value", "Amount", "Rate"];


const formatINR = (value: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(value);

/* ================= COMPONENT ================= */

const StaffBasedReport: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");

    const { toggleMode, setToggleMode } = useToggleMode();
    const [loading, setLoading] = useState(false);

    const [abstractRows, setAbstractRows] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<any[]>([]);
    const rawRows =
        toggleMode === "Expanded" ? expandedRows : abstractRows;
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
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [stockFilter, setStockFilter] = useState<
        "hasValues" | "zero" | "all"
    >("hasValues");

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
        Date: {
            from: today,
            to: today
        },
        columnFilters: {},
    });
    type SortOrder = "asc" | "desc";

    const [sortConfig, setSortConfig] = useState<{
        key: string | null;
        order: SortOrder;
    }>({
        key: null,
        order: "asc",
    });

    const [groupDialogOpen, setGroupDialogOpen] = useState(false);

    const [abstractGrouping, setAbstractGrouping] = useState<string[]>([]);
    const [expandedGrouping, setExpandedGrouping] = useState<string[]>([]);

    const [abstractPendingGrouping, setAbstractPendingGrouping] = useState<string[]>([]);
    const [expandedPendingGrouping, setExpandedPendingGrouping] = useState<string[]>([]);

    const [abstractExpandedKeys, setAbstractExpandedKeys] = useState<string[]>([]);
    const [expandedExpandedKeys, setExpandedExpandedKeys] = useState<string[]>([]);

    const serialRef = React.useRef(0);

    const [templateConfig, setTemplateConfig] = useState<{
        expanded: ColumnConfig[];
    } | null>(null);

    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [reportName, setReportName] = useState("");
    const [parentReportName, setParentReportName] = useState("");
    const [isEditTemplate, setIsEditTemplate] = useState(false);

    const grouping =
        toggleMode === "Expanded" ? expandedGrouping : abstractGrouping;

    const HEADER_HEIGHT = 36;

    const setGrouping =
        toggleMode === "Expanded" ? setExpandedGrouping : setAbstractGrouping;

    const pendingGrouping =
        toggleMode === "Expanded"
            ? expandedPendingGrouping
            : abstractPendingGrouping;

    const setPendingGrouping =
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

    /* ================= LOAD DATA ================= */

    useEffect(() => {
        loadStaffBasedReport();
    }, [filters.Date.from, filters.Date.to]);

    useEffect(() => {
        if (toggleMode === "Expanded" && expandedRows.length === 0) {
            loadStaffBasedReport();
        }

        if (toggleMode === "Abstract" && abstractRows.length === 0) {
            loadStaffBasedReport();
        }
    }, [toggleMode]);

    const loadStaffBasedReport = async () => {
        try {
            setLoading(true);

            const [staffRes, reportRes] = await Promise.all([
                costCenterListService.getStaff(),
                staffBasedReportService.getStaffBasedReport({
                    Fromdate: filters.Date.from,
                    Todate: filters.Date.to
                })
            ]);

            const staffList = staffRes.data.data || [];
            const reportRows = reportRes.data.data || [];

            // ================= ABSTRACT =================
            if (toggleMode === "Abstract") {
                const start = dayjs(filters.Date.from);
                const end = dayjs(filters.Date.to);

                const dates: string[] = [];
                let current = start;

                while (current.isBefore(end) || current.isSame(end, "day")) {
                    dates.push(current.format("DD.MM"));
                    current = current.add(1, "day");
                }

                const rows = staffList.map((staff, index) => {
                    const obj: any = {
                        SNo: index + 1,
                        Staff_Name: staff.Cost_Center_Name
                    };

                    let total = 0;

                    dates.forEach((dateCol) => {
                        const qty = reportRows
                            .filter(
                                (x) =>
                                    x.Others1 === staff.Cost_Center_Name &&
                                    dayjs(x.Stock_Journal_date).format("DD.MM") === dateCol
                            )
                            .reduce((sum, r) => sum + Number(r.Qty || 0), 0);

                        obj[dateCol] = qty;
                        total += qty;
                    });

                    obj.Total = total;
                    return obj;
                });

                const cols: ColumnConfig[] = [
                    {
                        key: "Staff_Name",
                        label: "Staff Name",
                        enabled: true,
                        order: 1
                    },
                    ...dates.map((d, i) => ({
                        key: d,
                        label: d,
                        enabled: true,
                        order: i + 2,
                        isNumeric: true
                    })),
                    {
                        key: "Total",
                        label: "Total",
                        enabled: true,
                        order: 999,
                        isNumeric: true
                    }
                ];

                setAbstractRows(rows);
                setAbstractColumns(cols);
            }

            // ================= EXPANDED =================
            else {
                const defaultEnabled = [
                    "Staff_Name",
                    "Godown_Name",
                    "Qty",
                    "Others1",
                    "Others2",
                    "Others3",
                    "Others4",
                    "Others5"
                ];

                const excludeKeys = ["SNo"];

                const allKeys =
                    reportRows.length > 0
                        ? Object.keys(reportRows[0]).filter(
                            (key) => !excludeKeys.includes(key)
                        )
                        : [];

                const allColumns = allKeys.map((key) => ({
                    key,
                    label: key.replace(/_/g, " "),
                    isNumeric:
                        key === "Qty" ||   // ✅ Qty numeric
                        [
                            "Others1",
                            "Others2",
                            "Others3",
                            "Others4",
                            "Others5",
                            "Load_Man",
                            "Checker",
                            "Delivery_Man",
                            "Others6",
                            "Driver"
                        ].includes(key)
                }));

                const staffFields = [
                    "Others1",
                    "Others2",
                    "Others3",
                    "Others4",
                    "Others5",
                    "Load_Man",
                    "Checker",
                    "Delivery_Man",
                    "Others6",
                    "Driver"
                ];

                const staffMap: any = {};

                reportRows.forEach((row: any) => {
                    const qty = Number(row.Qty || 0);

                    staffFields.forEach((field) => {
                        const staff = String(row[field] || "").trim();

                        if (!staff) return;

                        if (!staffMap[staff]) {
                            staffMap[staff] = {
                                Staff_Name: staff,
                                Godown_Name: row.Godown_Name || "",
                                Qty: 0, // ✅ initialize total qty
                            };

                            allColumns.forEach((c) => {
                                if (c.key !== "Qty") {
                                    staffMap[staff][c.key] =
                                        c.isNumeric ? 0 : row[c.key] || "";
                                }
                            });
                        }

                        staffMap[staff][field] += qty;
                        staffMap[staff]["Qty"] += qty; // ✅ total qty per staff
                    });
                });

                const rows = Object.values(staffMap).map((r: any, i) => ({
                    SNo: i + 1,
                    ...r
                }));

                const cols: ColumnConfig[] = [
                    {
                        key: "Staff_Name",
                        label: "Staff Name",
                        enabled: true,
                        order: 1
                    },
                    {
                        key: "Godown_Name",
                        label: "Godown Name",
                        enabled: true,
                        order: 2
                    },
                    {
                        key: "Qty",
                        label: "Total Qty",
                        enabled: true,
                        order: 3,
                        isNumeric: true
                    },

                    ...allColumns
                        .filter(
                            (col) =>
                                col.key !== "Staff_Name" &&
                                col.key !== "Godown_Name" &&
                                col.key !== "Qty"
                        )
                        .map((col, i) => ({
                            key: col.key,
                            label: col.label,
                            enabled: defaultEnabled.includes(col.key),
                            order: i + 4,
                            isNumeric: col.isNumeric
                        }))
                ];

                setExpandedRows(rows);
                let finalCols = cols;

                if (templateConfig?.expanded) {
                    finalCols = applyTemplateToColumns(cols, templateConfig.expanded);
                }

                setExpandedColumns(finalCols);
            }

            setPage(1);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load Staff Based Report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setFromDate(filters.Date.from);
        setToDate(filters.Date.to);
    }, [toggleMode]);


    const handleResetSettings = () => {
        const todayDate = dayjs().format("YYYY-MM-DD");

        setTemplateConfig(null);

        // ✅ Reset filters
        setFromDate(todayDate);
        setToDate(todayDate);

        setFilters({
            Date: { from: todayDate, to: todayDate },
            columnFilters: {},
        });

        setAbstractGrouping([]);
        setExpandedGrouping([]);

        setAbstractPendingGrouping([]);
        setExpandedPendingGrouping([]);

        setAbstractExpandedKeys([]);
        setExpandedExpandedKeys([]);

        // ✅ Reset sort
        setSortConfig({ key: null, order: "asc" });

        // ✅ HARD RESET DATA (IMPORTANT)
        setAbstractRows([]);
        setExpandedRows([]);

        setAbstractColumns([]);
        setExpandedColumns([]);
        setStockFilter("hasValues");

        // ✅ Reset pagination
        setPage(1);

        // ✅ Close menus
        setSettingsAnchor(null);
        setFilterAnchor(null);

    };

    /* ================= FILTERING ================= */

    const filteredRows = useMemo(() => {
        return rawRows.filter((row) => {
            // ================= DATE FILTER =================
            const rowDate = dayjs(
                row.Ledger_Date || row.Stock_Journal_date
            );

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

            // ================= COLUMN FILTER =================
            for (const [key, values] of Object.entries(
                filters.columnFilters
            )) {
                if (!values || values.length === 0) continue;

                const rowValue = String(row[key] ?? "")
                    .trim()
                    .toLowerCase();

                const match = values.some(
                    (v) =>
                        String(v).trim().toLowerCase() === rowValue
                );

                if (!match) return false;
            }

            // ================= STOCK FILTER =================
            const qty = Number(row.Qty || row.Total || 0);

            if (stockFilter === "hasValues" && qty <= 0)
                return false;

            if (stockFilter === "zero" && qty !== 0)
                return false;

            return true;
        });
    }, [rawRows, filters, stockFilter]);

    const sortedRows = useMemo(() => {
        if (!sortConfig.key) return filteredRows;

        return [...filteredRows].sort((a, b) => {
            const aVal = a[sortConfig.key!];
            const bVal = b[sortConfig.key!];

            if (aVal == null) return 1;
            if (bVal == null) return -1;

            // Date handling
            if (sortConfig.key === "Ledger_Date") {
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

    const paginatedSourceRows = useMemo(() => {
        return grouping.length
            ? flattenRows(groupedRows)
            : sortedRows;
    }, [groupedRows, sortedRows, grouping, expandedKeys]);

    const finalRows = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        return paginatedSourceRows.slice(start, end);
    }, [paginatedSourceRows, page, rowsPerPage]);

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

        const hasLedgerDate = enabledColumns.some(c => c.key === "Ledger_Date");
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
            if (key === "Ledger_Date") {
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
                rawRows
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

            if (col.key === "Ledger_Date") {
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
            toggleMode === "Expanded" ? "Expanded Report" : "Abstract Report"
        );

        XLSX.writeFile(
            workbook,
            `Staff Based Report_${toggleMode}_${dayjs().format("DDMMYYYY")}.xlsx`
        );
    };

    const handleExportPDF = () => {
        const doc = new jsPDF("l", "mm", "a4");

        doc.text(
            `Staff Based Report (${toggleMode})`,
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
            `Staff Based Report ${toggleMode}_${dayjs().format("DDMMYYYY")}.pdf`
        );
    };


    useEffect(() => {
        if (!columns.length || !templateConfig) return;

        const autoGroupCols = columns
            .filter(col => col.groupBy && col.enabled)
            .sort((a, b) => (a.groupBy! - b.groupBy!))
            .map(col => col.key);

        if (toggleMode === "Expanded") {
            setExpandedGrouping(autoGroupCols);
            setExpandedPendingGrouping(autoGroupCols);
            setExpandedExpandedKeys([]);
        } else {
            setAbstractGrouping(autoGroupCols);
            setAbstractPendingGrouping(autoGroupCols);
            setAbstractExpandedKeys([]);
        }
    }, [columns]);

    const applyTemplateToColumns = (
        baseCols: ColumnConfig[],
        templateCols: any[]
    ): ColumnConfig[] => {

        const mapped = templateCols.map((t: any) => ({
            key: t.key,
            label: t.label,
            enabled: t.enabled,
            order: t.order,
            groupBy: t.groupBy || 0,
            isNumeric: baseCols.find(b => b.key === t.key)?.isNumeric
        }));

        const missing = baseCols
            .filter(b => !mapped.some((m: any) => m.key === b.key))
            .map(b => ({
                ...b,
                enabled: false
            }));

        return [...mapped, ...missing];
    };

    const loadTemplate = async (reportId: number) => {
        try {
            setLoading(true);

            const res = await SettingsService.getReportEditData({
                reportId,
                typeId: 2,
            });

            console.log("Template Response:", res.data);

            const data =
                res?.data?.data ||
                res?.data ||
                {};

            const templateCols =
                data?.columns ||
                data?.Columns ||
                [];

            /* ==========================
               TEMPLATE CONFIG
            ========================== */
            setTemplateConfig({
                expanded: templateCols,
            });

            setSelectedTemplateId(reportId);
            setIsEditTemplate(true);

            /* ==========================
               REPORT NAME AUTO FILL
            ========================== */
            const autoReportName =
                data?.Report_Name ||
                data?.ReportName ||
                data?.report_name ||
                data?.reportName ||
                data?.Name ||
                data?.name ||
                "";

            if (autoReportName) {
                setReportName(autoReportName);
            }

            /* ==========================
               EXPANDED MODE
            ========================== */
            setToggleMode("Expanded");

            setExpandedRows([]);
            setExpandedColumns([]);

            setTimeout(() => {
                loadStaffBasedReport();
            }, 0);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load template");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickSave = async () => {
        try {
            /* ===============================
               VALIDATION
            =============================== */
            if (toggleMode !== "Expanded") {
                toast.info("Templates can be saved only in Expanded mode");
                return;
            }

            if (!reportName.trim()) {
                toast.error("Enter Report Name");
                return;
            }

            if (!parentReportName.trim()) {
                toast.error("Parent Report missing");
                return;
            }

            if (!expandedColumns.length) {
                toast.error("Expanded columns not loaded");
                return;
            }

            /* ===============================
               LOGIN USER
            =============================== */
            const userData = JSON.parse(
                localStorage.getItem("user") || "{}"
            );

            const createdBy = userData?.id || 0;

            /* ===============================
               ABSTRACT PAYLOAD
               (backend requires valid data)
            =============================== */
            const abstractPayload = (
                abstractColumns.length
                    ? abstractColumns
                    : [
                        {
                            key: "Staff_Name",
                            label: "Staff Name",
                            enabled: true,
                            order: 1,
                            groupBy: 0,
                            isNumeric: false,
                        },
                    ]
            ).map((c) => ({
                key: c.key,
                label: c.label,
                enabled: c.enabled,
                order: c.order,
                groupBy: 0,
                dataType: "nvarchar",
            }));

            /* ===============================
               EXPANDED PAYLOAD
            =============================== */
            const expandedPayload = expandedColumns.map((c) => ({
                key: c.key,
                label: c.label,
                enabled: c.enabled,
                order: c.order,
                groupBy: expandedGrouping.includes(c.key)
                    ? expandedGrouping.indexOf(c.key) + 1
                    : 0,
                dataType: "nvarchar",
            }));

            /* ===============================
               EDIT TEMPLATE
            =============================== */
            if (selectedTemplateId) {
                await SettingsService.updateReport({
                    reportId: selectedTemplateId,
                    typeId: 1,
                    columns: abstractPayload,
                });

                await SettingsService.updateReport({
                    reportId: selectedTemplateId,
                    typeId: 2,
                    columns: expandedPayload,
                });

                toast.success("Template Updated Successfully ✅");
            }

            /* ===============================
               CREATE TEMPLATE
            =============================== */
            else {
                await SettingsService.saveReportSettings({
                    reportName: reportName.trim(),
                    parentReport: parentReportName.trim(),

                    // backend required SP names
                    abstractSP:
                        "Reporting_Online_Stock_Journal_VW",

                    expandedSP:
                        "Reporting_Online_Stock_Journal_Item_VW",

                    abstractColumns: abstractPayload,
                    expandedColumns: expandedPayload,

                    createdBy,
                });

                toast.success("Template Saved Successfully ✅");
            }

            /* ===============================
               CLOSE / REFRESH
            =============================== */
            setSaveDialogOpen(false);

            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (err: any) {
            console.error(err);

            toast.error(
                err?.response?.data?.message ||
                "Save Failed ❌"
            );
        }
    };

    /* ================= RENDER ================= */

    return (
        <>
            <PageHeader
                toggleMode={toggleMode}
                onToggleChange={setToggleMode}
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
                onReportChange={(template) => {

                    if (!template) {
                        setTemplateConfig(null);
                        setSelectedTemplateId(null);
                        setReportName("");
                        setParentReportName("");
                        setIsEditTemplate(false);

                        /* RESET MODE */
                        setToggleMode("Abstract");

                        /* RESET ALL PAGE SETTINGS */
                        handleResetSettings();

                        /* RELOAD INITIAL DATA */
                        setTimeout(() => {
                            loadStaffBasedReport();
                        }, 0);

                        return;
                    }

                    /* ===============================
                       TEMPLATE SELECTED
                    =============================== */
                    setIsEditTemplate(true);
                    setSelectedTemplateId(template.Report_Id);
                    setReportName(template.Report_Name || "");

                    loadTemplate(template.Report_Id);
                }}

                onQuickSave={(parentName) => {
                    if (toggleMode !== "Expanded") {
                        toast.info("Templates only available in Expanded mode");
                        return;
                    }

                    setParentReportName(parentName);
                    setSaveDialogOpen(true);
                }}

                settingsSlot={
                    <Box display="flex" gap={1}>
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
                            <IconButton
                                size="small"
                                onClick={(e) => setSettingsAnchor(e.currentTarget)}
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
                onToggle={() => setDrawerOpen((p) => !p)}
                onClose={() => setDrawerOpen(false)}
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}

                stockFilter={stockFilter}
                onStockFilterChange={setStockFilter}

                onApply={() =>
                    setFilters({
                        ...filters,
                        Date: {
                            from: fromDate,
                            to: toDate,
                        },
                    })
                }
            />

            <AppLayout fullWidth>
                <Box sx={{ overflow: "auto", mt: 1 }}>

                    <TableContainer
                        component={Paper}
                        sx={{
                            maxHeight: "calc(100vh - 100px)", "& th, & td": {
                                fontSize: "0.75rem",
                            },
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
                                                    : Number(getTotal(c.key)).toFixed(2)
                                                : ""}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={enabledColumns.length + 1} align="center">
                                            <Box py={4}>
                                                <CircularProgress size={28} />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    (() => {
                                        serialRef.current = (page - 1) * rowsPerPage;

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
                                                                        {Number(total).toFixed(2)}
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
                                                            {c.key === "Ledger_Date"
                                                                ? dayjs(row[c.key]).format("DD/MM/YYYY")
                                                                : c.isNumeric
                                                                    ? Number(row[c.key] || 0).toFixed(2)
                                                                    : row[c.key]}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            );
                                        });
                                    })()
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <CommonPagination
                        totalRows={paginatedSourceRows.length}
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
                        {activeHeader === "Ledger_Date" && (
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
                        {activeHeader !== "Ledger_Date" && (
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
                                            c.key === "Ledger_Date"
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
                                            c.key === "Ledger_Date"
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

                    <Button variant="contained" onClick={handleQuickSave}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default StaffBasedReport;