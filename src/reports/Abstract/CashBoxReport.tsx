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
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import PageHeader from "../../Layout/PageHeader";
import ReportFilterDrawer from "../../Components/ReportFilterDrawer";
import { cashboxService, CashBoxReportResponse, CashBoxTransaction } from "../../services/cashbox.service";

interface GroupConfig {
    key: string;
    label: string;
    side: "debit" | "credit";
    masterKey: "Cash" | "Bank" | "LedgerGrp" | "DEX" | "IDEX";
}

const DEBIT_GROUPS: GroupConfig[] = [
    { key: "cash_paid", label: "Cash Transfer (Paid)", side: "debit", masterKey: "Cash" },
    { key: "bank_dep", label: "Bank Deposit (Contra)", side: "debit", masterKey: "Bank" },
    { key: "ledger_pay", label: "Ledger Groups (Payment)", side: "debit", masterKey: "LedgerGrp" },
    { key: "dex_deb", label: "Direct Expenses", side: "debit", masterKey: "DEX" },
    { key: "idex_deb", label: "In-Direct Expenses", side: "debit", masterKey: "IDEX" }
];

const CREDIT_GROUPS: GroupConfig[] = [
    { key: "cash_rec", label: "Cash Transfer (Received)", side: "credit", masterKey: "Cash" },
    { key: "bank_rec", label: "Bank Received (Contra)", side: "credit", masterKey: "Bank" },
    { key: "ledger_rec", label: "Ledger Groups (Receipts)", side: "credit", masterKey: "LedgerGrp" },
    { key: "dex_cred", label: "Direct Expenses- Income", side: "credit", masterKey: "DEX" },
    { key: "idex_cred", label: "InDirect Expenses- Income", side: "credit", masterKey: "IDEX" }
];

