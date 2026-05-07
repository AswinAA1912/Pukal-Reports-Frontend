import { useEffect, useMemo, useState } from "react";
import {
    Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, Typography,
    Tooltip, Menu, Switch, CircularProgress, Button
} from "@mui/material";

import SettingsIcon from "@mui/icons-material/Settings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { arrayMove } from "@dnd-kit/sortable";

import {
    DndContext, closestCenter, PointerSensor,
    useSensor, useSensors
} from "@dnd-kit/core";

import {
    SortableContext, useSortable,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import AppLayout, { useToggleMode } from "../../Layout/appLayout";
import PageHeader from "../../Layout/PageHeader";
import ReportFilterDrawer from "../../Components/ReportFilterDrawer";

import dayjs from "dayjs";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { onlinePaymentReportService } from "../../services/expenseReport.service";

const formatINR = (v: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(v);

/* ================= MAPPING ================= */

const mapExpenseData = (summary: any[], direct: any[], indirect: any[]) => {

    const normalize = (val: any) =>
        String(val ?? "").trim();

    const mapper = (list: any[]) => {
        const groupMap: any = {};

        list.forEach((acc) => {

            const rows = summary.filter(
                (s) => normalize(s.debit_ledger) === normalize(acc.Acc_Id)
            );

            if (!rows.length) return;

            const groupName = acc.Group_Name || "Others";

            if (!groupMap[groupName]) {
                groupMap[groupName] = {
                    name: groupName,
                    total: 0,
                    subGroups: {}
                };
            }

            rows.forEach((row) => {

                const subKey = row.debit_ledger_name || "Others";

                if (!groupMap[groupName].subGroups[subKey]) {
                    groupMap[groupName].subGroups[subKey] = {
                        name: subKey,
                        total: 0,
                        ledgers: []
                    };
                }

                groupMap[groupName].subGroups[subKey].total += Number(row.debit_amount || 0);

                groupMap[groupName].subGroups[subKey].ledgers.push(row);

                groupMap[groupName].total += Number(row.debit_amount || 0);
            });

        });

        return {
            total: Object.values(groupMap).reduce((s: any, g: any) => s + g.total, 0),
            groups: Object.values(groupMap).map((g: any) => ({
                ...g,
                subGroups: Object.values(g.subGroups)
            }))
        };
    };

    return {
        Direct: mapper(direct),
        Indirect: mapper(indirect)
    };
};

/* ================= SORT ================= */

const SortRow = ({ col, toggle }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: col.key });

    return (
        <Box ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            display="flex" alignItems="center" gap={1} mb={1}
        >
            <IconButton {...listeners} {...attributes} size="small">
                <DragIndicatorIcon fontSize="small" />
            </IconButton>

            <Typography sx={{ flex: 1 }}>{col.label}</Typography>

            <Switch
                checked={col.enabled}
                onChange={() => toggle(col.key)}
            />
        </Box>
    );
};

/* ================= MAIN ================= */

