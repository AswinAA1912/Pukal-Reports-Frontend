import React, { useEffect, useState, useMemo } from "react";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Button,
    CircularProgress,
    Grid,
} from "@mui/material";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import PageHeader from "../../Layout/PageHeader";
import ReportFilterDrawer from "../../Components/ReportFilterDrawer";
import { cashboxService, CashBoxItem } from "../../services/cashbox.service";

const formatINR = (v: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(v);

const normalizeStr = (s: any) => String(s ?? "").trim().toLowerCase();

const CashBoxReport: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");

    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [filters, setFilters] = useState({
        Date: { from: today, to: today },
    });

    const [items, setItems] = useState<CashBoxItem[]>([]);
    const [selectedCashBox, setSelectedCashBox] = useState<string>("All");

    // Fetch transactions
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await cashboxService.getCashBoxReport({
                Fromdate: filters.Date.from,
                Todate: filters.Date.to,
            });
            setItems(res || []);
        } catch {
            toast.error("Failed to load cash box data ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.Date.from, filters.Date.to]);

    // Unique cash box Group_Names from items
    const cashBoxes = useMemo(() => {
        const groups = new Set<string>();
        items.forEach((item) => {
            if (item.Group_Name) {
                groups.add(item.Group_Name.trim());
            }
        });
        return Array.from(groups);
    }, [items]);

    // Parse Debit and Credit lists based on selection
    const parsedData = useMemo(() => {
        const isAll = selectedCashBox === "All";
        const normSel = normalizeStr(selectedCashBox);

        const filtered = items.filter((x) => {
            if (isAll) return true;
            return normalizeStr(x.Group_Name) === normSel;
        });

        const debitList = filtered.filter((x) => normalizeStr(x.CR_DR) === "dr" && x.Dr_Amount > 0);
        const creditList = filtered.filter((x) => normalizeStr(x.CR_DR) === "cr" && x.Cr_Amount > 0);

        // Compute opening total
        const opening = filtered.reduce((sum, x) => {
            const val = Number(String(x.OB_Amount || "").replace(/[^\d\.]/g, "")) || 0;
            return sum + val;
        }, 0);

        // Compute closing total
        const closing = filtered.reduce((sum, x) => {
            return sum + Math.abs(x.Bal_Amount || 0);
        }, 0);

        return {
            debitList,
            creditList,
            opening,
            closing,
        };
    }, [items, selectedCashBox]);

    // Excel Export
    const handleExportExcel = () => {
        try {
            const excelData: any[][] = [];
            const dateStr =
                filters.Date.from === filters.Date.to
                    ? dayjs(filters.Date.from).format("DD-MM-YYYY")
                    : `${dayjs(filters.Date.from).format("DD-MM-YYYY")} TO ${dayjs(filters.Date.to).format("DD-MM-YYYY")}`;

            excelData.push([`CASH BOX TRANSACTION - ${dateStr}`]);
            excelData.push([`Group Filter: ${selectedCashBox}`]);
            excelData.push([]);

            // Headers
            excelData.push([
                "S.No (Debit)",
                "Particulars (Debit)",
                "Debit Amount",
                "",
                "S.No (Credit)",
                "Particulars (Credit)",
                "Credit Amount",
            ]);

            // Debit Rows
            const debitRows = parsedData.debitList.map((x, idx) => [
                idx + 1,
                x.Account_name,
                x.Dr_Amount,
            ]);

            // Credit Rows (with OPENING and CLOSING)
            const creditRows: any[][] = [];
            creditRows.push(["", "OPENING", parsedData.opening]);
            parsedData.creditList.forEach((x, idx) => {
                creditRows.push([idx + 1, x.Account_name, x.Cr_Amount]);
            });
            creditRows.push(["", "CLOSING", parsedData.closing]);

            // Combine both sides parallel
            const maxLen = Math.max(debitRows.length, creditRows.length);
            for (let i = 0; i < maxLen; i++) {
                const dr = debitRows[i] || ["", "", ""];
                const cr = creditRows[i] || ["", "", ""];
                excelData.push([dr[0], dr[1], dr[2], "", cr[0], cr[1], cr[2]]);
            }

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();

            ws["!cols"] = [
                { wch: 12 },
                { wch: 25 },
                { wch: 15 },
                { wch: 5 },
                { wch: 12 },
                { wch: 25 },
                { wch: 15 },
            ];

            XLSX.utils.book_append_sheet(wb, ws, "CashBox Report");
            XLSX.writeFile(wb, `CashBox_Report_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
            toast.success("Excel Exported ✅");
        } catch (err) {
            console.error(err);
            toast.error("Excel Export Failed ❌");
        }
    };

    // PDF Export
    const handleExportPDF = () => {
        try {
            const doc = new jsPDF("landscape", "mm", "a4");
            const dateStr =
                filters.Date.from === filters.Date.to
                    ? dayjs(filters.Date.from).format("DD-MM-YYYY")
                    : `${dayjs(filters.Date.from).format("DD-MM-YYYY")} TO ${dayjs(filters.Date.to).format("DD-MM-YYYY")}`;

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`CASH BOX TRANSACTION - ${dateStr}`, 148, 12, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Group Filter: ${selectedCashBox}`, 14, 18);

            const debitPdfRows = parsedData.debitList.map((x, idx) => [
                idx + 1,
                x.Account_name,
                formatINR(x.Dr_Amount),
            ]);

            const creditPdfRows: any[][] = [];
            creditPdfRows.push(["", "OPENING", formatINR(parsedData.opening)]);
            parsedData.creditList.forEach((x, idx) => {
                creditPdfRows.push([idx + 1, x.Account_name, formatINR(x.Cr_Amount)]);
            });
            creditPdfRows.push(["", "CLOSING", formatINR(parsedData.closing)]);

            const tableStartY = 24;

            autoTable(doc, {
                startY: tableStartY,
                margin: { left: 14, right: 152 },
                tableWidth: 130,
                head: [["S.No", "Particulars (Debit)", "Debit Amount"]],
                body: debitPdfRows,
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
                theme: "grid",
            });

            autoTable(doc, {
                startY: tableStartY,
                margin: { left: 152, right: 14 },
                tableWidth: 130,
                head: [["S.No", "Particulars (Credit)", "Credit Amount"]],
                body: creditPdfRows,
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
                theme: "grid",
            });

            doc.save(`CashBox_Report_${dayjs().format("YYYYMMDD_HHmmss")}.pdf`);
            toast.success("PDF Exported ✅");
        } catch (err) {
            console.error(err);
            toast.error("PDF Export Failed ❌");
        }
    };

    return (
        <Box sx={{ width: "100%", overflowX: "hidden" }}>
            <PageHeader
                onExportExcel={handleExportExcel}
                onExportPDF={handleExportPDF}
                showPages={true}
            />

            {/* Filter Drawer Toggle */}
            <ReportFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onToggle={() => setDrawerOpen((p) => !p)}
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onApply={() => setFilters({ Date: { from: fromDate, to: toDate } })}
            />

            {/* Pill selector buttons for Cash List */}
            <Box px={2} pt={1} pb={2} display="flex" flexWrap="wrap" gap={1}>
                {["All", ...cashBoxes].map((name) => (
                    <Button
                        key={name}
                        variant={selectedCashBox === name ? "contained" : "outlined"}
                        onClick={() => setSelectedCashBox(name)}
                        sx={{
                            borderRadius: "20px",
                            textTransform: "none",
                            px: 3,
                            py: 0.5,
                            fontSize: "0.8rem",
                            borderColor: selectedCashBox === name ? "#1E3A8A" : "#cbd5e1",
                            color: selectedCashBox === name ? "#fff" : "#475569",
                            backgroundColor: selectedCashBox === name ? "#1E3A8A" : "transparent",
                            "&:hover": {
                                backgroundColor: selectedCashBox === name ? "#1e40af" : "#f1f5f9",
                                borderColor: selectedCashBox === name ? "#1e40af" : "#94a3b8",
                            },
                        }}
                    >
                        {name}
                    </Button>
                ))}
            </Box>

            {/* Main transaction display */}
            <Box px={2} pb={4}>
                {loading ? (
                    <Box display="flex" justifyContent="center" py={10}>
                        <CircularProgress size={40} sx={{ color: "#1E3A8A" }} />
                    </Box>
                ) : (
                    <>
                        {/* Transaction Header Banner */}
                        <Box
                            sx={{
                                border: "1px solid #cbd5e1",
                                borderRadius: 1.5,
                                py: 1.2,
                                textAlign: "center",
                                mb: 3,
                                background: "#f8fafc",
                            }}
                        >
                            <Typography variant="body1" fontWeight={700} sx={{ letterSpacing: 0.5, color: "#1e293b" }}>
                                CASH BOX TRANSACTION -{" "}
                                {filters.Date.from === filters.Date.to
                                    ? dayjs(filters.Date.from).format("DD-MM-YYYY")
                                    : `${dayjs(filters.Date.from).format("DD-MM-YYYY")} TO ${dayjs(filters.Date.to).format("DD-MM-YYYY")}`}
                            </Typography>
                        </Box>

                        {/* Side-by-side Tables */}
                        <Grid container spacing={3}>
                            {/* Left Side: Debit Table */}
                            <Grid item xs={12} md={6}>
                                <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, border: "1px solid #e2e8f0", maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
                                    <Table size="small" sx={{ tableLayout: "fixed" }} stickyHeader>
                                        <TableHead sx={{ backgroundColor: "#1E3A8A" }}>
                                            <TableRow>
                                                <TableCell align="center" sx={{ color: "#fff", fontWeight: 700, width: 60, minWidth: 60, py: 1, backgroundColor: "#1E3A8A" }}>
                                                    S.NO
                                                </TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: 700, py: 1, backgroundColor: "#1E3A8A" }}>
                                                    Particulars
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: "#fff", fontWeight: 700, width: 150, minWidth: 150, py: 1, backgroundColor: "#1E3A8A" }}>
                                                    Debit
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {parsedData.debitList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                                                        No Debit Transactions
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                parsedData.debitList.map((x, idx) => (
                                                    <TableRow key={`${x.Acc_Id}-${idx}`} hover sx={{ backgroundColor: "#f8fafc" }}>
                                                        <TableCell align="center" sx={{ fontWeight: 600, py: 1, width: 60, minWidth: 60 }}>
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, pl: 3 }}>
                                                            <Typography variant="body2" fontWeight={600} color="#1e293b">
                                                                {x.Account_name}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: "#0f766e", py: 1, width: 150, minWidth: 150 }}>
                                                            {formatINR(x.Dr_Amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>

                            {/* Right Side: Credit Table */}
                            <Grid item xs={12} md={6}>
                                <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, border: "1px solid #e2e8f0", maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
                                    <Table size="small" sx={{ tableLayout: "fixed" }} stickyHeader>
                                        <TableHead sx={{ backgroundColor: "#1E3A8A" }}>
                                            <TableRow>
                                                <TableCell align="center" sx={{ color: "#fff", fontWeight: 700, width: 60, minWidth: 60, py: 1, backgroundColor: "#1E3A8A" }}>
                                                    S.NO
                                                </TableCell>
                                                <TableCell sx={{ color: "#fff", fontWeight: 700, py: 1, backgroundColor: "#1E3A8A" }}>
                                                    Particulars
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: "#fff", fontWeight: 700, width: 150, minWidth: 150, py: 1, backgroundColor: "#1E3A8A" }}>
                                                    Credit
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {/* OPENING ROW */}
                                            <TableRow sx={{ backgroundColor: "#fef8ec" }}>
                                                <TableCell sx={{ width: 60, minWidth: 60 }} />
                                                <TableCell sx={{ py: 1 }}>
                                                    <Typography variant="body2" fontWeight={700} color="#b45309" sx={{ pl: 3.2 }}>
                                                        OPENING
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: "#b45309", py: 1, width: 150, minWidth: 150 }}>
                                                    {formatINR(parsedData.opening)}
                                                </TableCell>
                                            </TableRow>

                                            {parsedData.creditList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                                                        No Credit Transactions
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                parsedData.creditList.map((x, idx) => (
                                                    <TableRow key={`${x.Acc_Id}-${idx}`} hover sx={{ backgroundColor: "#f8fafc" }}>
                                                        <TableCell align="center" sx={{ fontWeight: 600, py: 1, width: 60, minWidth: 60 }}>
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, pl: 3 }}>
                                                            <Typography variant="body2" fontWeight={600} color="#1e293b">
                                                                {x.Account_name}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: "#be123c", py: 1, width: 150, minWidth: 150 }}>
                                                            {formatINR(x.Cr_Amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}

                                            {/* CLOSING ROW */}
                                            <TableRow sx={{ backgroundColor: "#f0fdf4" }}>
                                                <TableCell sx={{ width: 60, minWidth: 60 }} />
                                                <TableCell sx={{ py: 1 }}>
                                                    <Typography variant="body2" fontWeight={700} color="#15803d" sx={{ pl: 3.2 }}>
                                                        CLOSING
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: "#15803d", py: 1, width: 150, minWidth: 150 }}>
                                                    {formatINR(parsedData.closing)}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                        </Grid>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default CashBoxReport;