const CashBoxReport: React.FC = () => {
    const today = dayjs().format("YYYY-MM-DD");

    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [filters, setFilters] = useState({
        Date: { from: today, to: today },
    });

    const [reportData, setReportData] = useState<CashBoxReportResponse | null>(null);

    // Selected groups for multi-select filter
    const [selectedGroups, setSelectedGroups] = useState<string[]>(["All"]);

    // Extract all unique Group Names from Cash dataset only
    const allGroupNames = useMemo(() => {
        if (!reportData) return [];
        const names = new Set<string>();
        (reportData.Cash || []).forEach((acc) => {
            if (acc.Group_Name) {
                names.add(acc.Group_Name.trim());
            }
        });
        return Array.from(names).sort();
    }, [reportData]);

    const handleGroupChipClick = (groupName: string) => {
        if (groupName === "All") {
            setSelectedGroups(["All"]);
            return;
        }

        setSelectedGroups((prev) => {
            const next = prev.filter((g) => g !== "All");
            if (next.includes(groupName)) {
                const updated = next.filter((g) => g !== groupName);
                return updated.length === 0 ? ["All"] : updated;
            } else {
                return [...next, groupName];
            }
        });
    };

    // Expansion state for each group key
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        cash_paid: false,
        cash_rec: false,
        bank_dep: false,
        bank_rec: false,
        ledger_pay: false,
        ledger_rec: false,
        dex_deb: false,
        dex_cred: false,
        idex_deb: false,
        idex_cred: false,
    });

    // Details Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState<{
        accId: string;
        name: string;
        side: "debit" | "credit";
    } | null>(null);

    // Fetch transactions
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await cashboxService.getCashBoxReport({
                Fromdate: filters.Date.from,
                Todate: filters.Date.to,
            });
            if (res && !Array.isArray(res)) {
                setReportData(res);
            } else {
                setReportData(null);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load cash box data ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.Date.from, filters.Date.to]);

    // Format helpers
    const formatNum = (v: number) => {
        if (v === 0) return "-";
        return "₹" + new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(v);
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return "-";
        if (dateStr.includes("T00:00:00")) return "-";
        const d = dayjs(dateStr);
        if (!d.isValid()) return "-";
        return d.format("hh:mm A");
    };

    const toggleGroup = (key: string) => {
        setExpanded((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Get selected Cash Account IDs
    const selectedCashAccIds = useMemo(() => {
        const isFiltered = !selectedGroups.includes("All") && selectedGroups.length > 0;
        return new Set(
            (reportData?.Cash || [])
                .filter((acc) => !isFiltered || (acc.Group_Name && selectedGroups.includes(acc.Group_Name.trim())))
                .map((acc) => acc.Acc_Id)
        );
    }, [reportData, selectedGroups]);

    // Get selected Cash Group IDs
    const selectedGroupIds = useMemo(() => {
        const isFiltered = !selectedGroups.includes("All") && selectedGroups.length > 0;
        return new Set(
            (reportData?.Cash || [])
                .filter((acc) => !isFiltered || (acc.Group_Name && selectedGroups.includes(acc.Group_Name.trim())))
                .map((acc) => acc.Group_Id)
        );
    }, [reportData, selectedGroups]);

    // Filter transactions: keep only those involving the selected Cash Group_Ids, and exclude any transaction with ID 0
    const filteredTransactions = useMemo(() => {
        const allTx = reportData?.Data1 || [];
        
        // Filter out any transaction where Credit_Ac_Id or Debit_Ac_Id is "0" or 0
        const cleanTx = allTx.filter((tx) => {
            const hasZeroCredit = !tx.Credit_Ac_Id || tx.Credit_Ac_Id === "0" || Number(tx.Credit_Ac_Id) === 0;
            const hasZeroDebit = !tx.Debit_Ac_Id || tx.Debit_Ac_Id === "0" || Number(tx.Debit_Ac_Id) === 0;
            return !hasZeroCredit && !hasZeroDebit;
        });

        const isFiltered = !selectedGroups.includes("All") && selectedGroups.length > 0;
        if (!isFiltered) return cleanTx;

        // Map Cash Acc_Id to Group_Id
        const cashAccIdToGroupId = new Map(
            (reportData?.Cash || []).map((acc) => [acc.Acc_Id, acc.Group_Id])
        );

        return cleanTx.filter((tx) => {
            const creditGroupId = tx.Credit_Ac_Id ? cashAccIdToGroupId.get(tx.Credit_Ac_Id) : null;
            const debitGroupId = tx.Debit_Ac_Id ? cashAccIdToGroupId.get(tx.Debit_Ac_Id) : null;
            return (
                (creditGroupId && selectedGroupIds.has(creditGroupId)) ||
                (debitGroupId && selectedGroupIds.has(debitGroupId))
            );
        });
    }, [reportData, selectedGroupIds, selectedGroups]);

    // Compute matching opposing account IDs from transactions involving the selected Cash accounts
    const matchingOpposingAccIds = useMemo(() => {
        const opposing = new Set<string>();
        filteredTransactions.forEach((tx) => {
            const isDebitCash = tx.Debit_Ac_Id && selectedCashAccIds.has(tx.Debit_Ac_Id);
            const isCreditCash = tx.Credit_Ac_Id && selectedCashAccIds.has(tx.Credit_Ac_Id);

            if (isDebitCash && tx.Credit_Ac_Id) {
                opposing.add(tx.Credit_Ac_Id);
            }
            if (isCreditCash && tx.Debit_Ac_Id) {
                opposing.add(tx.Debit_Ac_Id);
            }
        });
        return opposing;
    }, [filteredTransactions, selectedCashAccIds]);

    // Calculate groups and balances
    const parsedData = useMemo(() => {
        const obList = reportData?.OB || [];

        const isFiltered = !selectedGroups.includes("All") && selectedGroups.length > 0;

        const cashList = (reportData?.Cash || []).filter(
            (acc) => selectedCashAccIds.has(acc.Acc_Id) || matchingOpposingAccIds.has(acc.Acc_Id)
        );
        const bankList = (reportData?.Bank || []).filter(
            (acc) => matchingOpposingAccIds.has(acc.Acc_Id)
        );
        const ledgerGrpList = (reportData?.LedgerGrp || []).filter(
            (acc) => matchingOpposingAccIds.has(acc.Acc_Id)
        );
        const dexList = (reportData?.DEX || []).filter(
            (acc) => matchingOpposingAccIds.has(acc.Acc_Id)
        );
        const idexList = (reportData?.IDEX || []).filter(
            (acc) => matchingOpposingAccIds.has(acc.Acc_Id)
        );

        const masterMap = {
            Cash: cashList,
            Bank: bankList,
            LedgerGrp: ledgerGrpList,
            DEX: dexList,
            IDEX: idexList,
        };

        // Sum OB_Amount robustly
        let opening = 0;
        if (obList.length > 0) {
            if (isFiltered) {
                let hasFilteredOB = false;
                let sum = 0;
                obList.forEach((obItem: any) => {
                    const accId = obItem.Acc_Id;
                    const groupId = obItem.Group_Id;
                    if (accId) {
                        if (selectedCashAccIds.has(accId)) {
                            sum += Number(obItem.OB_Amount) || 0;
                            hasFilteredOB = true;
                        }
                    } else if (groupId) {
                        if (selectedGroupIds.has(groupId)) {
                            sum += Number(obItem.OB_Amount) || 0;
                            hasFilteredOB = true;
                        }
                    }
                });

                if (hasFilteredOB) {
                    opening = sum;
                } else {
                    opening = Number(obList[0].OB_Amount) || 0;
                }
            } else {
                opening = obList.reduce((sum, obItem) => sum + (Number(obItem.OB_Amount) || 0), 0);
            }
        }

        const getGroupData = (config: GroupConfig) => {
            const masters = masterMap[config.masterKey];
            const masterIds = new Set(masters.map((m) => m.Acc_Id));

            const matchedTransactions = filteredTransactions.filter((tx) => {
                if (config.side === "debit") {
                    return tx.Debit_Ac_Id && masterIds.has(tx.Debit_Ac_Id);
                } else {
                    return tx.Credit_Ac_Id && masterIds.has(tx.Credit_Ac_Id);
                }
            });

            const subLedgerMap: Record<string, { accId: string; name: string; amount: number }> = {};
            matchedTransactions.forEach((tx) => {
                const accId = config.side === "debit" ? tx.Debit_Ac_Id : tx.Credit_Ac_Id;
                const amount = config.side === "debit" ? tx.Dr_Amount : tx.Cr_Amount;

                if (!subLedgerMap[accId]) {
                    const masterAcc = masters.find((m) => m.Acc_Id === accId);
                    subLedgerMap[accId] = {
                        accId,
                        name: masterAcc ? masterAcc.Account_name : `Account (${accId})`,
                        amount: 0,
                    };
                }
                subLedgerMap[accId].amount += amount;
            });

            const subLedgers = Object.values(subLedgerMap)
                .filter((sub) => sub.amount !== 0)
                .sort((a, b) => b.amount - a.amount);

            const total = subLedgers.reduce((sum, sub) => sum + sub.amount, 0);

            return { subLedgers, total };
        };

        const debitGroups = DEBIT_GROUPS.map((grp) => ({
            ...grp,
            ...getGroupData(grp),
        }));

        const creditGroups = CREDIT_GROUPS.map((grp) => ({
            ...grp,
            ...getGroupData(grp),
        }));

        const totalDebits = debitGroups.reduce((sum, g) => sum + g.total, 0);
        const totalCredits = creditGroups.reduce((sum, g) => sum + g.total, 0);
        const closing = opening + totalCredits - totalDebits;

        return {
            debitGroups,
            creditGroups,
            opening,
            closing,
        };
    }, [reportData, selectedCashAccIds, selectedGroupIds, filteredTransactions, matchingOpposingAccIds, selectedGroups]);

    // Handle opening detail modal
    const handleLedgerClick = (accId: string, side: "debit" | "credit") => {
        const allLists = [
            ...(reportData?.Cash || []),
            ...(reportData?.Bank || []),
            ...(reportData?.LedgerGrp || []),
            ...(reportData?.DEX || []),
            ...(reportData?.IDEX || []),
        ];
        const acc = allLists.find((x) => x.Acc_Id === accId);
        const name = acc ? acc.Account_name : `Account (${accId})`;

        setSelectedLedger({ accId, name, side });
        setDetailModalOpen(true);
    };

    // Filter transactions for clicked sub-ledger inside modal
    const modalTransactions = useMemo(() => {
        if (!selectedLedger || !filteredTransactions) return [];
        const { accId, side } = selectedLedger;
        return filteredTransactions.filter((tx) => {
            if (side === "debit") {
                return tx.Debit_Ac_Id === accId;
            } else {
                return tx.Credit_Ac_Id === accId;
            }
        });
    }, [selectedLedger, filteredTransactions]);

    // Find opposing ledger name
    const getOpposingLedgerName = (tx: CashBoxTransaction) => {
        if (!selectedLedger) return "";
        const opposingId = selectedLedger.side === "debit" ? tx.Credit_Ac_Id : tx.Debit_Ac_Id;
        if (!opposingId) return "-";

        const allLists = [
            ...(reportData?.Cash || []),
            ...(reportData?.Bank || []),
            ...(reportData?.LedgerGrp || []),
            ...(reportData?.DEX || []),
            ...(reportData?.IDEX || []),
        ];
        const acc = allLists.find((x) => x.Acc_Id === opposingId);
        return acc ? acc.Account_name : `Account (${opposingId})`;
    };

    // Sum total inside modal
    const modalTotal = useMemo(() => {
        if (!selectedLedger) return 0;
        return modalTransactions.reduce((sum, tx) => {
            return sum + (selectedLedger.side === "debit" ? tx.Dr_Amount : tx.Cr_Amount);
        }, 0);
    }, [modalTransactions, selectedLedger]);

    // Excel Export
    const handleExportExcel = () => {
        try {
            const excelData: any[][] = [];
            const dateStr =
                filters.Date.from === filters.Date.to
                    ? dayjs(filters.Date.from).format("DD-MM-YYYY")
                    : `${dayjs(filters.Date.from).format("DD-MM-YYYY")} TO ${dayjs(filters.Date.to).format("DD-MM-YYYY")}`;

            excelData.push([`CASH BOX TRANSACTION - ${dateStr}`]);
            excelData.push([]);

            // Headers
            excelData.push([
                "Particulars (Debit)",
                "Debit Amt",
                "Particulars (Credit)",
                "Credit amt",
            ]);

            // Opening row
            excelData.push(["", "", "Opening Balance", parsedData.opening]);

            // Parallel Groups and Sub-ledgers
            for (let idx = 0; idx < 5; idx++) {
                const leftGroup = parsedData.debitGroups[idx];
                const rightGroup = parsedData.creditGroups[idx];

                excelData.push([
                    leftGroup.label,
                    leftGroup.total || "",
                    rightGroup.label,
                    rightGroup.total || "",
                ]);

                const maxSubRows = Math.max(leftGroup.subLedgers.length, rightGroup.subLedgers.length);
                for (let i = 0; i < maxSubRows; i++) {
                    const leftSub = leftGroup.subLedgers[i];
                    const rightSub = rightGroup.subLedgers[i];

                    excelData.push([
                        leftSub ? `  ${i + 1}. ${leftSub.name}` : "",
                        leftSub ? leftSub.amount : "",
                        rightSub ? `  ${i + 1}. ${rightSub.name}` : "",
                        rightSub ? rightSub.amount : "",
                    ]);
                }
            }

            // Closing row
            excelData.push(["", "", "Closing Balance", parsedData.closing]);

            const ws = XLSX.utils.aoa_to_sheet(excelData);
            const wb = XLSX.utils.book_new();

            ws["!cols"] = [
                { wch: 35 },
                { wch: 15 },
                { wch: 35 },
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

            const pdfBody: any[][] = [];
            pdfBody.push(["", "", "Opening Balance", formatNum(parsedData.opening)]);

            for (let idx = 0; idx < 5; idx++) {
                const leftGroup = parsedData.debitGroups[idx];
                const rightGroup = parsedData.creditGroups[idx];

                pdfBody.push([
                    leftGroup.label,
                    leftGroup.total ? formatNum(leftGroup.total) : "-",
                    rightGroup.label,
                    rightGroup.total ? formatNum(rightGroup.total) : "-",
                ]);

                const maxSubRows = Math.max(leftGroup.subLedgers.length, rightGroup.subLedgers.length);
                for (let i = 0; i < maxSubRows; i++) {
                    const leftSub = leftGroup.subLedgers[i];
                    const rightSub = rightGroup.subLedgers[i];

                    pdfBody.push([
                        leftSub ? `  ${i + 1}. ${leftSub.name}` : "",
                        leftSub ? formatNum(leftSub.amount) : "",
                        rightSub ? `  ${i + 1}. ${rightSub.name}` : "",
                        rightSub ? formatNum(rightSub.amount) : "",
                    ]);
                }
            }

            pdfBody.push(["", "", "Closing Balance", formatNum(parsedData.closing)]);

            autoTable(doc, {
                startY: 20,
                head: [["Particulars (Debit)", "Debit Amt", "Particulars (Credit)", "Credit amt"]],
                body: pdfBody,
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
        <Box sx={{ width: "100%", overflowX: "hidden", minHeight: "100vh", bgcolor: "#f1f5f9" }}>
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

            <Box px={2} pb={4} pt={2}>
                {/* Chip Filters for Groups */}
                {!loading && reportData && (
                    <Box mb={2} display="flex" flexWrap="wrap" gap={1}>
                        {["All", ...allGroupNames].map((name) => {
                            const isSelected = selectedGroups.includes(name);
                            return (
                                <Button
                                    key={name}
                                    variant={isSelected ? "contained" : "outlined"}
                                    onClick={() => handleGroupChipClick(name)}
                                    sx={{
                                        borderRadius: "20px",
                                        textTransform: "none",
                                        px: 2.5,
                                        py: 0.5,
                                        fontSize: "0.8rem",
                                        fontWeight: 600,
                                        borderColor: isSelected ? "#1E3A8A" : "#cbd5e1",
                                        color: isSelected ? "#fff" : "#475569",
                                        backgroundColor: isSelected ? "#1E3A8A" : "#fff",
                                        "&:hover": {
                                            backgroundColor: isSelected ? "#1e40af" : "#f1f5f9",
                                            borderColor: isSelected ? "#1e40af" : "#94a3b8",
                                        },
                                    }}
                                >
                                    {name}
                                </Button>
                            );
                        })}
                    </Box>
                )}

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
                                background: "#fff",
                                boxShadow: 1,
                            }}
                        >
                            <Typography variant="body1" fontWeight={700} sx={{ letterSpacing: 0.5, color: "#1e293b" }}>
                                CASH BOX TRANSACTION  {" "}
                                {filters.Date.from === filters.Date.to
                                    ? dayjs(filters.Date.from).format("DD-MM-YYYY")
                                    : `${dayjs(filters.Date.from).format("DD-MM-YYYY")} - ${dayjs(filters.Date.to).format("DD-MM-YYYY")}`}
                            </Typography>
                        </Box>

                        {/* Parallel Grid Table */}
                        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, border: "1px solid #cbd5e1", overflowX: "auto" }}>
                            <Table size="small" sx={{ minWidth: 800 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="left" sx={{ backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 700, py: 1.5, fontSize: "0.9rem", border: "1px solid #cbd5e1" }}>
                                            Particulars
                                        </TableCell>
                                        <TableCell align="right" sx={{ backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 700, py: 1.5, width: 180, fontSize: "0.9rem", border: "1px solid #cbd5e1" }}>
                                            Debit Amt
                                        </TableCell>
                                        <TableCell align="left" sx={{ backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 700, py: 1.5, fontSize: "0.9rem", border: "1px solid #cbd5e1" }}>
                                            Particulars
                                        </TableCell>
                                        <TableCell align="right" sx={{ backgroundColor: "#1E3A8A", color: "#fff", fontWeight: 700, py: 1.5, width: 180, fontSize: "0.9rem", border: "1px solid #cbd5e1" }}>
                                            Credit amt
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {/* OPENING ROW */}
                                    <TableRow>
                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                        <TableCell sx={{ py: 1, backgroundColor: "#eeeeeeff", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                                            Opening Balance
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1, backgroundColor: "#eeeeeeff", fontWeight: 700, border: "1px solid #cbd5e1", color: "#b45309" }}>
                                            {formatNum(parsedData.opening)}
                                        </TableCell>
                                    </TableRow>

                                    {/* Main Parallel Group Rows */}
                                    {[0, 1, 2, 3, 4].map((idx) => {
                                        const leftGroup = parsedData.debitGroups[idx];
                                        const rightGroup = parsedData.creditGroups[idx];

                                        const isLeftExpanded = expanded[leftGroup.key] && leftGroup.subLedgers.length > 0;
                                        const isRightExpanded = expanded[rightGroup.key] && rightGroup.subLedgers.length > 0;
                                        const maxSubRows = Math.max(
                                            isLeftExpanded ? leftGroup.subLedgers.length : 0,
                                            isRightExpanded ? rightGroup.subLedgers.length : 0
                                        );

                                        return (
                                            <React.Fragment key={`group-pair-${idx}`}>
                                                {/* Parent Group Row */}
                                                <TableRow sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                                    {/* Left Group Header */}
                                                    <TableCell
                                                        onClick={() => toggleGroup(leftGroup.key)}
                                                        sx={{
                                                            cursor: "pointer",
                                                            fontWeight: 700,
                                                            border: "1px solid #cbd5e1",
                                                            userSelect: "none",
                                                            py: 1.2,
                                                            "&:hover": { backgroundColor: "#f1f5f9" }
                                                        }}
                                                    >
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            {leftGroup.label}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, border: "1px solid #cbd5e1" }}>
                                                        {formatNum(leftGroup.total)}
                                                    </TableCell>

                                                    {/* Right Group Header */}
                                                    <TableCell
                                                        onClick={() => toggleGroup(rightGroup.key)}
                                                        sx={{
                                                            cursor: "pointer",
                                                            fontWeight: 700,
                                                            border: "1px solid #cbd5e1",
                                                            userSelect: "none",
                                                            py: 1.2,
                                                            "&:hover": { backgroundColor: "#f1f5f9" }
                                                        }}
                                                    >
                                                        <Box display="flex" alignItems="center" gap={1}>

                                                            {rightGroup.label}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, border: "1px solid #cbd5e1" }}>
                                                        {formatNum(rightGroup.total)}
                                                    </TableCell>
                                                </TableRow>

                                                {/* Sub-ledgers Parallel Rows */}
                                                {maxSubRows > 0 &&
                                                    Array.from({ length: maxSubRows }).map((_, i) => {
                                                        const leftSub = isLeftExpanded ? leftGroup.subLedgers[i] : null;
                                                        const rightSub = isRightExpanded ? rightGroup.subLedgers[i] : null;

                                                        return (
                                                            <TableRow key={`sub-${leftGroup.key}-${rightGroup.key}-${i}`} sx={{ bgcolor: "#fafafa" }}>
                                                                {/* Left Subledger */}
                                                                {leftSub ? (
                                                                    <>
                                                                        <TableCell
                                                                            onClick={() => handleLedgerClick(leftSub.accId, "debit")}
                                                                            sx={{
                                                                                pl: 5,
                                                                                border: "1px solid #cbd5e1",
                                                                                cursor: "pointer",
                                                                                color: "#000000",
                                                                                fontWeight: 600,
                                                                                "&:hover": { color: "#000000" }
                                                                            }}
                                                                        >
                                                                            {i + 1}. {leftSub.name}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ border: "1px solid #cbd5e1", fontWeight: 600 }}>
                                                                            {formatNum(leftSub.amount)}
                                                                        </TableCell>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                                                    </>
                                                                )}

                                                                {/* Right Subledger */}
                                                                {rightSub ? (
                                                                    <>
                                                                        <TableCell
                                                                            onClick={() => handleLedgerClick(rightSub.accId, "credit")}
                                                                            sx={{
                                                                                pl: 5,
                                                                                border: "1px solid #cbd5e1",
                                                                                cursor: "pointer",
                                                                                color: "#000000",
                                                                                fontWeight: 600,
                                                                                "&:hover": { color: "#000000" }
                                                                            }}
                                                                        >
                                                                            {i + 1}. {rightSub.name}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ border: "1px solid #cbd5e1", fontWeight: 600 }}>
                                                                            {formatNum(rightSub.amount)}
                                                                        </TableCell>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                                                    </>
                                                                )}
                                                            </TableRow>
                                                        );
                                                    })}
                                            </React.Fragment>
                                        );
                                    })}

                                    {/* CLOSING ROW */}
                                    <TableRow>
                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                        <TableCell sx={{ border: "1px solid #cbd5e1" }} />
                                        <TableCell sx={{ py: 1, backgroundColor: "#eeeeeeff", fontWeight: 700, border: "1px solid #cbd5e1" }}>
                                            Closing Balance
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1, backgroundColor: "#eeeeeeff", fontWeight: 700, border: "1px solid #cbd5e1", color: "#15803d" }}>
                                            {formatNum(parsedData.closing)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Box>

            {/* Details Popup Modal */}
            <Dialog
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ backgroundColor: "#1E3A8A", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6" fontWeight={700}>
                        Transaction Details: {selectedLedger?.name} ({selectedLedger?.side === "debit" ? "Debit" : "Credit"} Account)
                    </Typography>
                    <IconButton
                        onClick={() => setDetailModalOpen(false)}
                        sx={{
                            color: "#fff",
                            borderRadius: "4px",
                            border: "1px solid #fff",
                            padding: "4px",
                            "&:hover": {
                                backgroundColor: "#ef4444",
                                color: "#fff",
                            }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    <TableContainer sx={{ maxHeight: 400, overflowY: "auto" }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}>Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}>Voucher Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}>Voucher No</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}>Ledgers</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", pr: 2 }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}>Narration</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    modalTransactions.map((tx, idx) => (
                                        <TableRow key={`${tx.Trans_Id}-${idx}`} hover>
                                            <TableCell>{dayjs(tx.Ledger_Date).format("DD-MM-YYYY")}</TableCell>
                                            <TableCell>{formatTime(tx.Ledger_Date)}</TableCell>
                                            <TableCell>{tx.voucher_name}</TableCell>
                                            <TableCell>{tx.invoice_no}</TableCell>
                                            <TableCell>{getOpposingLedgerName(tx)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, pr: 2 }}>
                                                {formatNum(selectedLedger?.side === "debit" ? tx.Dr_Amount : tx.Cr_Amount)}
                                            </TableCell>
                                            <TableCell>{tx.Narration || tx.Line_Naration || "-"}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {modalTransactions.length > 0 && (
                                    <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                                        <TableCell colSpan={5} sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: selectedLedger?.side === "debit" ? "#0f766e" : "#be123c", pr: 2 }}>
                                            {formatNum(modalTotal)}
                                        </TableCell>
                                        <TableCell />
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>

            </Dialog>
        </Box>
    );
};

export default CashBoxReport;