const ExpensesReport = () => {

    const { toggleMode, setToggleMode } = useToggleMode();

    const today = dayjs().format("YYYY-MM-DD");

    const [data, setData] = useState<any>(null);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [expandedLedgers, setExpandedLedgers] = useState<string[]>([]);
    const [columns, setColumns] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [settingsAnchor, setSettingsAnchor] =
        useState<null | HTMLElement>(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    const [filters, setFilters] = useState({
        Date: { from: today, to: today },
    });

    const sensors = useSensors(useSensor(PointerSensor));

    /* ================= FETCH ================= */

    useEffect(() => {
        fetchData();
    }, [filters.Date.from, filters.Date.to]);

    const DEFAULT_ENABLED = [
        "payment_date",
        "payment_invoice_no",
        "debit_amount",
        "transaction_type",
        "remarks",
        "Created_By",
        "Approved"
    ];

    const buildColumns = (summary: any[]) => {
        if (!summary?.length) return [];

        return Object.keys(summary[0]).map((key, index) => ({
            key,
            label: key.replace(/_/g, " ").toUpperCase(),
            enabled: DEFAULT_ENABLED.includes(key),
            order: index
        }));
    };

    const sortedColumns = useMemo(() => {
        return [...columns].sort((a, b) => {
            if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
            return a.order - b.order;
        });
    }, [columns]);

    const enabledCols = sortedColumns.filter(c => c.enabled);

    const fetchData = async () => {
        try {
            setLoading(true);

            const res = await onlinePaymentReportService.getOnlinePaymentReport({
                Fromdate: filters.Date.from,
                Todate: filters.Date.to,
            });

            const mapped = mapExpenseData(
                res.Summary,
                res.DirectExpense,
                res.IndirectExpense
            );

            // ✅ Dynamic Columns
            const dynamicCols = buildColumns(res.Summary);

            setColumns(dynamicCols);
            setData(mapped);

            setExpandedGroups([]);
            setExpandedLedgers([]);

        } catch {
            toast.error("Load failed ❌");
        } finally {
            setLoading(false);
        }
    };

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
                ...(activeList[0].enabled ? disabled : enabled),
            ];
        });
    };

    /* ================= EXPORT EXCEL ================= */

    const exportExcel = () => {

        try {

            if (!section) {
                toast.error("No data available");
                return;
            }

            const rows: any[] = [];

            section.groups.forEach((group: any) => {

                /* GROUP HEADER */
                rows.push({
                    TYPE: group.name,
                    VALUE: formatINR(group.total)
                });

                group.subGroups.forEach((sub: any) => {

                    /* SUB GROUP HEADER */
                    rows.push({
                        TYPE: "   " + sub.name,
                        VALUE: formatINR(sub.total)
                    });

                    /* COLUMN HEADER */
                    const headerRow: any = {};

                    enabledCols.forEach((col: any) => {
                        headerRow[col.label] = col.label;
                    });

                    rows.push(headerRow);

                    /* TABLE ROWS */
                    sub.ledgers.forEach((row: any) => {

                        const exportRow: any = {};

                        enabledCols.forEach((col: any) => {

                            exportRow[col.label] =
                                col.key === "debit_amount"
                                    ? Number(row[col.key] || 0)
                                    : col.key === "payment_date"
                                        ? dayjs(row[col.key]).format("DD-MM-YYYY")
                                        : row[col.key];

                        });

                        rows.push(exportRow);

                    });

                    /* EMPTY SPACE */
                    rows.push({});

                });

                rows.push({});

            });

            const worksheet = XLSX.utils.json_to_sheet(rows);

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                `${activeType} Expenses`
            );

            XLSX.writeFile(
                workbook,
                `${activeType}_Expenses_Report.xlsx`
            );

            toast.success("Excel Exported ✅");

        } catch (err) {
            console.error(err);
            toast.error("Excel Export Failed ❌");
        }
    };



    /* ================= EXPORT PDF ================= */

    const exportPDF = () => {

        try {

            if (!section) {
                toast.error("No data available");
                return;
            }

            const doc = new jsPDF("l", "mm", "a4");

            let startY = 10;

            /* TITLE */
            doc.setFontSize(14);

            doc.text(
                `${activeType} Expenses Report`,
                14,
                startY
            );

            startY += 10;

            section.groups.forEach((group: any) => {

                /* GROUP TITLE */
                doc.setFontSize(12);

                doc.text(
                    `${group.name} - ${formatINR(group.total)}`,
                    14,
                    startY
                );

                startY += 6;

                group.subGroups.forEach((sub: any) => {

                    /* SUB GROUP TITLE */
                    doc.setFontSize(10);

                    doc.text(
                        `${sub.name} - ${formatINR(sub.total)}`,
                        18,
                        startY
                    );

                    startY += 4;

                    /* TABLE */
                    autoTable(doc, {
                        startY,
                        head: [
                            enabledCols.map((c: any) => c.label)
                        ],

                        body: sub.ledgers.map((row: any) =>
                            enabledCols.map((col: any) => {

                                if (col.key === "debit_amount") {
                                    return formatINR(row[col.key] || 0);
                                }

                                if (col.key === "payment_date") {
                                    return dayjs(row[col.key])
                                        .format("DD-MM-YYYY");
                                }

                                return row[col.key] ?? "";

                            })
                        ),

                        styles: {
                            fontSize: 8,
                            cellPadding: 2,
                        },

                        headStyles: {
                            fontStyle: "bold",
                        },

                        margin: {
                            left: 18,
                            right: 14
                        }
                    });

                    startY =
                        (doc as any).lastAutoTable.finalY + 10;

                });

            });

            doc.save(
                `${activeType}_Expenses_Report.pdf`
            );

            toast.success("PDF Exported ✅");

        } catch (err) {
            console.error(err);
            toast.error("PDF Export Failed ❌");
        }
    };

    const activeType = toggleMode === "Abstract" ? "Direct" : "Indirect";
    const section = data?.[activeType];


    /* ================= RENDER ================= */

    return (
        <>
            <PageHeader
                toggleMode={toggleMode}
                onToggleChange={setToggleMode}
                onExportExcel={exportExcel}
                onExportPDF={exportPDF}
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
                onClose={() => setDrawerOpen(false)}
                onToggle={() => setDrawerOpen(p => !p)}
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onApply={() =>
                    setFilters({ Date: { from: fromDate, to: toDate } })
                }
            />

            <AppLayout fullWidth>
                <Box p={1} sx={{
                    overflow: "hidden",
                }}>

                    {data && section && (
                        <Box mb={2}>

                            {/* 🔷 HEADER */}
                            <Box
                                display="flex"
                                justifyContent="space-between"
                                border="1px solid #cbd5e1"
                                p={1}
                                mb={1}
                            >
                                <Typography fontWeight={700}>
                                    {activeType === "Direct"
                                        ? "DIRECT EXPENSES"
                                        : "INDIRECT EXPENSES"}
                                </Typography>

                                <Typography fontWeight={700}>
                                    {formatINR(section.total)}
                                </Typography>
                            </Box>

                            {/* 🔷 GROUPS */}
                            {section.groups.map((group: any) => {
                                const gKey = activeType + group.name;
                                const openGroup = expandedGroups.includes(gKey);

                                return (
                                    <Box key={gKey} mb={1}>

                                        {/* 🔷 PRIMARY GROUP */}
                                        <Box
                                            display="flex"
                                            justifyContent="space-between"
                                            sx={{ background: "#f1f5f9", p: 1, cursor: "pointer" }}
                                            onClick={() =>
                                                setExpandedGroups(p =>
                                                    p.includes(gKey)
                                                        ? p.filter(x => x !== gKey)
                                                        : [...p, gKey]
                                                )
                                            }
                                        >
                                            <Box display="flex" alignItems="center">
                                                {openGroup ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                                                <Typography ml={1}>{group.name}</Typography>
                                            </Box>

                                            <Typography>{formatINR(group.total)}</Typography>
                                        </Box>

                                        {/* 🔷 SUB GROUP */}
                                        {openGroup && group.subGroups.map((sub: any) => {
                                            const sKey = gKey + sub.name;
                                            const openSub = expandedLedgers.includes(sKey);

                                            return (
                                                <Box key={sKey}>

                                                    <Box
                                                        display="flex"
                                                        justifyContent="space-between"
                                                        sx={{
                                                            background: "#e2e8f0",
                                                            p: 1,
                                                            pl: 4,
                                                            cursor: "pointer"
                                                        }}
                                                        onClick={() =>
                                                            setExpandedLedgers(p =>
                                                                p.includes(sKey)
                                                                    ? p.filter(x => x !== sKey)
                                                                    : [...p, sKey]
                                                            )
                                                        }
                                                    >
                                                        <Box display="flex" alignItems="center">
                                                            {openSub ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                                                            <Typography ml={1}>{sub.name}</Typography>
                                                        </Box>

                                                        <Typography>{formatINR(sub.total)}</Typography>
                                                    </Box>

                                                    {/* 🔥 FINAL TABLE (LEVEL 3) */}
                                                    {openSub && (
                                                        <TableContainer
                                                            component={Paper}
                                                            sx={{
                                                                ml: { xs: 2, md: 6 },
                                                                mb: 1,
                                                                maxHeight: 300,

                                                                /* ✅ KEY FIX */
                                                                overflowX: "auto",
                                                                overflowY: "auto",
                                                                width: "100%",
                                                            }}
                                                        >
                                                            <Table
                                                                size="small"
                                                                sx={{
                                                                    /* ✅ VERY IMPORTANT */
                                                                    minWidth: enabledCols.length * 150,
                                                                    tableLayout: "auto",
                                                                }}
                                                            >
                                                                <TableHead>
                                                                    <TableRow
                                                                        sx={{
                                                                            position: "sticky",
                                                                            top: 0,
                                                                            background: "#f8fafc",
                                                                            zIndex: 2,
                                                                        }}
                                                                    >
                                                                        {enabledCols.map(col => (
                                                                            <TableCell
                                                                                key={col.key}
                                                                                sx={{
                                                                                    fontWeight: 700,
                                                                                    textTransform: "uppercase",
                                                                                    fontSize: "12px",
                                                                                    borderBottom: "2px solid #cbd5e1",
                                                                                    textAlign:
                                                                                        col.key === "debit_amount"
                                                                                            ? "right"
                                                                                            : "left",

                                                                                    /* ✅ FIXED WIDTHS (NO AUTO) */
                                                                                    minWidth:
                                                                                        col.key === "debit_amount"
                                                                                            ? 120
                                                                                            : col.key === "transaction_type"
                                                                                                ? 140
                                                                                                : col.key === "remarks"
                                                                                                    ? 300
                                                                                                    : 150,

                                                                                    maxWidth:
                                                                                        col.key === "remarks" ? 300 : "none",

                                                                                    /* ✅ TEXT CONTROL */
                                                                                    whiteSpace:
                                                                                        col.key === "remarks"
                                                                                            ? "normal"
                                                                                            : "nowrap",
                                                                                    wordBreak:
                                                                                        col.key === "remarks"
                                                                                            ? "break-word"
                                                                                            : "normal",
                                                                                }}
                                                                            >
                                                                                {col.label}
                                                                            </TableCell>
                                                                        ))}
                                                                    </TableRow>
                                                                </TableHead>

                                                                <TableBody>
                                                                    {sub.ledgers.map((row: any) => (
                                                                        <TableRow key={row.pay_id} hover>
                                                                            {enabledCols.map(col => (
                                                                                <TableCell
                                                                                    key={col.key}
                                                                                    sx={{
                                                                                        textAlign:
                                                                                            col.key === "debit_amount"
                                                                                                ? "right"
                                                                                                : "left",

                                                                                        minWidth:
                                                                                            col.key === "debit_amount"
                                                                                                ? 120
                                                                                                : col.key === "transaction_type"
                                                                                                    ? 140
                                                                                                    : col.key === "remarks"
                                                                                                        ? 300
                                                                                                        : 150,

                                                                                        maxWidth:
                                                                                            col.key === "remarks"
                                                                                                ? 300
                                                                                                : "none",

                                                                                        whiteSpace:
                                                                                            col.key === "remarks"
                                                                                                ? "normal"
                                                                                                : "nowrap",

                                                                                        wordBreak:
                                                                                            col.key === "remarks"
                                                                                                ? "break-word"
                                                                                                : "normal",
                                                                                    }}
                                                                                >
                                                                                    {col.key === "debit_amount"
                                                                                        ? formatINR(row[col.key])
                                                                                        : col.key === "payment_date"
                                                                                            ? dayjs(row[col.key]).format("DD-MM-YYYY")
                                                                                            : row[col.key]}
                                                                                </TableCell>
                                                                            ))}
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                    )}

                                                </Box>
                                            );
                                        })}

                                    </Box>
                                );
                            })}

                            {/* LOADING */}
                            {loading && (
                                <Box textAlign="center" mt={2}>
                                    <CircularProgress size={25} />
                                </Box>
                            )}
                        </Box>
                    )}

                </Box>
            </AppLayout>

            {/* COLUMN SETTINGS */}
            <Menu
                anchorEl={settingsAnchor}
                open={Boolean(settingsAnchor)}
                onClose={() => setSettingsAnchor(null)}
            >
                <Box p={2} minWidth={300}>

                    {/* HEADER */}
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography fontWeight={600}>Column Settings</Typography>

                        <Button
                            size="small"
                            onClick={() => {
                                setColumns(cols =>
                                    cols.map((c, i) => ({
                                        ...c,
                                        enabled: DEFAULT_ENABLED.includes(c.key),
                                        order: i
                                    }))
                                );
                            }}
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
                                    <SortRow
                                        key={c.key}
                                        col={c}
                                        toggle={(key: string) =>
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
                                    <SortRow
                                        key={c.key}
                                        col={c}
                                        toggle={(key: string) =>
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

export default ExpensesReport;