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
} from "@mui/material";
import dayjs from "dayjs";
import SettingsIcon from "@mui/icons-material/Settings";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AppLayout, { useToggleMode } from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import ReportFilterDrawer from "../Components/ReportFilterDrawer";
import CommonPagination from "../Components/CommonPagination";

import {
    onlineSalesReportLOLService,
    onlineSalesReportItemLOLService,
} from "../services/OnlineSalesReport.service";

const ROWS_PER_PAGE = 25;

/* ================= TYPES ================= */

type ColumnConfig = {
    key: string;
    label: string;
    enabled: boolean;
    isNumeric?: boolean;
    order: number;
};

/* ================= CONSTANTS ================= */

const NUMERIC_KEYS = [
    "Item_Count",
    "Total_Invoice_value",
    "Rate",
    "Bill_Qty",
    "Amount",
];

const ABSTRACT_DEFAULT_KEYS = [
    "Ledger_Date",
    "invoice_no",
    "Retailer_Name",
    "Item_Count",
    "Total_Invoice_value",
];

const EXPANDED_DEFAULT_KEYS = [
    "Ledger_Date",
    "invoice_no",
    "Retailer_Name",
    "Product_Name",
    "Bill_Qty",
    "Rate",
    "Amount",
];

type SortableColumnRowProps = {
    column: ColumnConfig;
    onToggle: (key: string) => void;
};

const SortableColumnRow = ({ column, onToggle }: SortableColumnRowProps) => {
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
            <Typography fontSize="0.75rem" sx={{ flex: 1 }}>
                {column.label}
            </Typography>

            {/* ENABLE / DISABLE */}
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

const CURRENCY_KEYS = ["Total_Invoice_value", "Amount", "Rate"];

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
        order: index, // 👈 initial API order
    }));
};

const formatINR = (value: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(value);

/* ================= COMPONENT ================= */

const OnlineSalesReportLOL: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");

    const { toggleMode, setToggleMode } = useToggleMode();

    const [rawRows, setRawRows] = useState<any[]>([]);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [page, setPage] = useState(1);

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
    const HEADER_HEIGHT = 36;

    /* ================= LOAD DATA ================= */

    useEffect(() => {
        const service =
            toggleMode === "Expanded"
                ? onlineSalesReportItemLOLService.getReportsItemLOL
                : onlineSalesReportLOLService.getReportsLOL;

        service({
            Fromdate: filters.Date.from,
            Todate: filters.Date.to,
        }).then((res: any) => {
            const rows = res.data.data || [];
            setRawRows(rows);
            setColumns(buildColumnsFromApi(rows, toggleMode));
            setPage(1);
        });
    }, [toggleMode, filters.Date.from, filters.Date.to]);

    /* ================= GROUPING (ABSTRACT ONLY) ================= */

    const processedRows = useMemo(() => {
        if (toggleMode === "Expanded") return rawRows;

        const invoiceEnabled = columns.find(
            (c) => c.key === "invoice_no"
        )?.enabled;

        const groupByColumns = columns
            .filter((c) => c.enabled && !c.isNumeric)
            .map((c) => c.key);

        if (invoiceEnabled) return rawRows;

        const map = new Map<string, any>();

        rawRows.forEach((row) => {
            const key = groupByColumns
                .map((col) =>
                    col === "Ledger_Date"
                        ? dayjs(row[col]).format("YYYY-MM-DD")
                        : row[col]
                )
                .join("__");

            if (!map.has(key)) {
                const base: any = {};
                groupByColumns.forEach((c) => (base[c] = row[c]));
                columns
                    .filter((c) => c.isNumeric)
                    .forEach((c) => (base[c.key] = Number(row[c.key] || 0)));
                base.__invoiceSet = new Set(
                    row.invoice_no ? [row.invoice_no] : []
                );
                map.set(key, base);
            } else {
                const existing = map.get(key);
                columns
                    .filter((c) => c.isNumeric)
                    .forEach(
                        (c) =>
                            (existing[c.key] += Number(row[c.key] || 0))
                    );
                if (row.invoice_no)
                    existing.__invoiceSet.add(row.invoice_no);
            }
        });

        return Array.from(map.values()).map((r) => ({
            ...r,
            __invoiceCount: r.__invoiceSet.size,
        }));
    }, [rawRows, columns, toggleMode]);

    /* ================= FILTERING ================= */

    const filteredRows = useMemo(() => {
        return processedRows.filter((row) => {
            const rowDate = dayjs(row.Ledger_Date);

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

            for (const [key, values] of Object.entries(
                filters.columnFilters
            )) {
                if (values.length === 0) continue;
                if (!values.includes(String(row[key]))) return false;
            }

            return true;
        });
    }, [processedRows, filters]);

    /* ================= PAGINATION ================= */

    const paginatedRows = filteredRows.slice(
        (page - 1) * ROWS_PER_PAGE,
        page * ROWS_PER_PAGE
    );

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

    const getTotal = (key: string) =>
        filteredRows.reduce((s, r) => s + Number(r[key] || 0), 0);

    const handleHeaderClick = (
        e: React.MouseEvent<HTMLElement>,
        header: string
    ) => {
        setActiveHeader(header);
        setSearchText("");
        setFilterAnchor(e.currentTarget);
    };

    const filterOptions = useMemo(() => {
        if (!activeHeader) return [];
        return Array.from(
            new Set(
                rawRows
                    .map((r) => r[activeHeader])
                    .filter((v) => v !== null && v !== undefined && v !== "")
                    .map(String)
            )
        );
    }, [activeHeader, rawRows]);

    /* ================= RENDER ================= */

    return (
        <>
            <PageHeader
                pages={[
                    { label: "Online Sales Report", path: "/salesreport" },
                    { label: "Unit Economics", path: "/uniteconomics" },
                    { label: "Stock in Hand", path: "/stockinhand" },
                    { label: "Online Sales Report LOL", path: "/salesreportLOL" },
                ]}
                toggleMode={toggleMode}
                onToggleChange={setToggleMode}
                settingsSlot={
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
                                        {c.label}
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
                           
                            {paginatedRows.map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        {(page - 1) * ROWS_PER_PAGE + i + 1}
                                    </TableCell>
                                    {enabledColumns.map((c) => (
                                        <TableCell key={c.key}>
                                            {c.key === "Ledger_Date"
                                                ? dayjs(
                                                    row[c.key]
                                                ).format("DD/MM/YYYY")
                                                : CURRENCY_KEYS.includes(
                                                    c.key
                                                )
                                                    ? formatINR(
                                                        Number(row[c.key])
                                                    )
                                                    : c.key === "Item_Count" &&
                                                        toggleMode === "Abstract" &&
                                                        row.__invoiceCount
                                                        ? `${row[c.key]} (${row.__invoiceCount})`
                                                        : row[c.key]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
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

                                {/* ALL OPTION */}
                                <MenuItem
                                    dense
                                    sx={{ fontWeight: 600 }}
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

                                {/* MULTI OPTIONS */}
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
                                                selected={selected}
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
                                                {/* CHECKBOX UI */}
                                                <Box
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        border: "1px solid #555",
                                                        mr: 1,
                                                        bgcolor: selected
                                                            ? "#1E3A8A"
                                                            : "transparent",
                                                    }}
                                                />
                                                {v}
                                            </MenuItem>
                                        );
                                    })}
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
                    <Typography fontWeight={600} mb={1}>
                        Column Settings
                    </Typography>

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
                        <Typography
                            fontSize="0.7rem"
                            fontWeight={600}
                            mt={1}
                            mb={0.5}
                        >
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
        </>
    );
};

export default OnlineSalesReportLOL;