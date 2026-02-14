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

const StockInHandReport: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");
    const { toggleMode, setToggleMode } = useToggleMode();
    const isExpanded = toggleMode === "Expanded";

    const [rawData, setRawData] = useState<stockWiseReport[]>([]);
    const [groupConfig, setGroupConfig] = useState<StockGroupConfig[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [page, setPage] = useState(1);

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

    const [level2Options, setLevel2Options] = useState<
        { value: string; label: string }[]
    >([]);
    const [level2Column, setLevel2Column] = useState<string>("");
    /* ================= GROUP CONFIG ================= */

    useEffect(() => {
        const reportName = isExpanded
            ? "StockInhand-Godown"
            : "StockInhand";

        stockGroupingService.getGroupingConfig(reportName).then((res) => {
            const cfg = res.data.data || [];

            // GROUPING
            setGroupConfig(
                cfg
                    .filter(g => g.isGroupFilter)
                    .sort((a, b) => (a.Level_Id ?? 0) - (b.Level_Id ?? 0))
            );

            // ✅ LEVEL 1 FILTER
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

            // ✅ LEVEL 2 FILTER
            const level2Filter = cfg.find(
                g => g.FilterLevel === 2 && g.isGroupFilter === false
            );

            if (level2Filter) {
                setLevel2Options(level2Filter.options || []);
                setLevel2Column(level2Filter.columnName);
            } else {
                setLevel2Options([]);
                setLevel2Column("");
            }

            setSelectedLevel1("");
            setSelectedLevel2([]);
            setExpanded({});
            setPage(1);
        });
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
            payload[level1Column] = level1Label; // ✅ pass label/string to API
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
            const level1Label = level1Options.find(opt => opt.value === selectedLevel1)?.label;
            filtered = filtered.filter(r => r[level1Column] === level1Label);
        }

        // LEVEL 2 FILTER
        if (selectedLevel2.length && level2Column) {
            filtered = filtered.filter(r => selectedLevel2.includes(String(r[level2Column])));
        }

        return filtered;
    }, [rawData, selectedLevel1, selectedLevel2, level1Column, level2Column, level1Options]);

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

    /* ===== GODOWN FIRST (EXPANDED MODE) ===== */

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

    const formatQty = (value: any) =>
        Number(value || 0).toFixed(2);


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

    const renderItemTable = (rows: stockWiseReport[]) => {
        const pageRows = paginated(rows);

        return (
            <Table size="small">
                <TableHead sx={{ background: "#1E3A8A" }}>
                    <TableRow>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }}>S.No</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }}>Item</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">Opening</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">In</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">Out</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="right">Closing</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {pageRows.map((r, i) => (
                        <TableRow key={i}>
                            <TableCell>{(page - 1) * ROWS_PER_PAGE + i + 1}</TableCell>
                            <TableCell>{r.stock_item_name}</TableCell>
                            <TableCell align="right">{formatQty(r.OB_Bal_Qty)}</TableCell>
                            <TableCell align="right">{formatQty(r.Pur_Qty)}</TableCell>
                            <TableCell align="right">{formatQty(r.Sal_Qty)}</TableCell>
                            <TableCell align="right">{formatQty(r.Bal_Qty)}</TableCell>
                        </TableRow>
                    ))}

                    <TableRow sx={{ background: "#F8FAFC", fontWeight: 700 }}>
                        <TableCell colSpan={2}>TOTAL</TableCell>
                        <TableCell align="right">{formatQty(sum(rows, "OB_Bal_Qty"))}</TableCell>
                        <TableCell align="right">{formatQty(sum(rows, "Pur_Qty"))}</TableCell>
                        <TableCell align="right">{formatQty(sum(rows, "Sal_Qty"))}</TableCell>
                        <TableCell align="right">{formatQty(sum(rows, "Bal_Qty"))}</TableCell>
                    </TableRow>
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
                        <TableCell align="right">{formatQty(sum(g.rows, "Bal_Qty"))}</TableCell>
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
                                    : renderItemTable(g.rows)}
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
                {level2Options.length > 0 && (
                    <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, flexWrap: "wrap", }}>
                        <Box
                            onClick={() => {
                                setSelectedLevel2([]);
                                setExpanded({});
                                setPage(1);
                            }}
                            sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: "16px",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background:
                                    selectedLevel2.length === 0 ? "#1E3A8A" : "#E5E7EB",
                                color:
                                    selectedLevel2.length === 0 ? "#fff" : "#111",
                            }}
                        >
                            ALL
                        </Box>

                        {level2Options.map((opt) => {
                            const active = selectedLevel2.includes(opt.label);

                            return (
                                <Box
                                    key={opt.value}
                                    onClick={() => {
                                        setExpanded({});
                                        setPage(1);
                                        setSelectedLevel2(p =>
                                            active ? p.filter(v => v !== opt.label) : [...p, opt.label]
                                        );
                                    }}
                                    sx={{
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: "16px",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        background: active ? "#1E3A8A" : "#E5E7EB",
                                        color: active ? "#fff" : "#111",
                                    }}
                                >
                                    {opt.label}
                                </Box>
                            );
                        })}
                    </Box>
                )}

                <Paper
                    sx={{
                        mx: 1,
                        display: "flex",
                        flexDirection: "column",
                        height: "calc(100vh - 130px)",
                    }}
                >
                    <TableContainer
                        sx={{
                            flex: 1,
                            overflowY: "auto",
                        }}
                    >
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
                            <TableBody>{renderGroups(finalGroups)}</TableBody>
                        </Table>
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
