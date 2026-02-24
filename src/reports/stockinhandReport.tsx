import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs from "dayjs";
import AppLayout, { useToggleMode } from "../Layout/appLayout";
import PageHeader from "../Layout/PageHeader";
import CommonPagination from "../Components/CommonPagination";
import ReportFilterDrawer from "../Components/ReportFilterDrawer";
import { exportToPDF } from "../utils/exportToPDF";
import { exportToExcel } from "../utils/exportToExcel";
import { mapForExport } from "../utils/exportMapper";
import { useNavigate } from "react-router-dom";
import {
    itemwisestockreportservice,
    godownwisestockreportservice,
    stockGroupingService,
    StockGroupConfig,
    stockWiseReport,
} from "../services/stockWiseReport.service";

const ROWS_PER_PAGE = 25;

/* ================= UTIL ================= */

const sum = (rows: stockWiseReport[], key: keyof stockWiseReport) =>
    rows.reduce((s, r) => s + Number(r[key] || 0), 0);

/* ================= COMPONENT ================= */

type Level2Meta = {
    columnName: string;
    type: number;
};

const StockInHandReport: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");
    const { toggleMode, setToggleMode } = useToggleMode();
    const isExpanded = toggleMode === "Expanded";
    const [rawData, setRawData] = useState<stockWiseReport[]>([]);
    const [groupConfig, setGroupConfig] = useState<StockGroupConfig[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [page, setPage] = useState(1);
    const navigate = useNavigate();

    /* ===== FILTER STATES ===== */

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [level1Options, setLevel1Options] = useState<
        { value: string; label: string }[]
    >([]);
    const [level1Column, setLevel1Column] = useState<string>("");
    const [selectedLevel1, setSelectedLevel1] = useState<string | number>("");


    const [selectedLevel2, setSelectedLevel2] = useState<string[]>([]);

    /* ===== LEVEL 2 META (FROM CONFIG) ===== */

    const [level2Meta, setLevel2Meta] = useState<Level2Meta[]>([]);
    const [level2TypeOrder, setLevel2TypeOrder] = useState<number[]>([]);
    const [selectedLevel2ByType, setSelectedLevel2ByType] =
        useState<Record<number, string>>({});
    /* ================= GROUP CONFIG ================= */

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalHeight = document.body.style.height;

        // ✅ Enable page scroll for this screen
        document.body.style.overflow = "auto";
        document.body.style.height = "auto";

        return () => {
            // 🔁 Restore when leaving the page
            document.body.style.overflow = originalOverflow;
            document.body.style.height = originalHeight;
        };
    }, []);


    useEffect(() => {
        const reportName = isExpanded
            ? "StockInhand-Godown"
            : "StockInhand";

        stockGroupingService
            .getGroupingConfig(reportName)
            .then((res) => {
                const cfg = res.data.data || [];

                // GROUPING
                setGroupConfig(
                    cfg
                        .filter(g => g.isGroupFilter)
                        .sort((a, b) => (a.Level_Id ?? 0) - (b.Level_Id ?? 0))
                );

                // LEVEL 1 FILTER
                const level1Filter = cfg.find(
                    g => g.FilterLevel === 1 && g.isGroupFilter === false
                );

                if (level1Filter) {
                    setLevel1Options(level1Filter.options || []);
                    setLevel1Column(level1Filter.columnName);
                } else {
                    setLevel1Options([]);
                    setLevel1Column("");
                }

                // LEVEL 2 FILTER (CASCADING META)
                const lvl2 = cfg.filter(
                    g => g.FilterLevel === 2 && g.isGroupFilter === false
                );

                const meta: Level2Meta[] = lvl2
                    .filter(l => l.filterType)
                    .map(l => ({
                        columnName: l.columnName,
                        type: Number(l.filterType),
                    }));

                setLevel2Meta(meta);

                const orderedTypes = Array.from(
                    new Set(meta.map(m => m.type))
                ).sort((a, b) => a - b);

                setLevel2TypeOrder(orderedTypes);
                setSelectedLevel2ByType({});
            });

        // optional cleanup not required
    }, [toggleMode]);


    useEffect(() => {
        if (!level1Column) return;

        loadData();
        setSelectedLevel2([]);
        setExpanded({});
        setPage(1);
    }, [selectedLevel1]);


    /* ================= LOAD DATA ================= */

    const loadData = () => {
        const api = isExpanded
            ? godownwisestockreportservice.getGodownwiseReports
            : itemwisestockreportservice.getItemwiseReports;

        // Map selectedLevel1 (value/id) → label string
        const level1Label = level1Options.find(opt => opt.value === selectedLevel1)?.label;

        const payload: any = {
            Fromdate: fromDate,
            Todate: toDate,
        };

        if (level1Column && level1Label) {
            payload[level1Column] = level1Label;
        }

        api(payload).then(res => {
            setRawData(res.data.data || []);
            setExpanded({});
            setPage(1);
        });
    };

    useEffect(() => {
        loadData();
    }, [toggleMode]);

    /* ================= LEVEL 2 FILTER ================= */

    const data = useMemo(() => {
        let filtered = rawData;

        // LEVEL 1 FILTER
        if (selectedLevel1 && level1Column) {
            const level1Label =
                level1Options.find(opt => opt.value === selectedLevel1)?.label;

            filtered = filtered.filter(
                r => String(r[level1Column]) === String(level1Label)
            );
        }

        // LEVEL 2 FILTER (CASCADING)
        level2TypeOrder.forEach(type => {
            const selected = selectedLevel2ByType[type];
            if (!selected) return;

            const meta = level2Meta.find(m => m.type === type);
            if (!meta) return;

            filtered = filtered.filter(
                r => String(r[meta.columnName]) === String(selected)
            );
        });

        return filtered;
    }, [
        rawData,
        selectedLevel1,
        level1Column,
        level1Options,
        level2TypeOrder,
        level2Meta,
        selectedLevel2ByType
    ]);

    const handleTransactionClick = (
        row: stockWiseReport,
        mode: "ABSTRACT" | "EXPANDED"
    ) => {
        navigate(
            mode === "EXPANDED"
                // ? "/reports/godown-item-transaction"
                ? "/reports/item-transaction"
                : "/reports/item-transaction",
            {
                state: {
                    ProductId: Number(row.Product_Id),
                    productName: row.stock_item_name,
                    fromDate,
                    toDate,
                    // Godown_Id: mode === "EXPANDED" ? row.Godown_Id : undefined,
                    // godownName: mode === "EXPANDED" ? row.Godown_Name : undefined,
                }
            }
        );
    };


    useEffect(() => {
        setExpanded({});
        setPage(1);
    }, [selectedLevel2]);

    /* ================= GROUPING ================= */

    const buildGroups = (rows: stockWiseReport[], level: number): any[] => {
        const cfg = groupConfig[level];
        if (!cfg) return [];

        const map: Record<string, stockWiseReport[]> = {};
        rows.forEach((r: any) => {
            const key = r[cfg.columnName] || "Others";
            map[key] ||= [];
            map[key].push(r);
        });

        return Object.entries(map).map(([key, children]) => ({
            key,
            rows: children,
            level,
            children:
                level + 1 < groupConfig.length
                    ? buildGroups(children, level + 1)
                    : [],
        }));
    };

    // ✅ BASE DATA FOR LEVEL-2 CHIPS (MOBILE PARITY)
    const level1FilteredData = useMemo(() => {
        if (!selectedLevel1 || !level1Column) return rawData;

        const level1Label =
            level1Options.find(opt => opt.value === selectedLevel1)?.label;

        if (!level1Label) return rawData;

        return rawData.filter(
            r => String(r[level1Column]) === String(level1Label)
        );
    }, [rawData, selectedLevel1, level1Column, level1Options]);


    /* ===== GODOWN FIRST (EXPANDED MODE) ===== */
    const computeLevel2Values = (
        columnName: string,
        parent?: { column: string; value: string }
    ) => {
        const map = new Map<string, number>();

        level1FilteredData.forEach((r: any) => {
            if (parent) {
                if (String(r[parent.column]) !== parent.value) return;
            }

            const v = r[columnName];
            if (!v) return;

            const qty = Number(r.Bal_Qty || 0);
            map.set(String(v), (map.get(String(v)) || 0) + qty);
        });

        return Array.from(map.entries())
            .map(([value, total]) => ({ value, total }))
            .sort((a, b) => b.total - a.total);
    };


    const finalGroups = useMemo(() => {
        if (!isExpanded) return buildGroups(data, 0);

        const map: Record<string, stockWiseReport[]> = {};
        data.forEach((r: any) => {
            const g = r.Godown_Name || "Unknown";
            map[g] ||= [];
            map[g].push(r);
        });

        return Object.entries(map).map(([key, rows]) => ({
            key,
            rows,
            level: -1,
            children: buildGroups(rows, 0),
        }));
    }, [data, isExpanded, groupConfig]);

    const hasGrouping = groupConfig.length > 0;

    const formatQty = (value: any) =>
        Number(value || 0).toFixed(2);



    const extractBagKg = (row: any): number | null => {
        if (!row?.Bag) return null;

        const kg = parseFloat(String(row.Bag).toLowerCase().replace("kg", "").trim());
        return isNaN(kg) || kg <= 0 ? null : kg;
    };

    const formatBagCount = (value: number, decimals = 2) =>
        Number(value).toFixed(decimals);

    const formatQtyWithBag = (qty: string | number, row: any) => {
        const q = Number(qty || 0);
        const bagKg = extractBagKg(row);

        if (!bagKg) {
            return q.toFixed(2);
        }

        const bags = q / bagKg;

        return `${q.toFixed(2)} (${formatBagCount(bags)})`;
    };

    const getTotalBagCount = (rows: any[], qtyKey: keyof stockWiseReport) => {
        let totalBags = 0;
        let hasBag = false;

        rows.forEach(r => {
            const qty = Number(r[qtyKey] || 0);
            const bagKg = extractBagKg(r);

            if (bagKg && bagKg > 0) {
                totalBags += qty / bagKg;
                hasBag = true;
            }
        });

        if (!hasBag) return null;

        return Number(totalBags.toFixed(2));
    };


    const formatTotalQtyWithBag = (
        qty: number,
        rows: stockWiseReport[],
        qtyKey: keyof stockWiseReport
    ) => {
        const q = Number(qty || 0);
        const bags = getTotalBagCount(rows, qtyKey);

        if (!bags) {
            return q.toFixed(2);
        }

        return `${q.toFixed(2)} (${bags})`;
    };


    const flattenGroupsForExport = (groups: any[], parentKeys: Record<string, string> = {}, isExpandedMode = isExpanded): any[] => {
        const result: any[] = [];

        groups.forEach(g => {
            const keys = { ...parentKeys };

            if (isExpandedMode && g.level === -1) {
                keys["Godown"] = g.key;
            } else if (g.level >= 0) {
                keys[`Group ${g.level + 1}`] = g.key;
            }

            if (g.children?.length) {
                result.push(...flattenGroupsForExport(g.children, keys, isExpandedMode));
            } else {
                g.rows.forEach((r: stockWiseReport) => {
                    result.push({
                        ...keys,
                        Item: r.stock_item_name,
                        Opening: r.OB_Bal_Qty,
                        In: r.Pur_Qty,
                        Out: r.Sal_Qty,
                        Closing: r.Bal_Qty,
                    });
                });
            }
        });

        return result;
    };

    const ABSTRACT_COLUMNS = [
        { header: "Group 1", key: "Group 1" },
        { header: "Group 2", key: "Group 2" },
        { header: "Group 3", key: "Group 3" },
        { header: "Item", key: "Item" },
        { header: "Opening", key: "Opening" },
        { header: "In", key: "In" },
        { header: "Out", key: "Out" },
        { header: "Closing", key: "Closing" },
    ];

    const EXPANDED_COLUMNS = [
        { header: "Godown", key: "Godown" },
        { header: "Group 1", key: "Group 1" },
        { header: "Group 2", key: "Group 2" },
        { header: "Group 3", key: "Group 3" },
        { header: "Item", key: "Item" },
        { header: "Opening", key: "Opening" },
        { header: "In", key: "In" },
        { header: "Out", key: "Out" },
        { header: "Closing", key: "Closing" },
    ];

    const handleExportPDF = () => {
        const rows = flattenGroupsForExport(finalGroups);
        const columns = isExpanded ? EXPANDED_COLUMNS : ABSTRACT_COLUMNS;

        const { headers, data: mappedData } = mapForExport(columns, rows);
        exportToPDF(`Stock in Hand (${toggleMode})`, headers, mappedData);
    };

    const handleExportExcel = () => {
        const rows = flattenGroupsForExport(finalGroups);
        const columns = isExpanded ? EXPANDED_COLUMNS : ABSTRACT_COLUMNS;

        const { headers, data: mappedData } = mapForExport(columns, rows);
        exportToExcel(`Stock in Hand (${toggleMode})`, headers, mappedData);
    };


    /* ================= ITEM TABLE ================= */

    const paginated = (rows: stockWiseReport[]) =>
        rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    /* ================= ITEM TABLE ================= */

    const renderItemTable = (
        rows: stockWiseReport[],
        mode: "ABSTRACT" | "EXPANDED" = "ABSTRACT"
    ) => {
        const pageRows = paginated(rows);

        // ✅ TOTALS (full filtered rows, NOT paginated)
        const totalOpening = sum(rows, "OB_Bal_Qty");
        const totalIn = sum(rows, "Pur_Qty");
        const totalOut = sum(rows, "Sal_Qty");
        const totalClosing = sum(rows, "Bal_Qty");

        return (
            <Table size="small">
                <TableHead sx={{ background: "#1E3A8A" }}>
                    <TableRow>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }}>S.No</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }}>Item</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">
                            Opening
                        </TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">
                            In
                        </TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">
                            Out
                        </TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">
                            Closing
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {/* ✅ TOTAL ROW — directly below header */}
                    <TableRow sx={{ background: "#F1F5F9", fontWeight: 700 }}>
                        <TableCell colSpan={2}>TOTAL</TableCell>

                        <TableCell align="right">
                            {formatTotalQtyWithBag(totalOpening, rows, "OB_Bal_Qty")}
                        </TableCell>

                        <TableCell align="right">
                            {formatTotalQtyWithBag(totalIn, rows, "Pur_Qty")}
                        </TableCell>

                        <TableCell align="right">
                            {formatTotalQtyWithBag(totalOut, rows, "Sal_Qty")}
                        </TableCell>

                        <TableCell align="right">
                            {formatTotalQtyWithBag(totalClosing, rows, "Bal_Qty")}
                        </TableCell>
                    </TableRow>

                    {/* ✅ ITEM ROWS */}
                    {pageRows.map((r, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                {(page - 1) * ROWS_PER_PAGE + i + 1}
                            </TableCell>
                            <TableCell
                                sx={{
                                    cursor: "pointer",
                                    color: "#1D4ED8",
                                    fontWeight: 600,
                                    "&:hover": { textDecoration: "underline" },
                                }}
                                onClick={() => handleTransactionClick(r, mode)}
                            >
                                {r.stock_item_name}
                            </TableCell>
                            <TableCell align="right">
                                {formatQtyWithBag(r.OB_Bal_Qty, r)}
                            </TableCell>
                            <TableCell align="right">
                                {formatQtyWithBag(r.Pur_Qty, r)}
                            </TableCell>
                            <TableCell align="right">
                                {formatQtyWithBag(r.Sal_Qty, r)}
                            </TableCell>
                            <TableCell align="right">
                                {formatQtyWithBag(r.Bal_Qty, r)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };


    /* ================= GROUP ROWS ================= */

    const renderGroups = (groups: any[]) =>
        groups.map((g) => {
            const id = `${g.level}-${g.key}`;
            const open = expanded[id];

            return (
                <React.Fragment key={id}>
                    <TableRow sx={{ background: "#F1F5F9" }}>
                        <TableCell width={40}>
                            <IconButton
                                size="small"
                                onClick={() =>
                                    setExpanded((p) => ({ ...p, [id]: !p[id] }))
                                }
                            >
                                {open ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                        </TableCell>

                        <TableCell sx={{ fontWeight: 600 }}>{g.key}</TableCell>
                        <TableCell align="right">{g.rows.length}</TableCell>
                        <TableCell align="right">
                            {formatTotalQtyWithBag(
                                sum(g.rows, "Bal_Qty"),
                                g.rows,
                                "Bal_Qty"
                            )}
                        </TableCell>
                    </TableRow>

                    {open && (
                        <TableRow>
                            {/* colSpan should cover all columns including icon + totals */}
                            <TableCell colSpan={6} sx={{ pl: 4 }}>
                                {g.children.length
                                    ? (
                                        <Table size="small">
                                            <TableBody>{renderGroups(g.children)}</TableBody>
                                        </Table>
                                    )
                                    : renderItemTable(g.rows, isExpanded ? "EXPANDED" : "ABSTRACT")}
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
            );
        });

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
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
            />

            <ReportFilterDrawer
                open={drawerOpen}
                onToggle={() => setDrawerOpen(prev => !prev)}
                onClose={() => setDrawerOpen(false)}
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                dropdownLabel="Filter Level 1"
                dropdownValue={selectedLevel1}
                dropdownOptions={level1Options}
                onDropdownChange={setSelectedLevel1}
                onApply={() => {
                    loadData();
                    setDrawerOpen(false);
                }}
            />

            <AppLayout fullWidth>
                {/* LEVEL 2 CHIPS */}
                <Box
                    sx={{
                        maxHeight: 180,
                        overflowY: "auto",
                        px: 1,
                        py: 1,
                        borderBottom: "1px solid #E5E7EB",
                        background: "#F8FAFC",
                    }}
                >
                    {level2TypeOrder.map((type, idx) => {
                        const meta = level2Meta.find(m => m.type === type);
                        if (!meta) return null;

                        let parent;
                        if (idx > 0) {
                            const parentType = level2TypeOrder[idx - 1];
                            const parentValue = selectedLevel2ByType[parentType];
                            if (!parentValue) return null;

                            const parentMeta = level2Meta.find(m => m.type === parentType);
                            if (parentMeta) {
                                parent = {
                                    column: parentMeta.columnName,
                                    value: parentValue,
                                };
                            }
                        }

                        const values = computeLevel2Values(meta.columnName, parent);
                        if (!values.length) return null;

                        const selected = selectedLevel2ByType[type];

                        return (
                            <Box
                                key={type}
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                {/* ALL */}
                                <Box
                                    onClick={() => {
                                        setSelectedLevel2ByType(prev => {
                                            const copy = { ...prev };
                                            delete copy[type];
                                            level2TypeOrder.forEach(t => t > type && delete copy[t]);
                                            return copy;
                                        });
                                    }}
                                    sx={{
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        background: !selected ? "#1E3A8A" : "#E5E7EB",
                                        color: !selected ? "#fff" : "#111",
                                    }}
                                >
                                    ALL
                                </Box>

                                {values.map(v => (
                                    <Box
                                        key={v.value}
                                        onClick={() => {
                                            setSelectedLevel2ByType(prev => {
                                                const copy = { ...prev, [type]: v.value };
                                                level2TypeOrder.forEach(t => t > type && delete copy[t]);
                                                return copy;
                                            });
                                        }}
                                        sx={{
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: "16px",
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            background:
                                                selected === v.value ? "#1E3A8A" : "#E5E7EB",
                                            color:
                                                selected === v.value ? "#fff" : "#111",
                                        }}
                                    >
                                        {v.value} ({formatQty(v.total)})
                                    </Box>
                                ))}
                            </Box>
                        );
                    })}
                </Box>

                <Paper
                    sx={{
                        mx: 1,
                        display: "flex",
                        flexDirection: "column",
                        maxHeight: "calc(100vh - 130px)",
                        overflow: "visible",
                    }}
                >
                    <TableContainer >
                        {hasGrouping ? (
                            /* ===== GROUPING MODE ===== */
                            <Table size="small">
                                <TableHead sx={{ background: "#1E3A8A" }}>
                                    <TableRow>
                                        <TableCell />
                                        <TableCell sx={{ color: "#fff" }}>Name</TableCell>
                                        <TableCell sx={{ color: "#fff" }} align="right">
                                            Items
                                        </TableCell>
                                        <TableCell sx={{ color: "#fff" }} align="right">
                                            Balance
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {renderGroups(finalGroups)}
                                </TableBody>
                            </Table>
                        ) : (
                            renderItemTable(data)
                        )}
                    </TableContainer>

                </Paper>

                <CommonPagination
                    totalRows={data.length}
                    page={page}
                    onPageChange={setPage}
                />
            </AppLayout>
        </>
    );
};

export default StockInHandReport;
