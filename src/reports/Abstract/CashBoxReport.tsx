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
import { cashboxService, CashBoxReportResponse, CashBoxTransaction, CashBoxMasterAccount } from "../../services/cashbox.service";

interface GroupConfig {
    key: string;
    label: string;
    side: "debit" | "credit";
    masterKey: "Cash" | "Bank" | "LedgerGrp" | "DEX" | "IDEX" | "Others";
}

const DEBIT_GROUPS: GroupConfig[] = [
    { key: "cash_paid", label: "Cash Transfer (Paid)", side: "debit", masterKey: "Cash" },
    { key: "bank_dep", label: "Bank Deposit (Contra)", side: "debit", masterKey: "Bank" },
    { key: "ledger_pay", label: "Ledger Groups (Payment)", side: "debit", masterKey: "LedgerGrp" },
    { key: "dex_deb", label: "Direct Expenses", side: "debit", masterKey: "DEX" },
    { key: "idex_deb", label: "In-Direct Expenses", side: "debit", masterKey: "IDEX" },
    { key: "others_deb", label: "Others", side: "debit", masterKey: "Others" }
];

const CREDIT_GROUPS: GroupConfig[] = [
    { key: "cash_rec", label: "Cash Transfer (Received)", side: "credit", masterKey: "Cash" },
    { key: "bank_rec", label: "Bank Received (Contra)", side: "credit", masterKey: "Bank" },
    { key: "ledger_rec", label: "Ledger Groups (Receipts)", side: "credit", masterKey: "LedgerGrp" },
    { key: "dex_cred", label: "Direct Expenses- Income", side: "credit", masterKey: "DEX" },
    { key: "idex_cred", label: "InDirect Expenses- Income", side: "credit", masterKey: "IDEX" },
    { key: "others_cred", label: "Others", side: "credit", masterKey: "Others" }
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
        others_deb: false,
        others_cred: false,
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
                const filterGroup = (arr: any[]) =>
                    (arr || []).filter(
                        (acc) =>
                            !acc.Group_Name ||
                            acc.Group_Name.trim().toLowerCase() 
                    );

                const filteredRes = {
                    ...res,
                    Cash: filterGroup(res.Cash),
                    Bank: filterGroup(res.Bank),
                    LedgerGrp: filterGroup(res.LedgerGrp),
                    DEX: filterGroup(res.DEX),
                    IDEX: filterGroup(res.IDEX),
                };
                setReportData(filteredRes);
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
                .map((acc) => String(acc.Acc_Id))
        );
    }, [reportData, selectedGroups]);

    // Get selected Cash Group IDs
    const selectedGroupIds = useMemo(() => {
        const isFiltered = !selectedGroups.includes("All") && selectedGroups.length > 0;
        return new Set(
            (reportData?.Cash || [])
                .filter((acc) => !isFiltered || (acc.Group_Name && selectedGroups.includes(acc.Group_Name.trim())))
                .map((acc) => String(acc.Group_Id))
        );
    }, [reportData, selectedGroups]);

    // Filter transactions: group by invoice key and keep all entries for cash-involved invoices
    const filteredTransactions = useMemo(() => {
        const allTx = reportData?.Data1 || [];

        // Map all Cash Acc_Ids to a Set for O(1) lookup
        const cashAccIds = new Set(
            (reportData?.Cash || []).map((acc) => String(acc.Acc_Id))
        );

        // Map all non-cash Acc_Ids and bank-related Acc_Ids
        const nonCashAccIds = new Set<string>();
        const bankRelatedAccIds = new Set<string>();
        const bankMasterAccIds = new Set(
            (reportData?.Bank || []).map((acc) => String(acc.Acc_Id))
        );

        if (reportData) {
            (reportData.Bank || []).forEach((acc) => bankRelatedAccIds.add(String(acc.Acc_Id)));
            (reportData.LedgerGrp || []).forEach((acc) => {
                const accIdStr = String(acc.Acc_Id);
                if (acc.Account_name && acc.Account_name.toLowerCase().includes("(bank)")) {
                    bankRelatedAccIds.add(accIdStr);
                } else {
                    nonCashAccIds.add(accIdStr);
                }
            });
            (reportData.DEX || []).forEach((acc) => {
                const accIdStr = String(acc.Acc_Id);
                if (acc.Account_name && acc.Account_name.toLowerCase().includes("(bank)")) {
                    bankRelatedAccIds.add(accIdStr);
                } else {
                    nonCashAccIds.add(accIdStr);
                }
            });
            (reportData.IDEX || []).forEach((acc) => {
                const accIdStr = String(acc.Acc_Id);
                if (acc.Account_name && acc.Account_name.toLowerCase().includes("(bank)")) {
                    bankRelatedAccIds.add(accIdStr);
                } else {
                    nonCashAccIds.add(accIdStr);
                }
            });
        }

        const getInvoiceKey = (tx: any) => tx.invoice_no || tx.Trans_Id || "";

        // Find all invoice keys that have at least one transaction touching any active cash account
        const cashInvoiceKeys = new Set<string>();
        allTx.forEach((tx) => {
            const isCreditCash = tx.Credit_Ac_Id && cashAccIds.has(String(tx.Credit_Ac_Id));
            const isDebitCash = tx.Debit_Ac_Id && cashAccIds.has(String(tx.Debit_Ac_Id));
            if (isCreditCash || isDebitCash) {
                const key = getInvoiceKey(tx);
                if (key) cashInvoiceKeys.add(key);
            }
        });

        // Clean transactions: must have an invoice key in cashInvoiceKeys
        const cleanTx = allTx.filter((tx) => {
            const key = getInvoiceKey(tx);
            if (!key || !cashInvoiceKeys.has(key)) {
                return false;
            }

            const debitIdStr = tx.Debit_Ac_Id ? String(tx.Debit_Ac_Id) : "";
            const creditIdStr = tx.Credit_Ac_Id ? String(tx.Credit_Ac_Id) : "";

            // If either side is a bank-related expense/ledger (not a contra Bank account, but containing "(bank)"), filter it out
            const isDebitBankExpense = debitIdStr && bankRelatedAccIds.has(debitIdStr) && !bankMasterAccIds.has(debitIdStr);
            const isCreditBankExpense = creditIdStr && bankRelatedAccIds.has(creditIdStr) && !bankMasterAccIds.has(creditIdStr);
            if (isDebitBankExpense || isCreditBankExpense) {
                return false;
            }

            return true;
        });

        const isFiltered = !selectedGroups.includes("All") && selectedGroups.length > 0;
        if (!isFiltered) return cleanTx;

        // If filtered, find all invoice keys that have at least one transaction touching the selected Cash accounts
        const selectedCashInvoiceKeys = new Set<string>();
        cleanTx.forEach((tx) => {
            const isCreditCashSelected = tx.Credit_Ac_Id && selectedCashAccIds.has(String(tx.Credit_Ac_Id));
            const isDebitCashSelected = tx.Debit_Ac_Id && selectedCashAccIds.has(String(tx.Debit_Ac_Id));
            if (isCreditCashSelected || isDebitCashSelected) {
                const key = getInvoiceKey(tx);
                if (key) selectedCashInvoiceKeys.add(key);
            }
        });

        return cleanTx.filter((tx) => {
            const key = getInvoiceKey(tx);
            return key && selectedCashInvoiceKeys.has(key);
        });
    }, [reportData, selectedCashAccIds, selectedGroups]);

    // Compute matching opposing account IDs from transactions involving the selected Cash accounts
    const matchingOpposingAccIds = useMemo(() => {
        const opposing = new Set<string>();
        const nonCashAccIds = new Set<string>();
        const bankMasterAccIds = new Set(
            (reportData?.Bank || []).map((acc) => String(acc.Acc_Id))
        );

        if (reportData) {
            (reportData.LedgerGrp || []).forEach((acc) => {
                if (acc.Account_name && !acc.Account_name.toLowerCase().includes("(bank)")) {
                    nonCashAccIds.add(String(acc.Acc_Id));
                }
            });
            (reportData.DEX || []).forEach((acc) => {
                if (acc.Account_name && !acc.Account_name.toLowerCase().includes("(bank)")) {
                    nonCashAccIds.add(String(acc.Acc_Id));
                }
            });
            (reportData.IDEX || []).forEach((acc) => {
                if (acc.Account_name && !acc.Account_name.toLowerCase().includes("(bank)")) {
                    nonCashAccIds.add(String(acc.Acc_Id));
                }
            });
        }

        const allCashAccIds = new Set(
            (reportData?.Cash || []).map((acc) => String(acc.Acc_Id))
        );

        filteredTransactions.forEach((tx) => {
            const isDebitCash = tx.Debit_Ac_Id && selectedCashAccIds.has(String(tx.Debit_Ac_Id));
            const isCreditCash = tx.Credit_Ac_Id && selectedCashAccIds.has(String(tx.Credit_Ac_Id));
            const isJournal = tx.voucher_name && tx.voucher_name.toLowerCase().includes("journal");

            if (tx.invoice_no === "OJ0/000804/26-27") {
                console.log("OJ0/000804/26-27 Debug:", {
                    Debit_Ac_Id: tx.Debit_Ac_Id,
                    Credit_Ac_Id: tx.Credit_Ac_Id,
                    voucher_name: tx.voucher_name,
                    isJournal,
                    allCashAccIdsHasDebit: allCashAccIds.has(String(tx.Debit_Ac_Id)),
                    nonCashAccIdsHasDebit: nonCashAccIds.has(String(tx.Debit_Ac_Id)),
                    bankMasterAccIdsHasDebit: bankMasterAccIds.has(String(tx.Debit_Ac_Id))
                });
            }

            if (isJournal) {
                if (tx.Debit_Ac_Id) {
                    const debitIdStr = String(tx.Debit_Ac_Id);
                    if (!allCashAccIds.has(debitIdStr) && (bankMasterAccIds.has(debitIdStr) || nonCashAccIds.has(debitIdStr))) {
                        opposing.add(debitIdStr);
                    }
                }
                if (tx.Credit_Ac_Id) {
                    const creditIdStr = String(tx.Credit_Ac_Id);
                    if (!allCashAccIds.has(creditIdStr) && (bankMasterAccIds.has(creditIdStr) || nonCashAccIds.has(creditIdStr))) {
                        opposing.add(creditIdStr);
                    }
                }
            } else {
                if (isDebitCash && tx.Credit_Ac_Id) {
                    const creditIdStr = String(tx.Credit_Ac_Id);
                    if (bankMasterAccIds.has(creditIdStr) || nonCashAccIds.has(creditIdStr)) {
                        opposing.add(creditIdStr);
                    }
                }
                if (isCreditCash && tx.Debit_Ac_Id) {
                    const debitIdStr = String(tx.Debit_Ac_Id);
                    if (bankMasterAccIds.has(debitIdStr) || nonCashAccIds.has(debitIdStr)) {
                        opposing.add(debitIdStr);
                    }
                }

                // Also check if one side is generic cash "0" and the opposing side belongs to any non-cash group
                const hasZeroCredit = !tx.Credit_Ac_Id || String(tx.Credit_Ac_Id) === "0";
                const hasZeroDebit = !tx.Debit_Ac_Id || String(tx.Debit_Ac_Id) === "0";

                if (hasZeroCredit && tx.Debit_Ac_Id && nonCashAccIds.has(String(tx.Debit_Ac_Id))) {
                    opposing.add(String(tx.Debit_Ac_Id));
                }
                if (hasZeroDebit && tx.Credit_Ac_Id && nonCashAccIds.has(String(tx.Credit_Ac_Id))) {
                    opposing.add(String(tx.Credit_Ac_Id));
                }
            }
        });
        console.log("Opposing IDs calculated:", Array.from(opposing));
        return opposing;
    }, [filteredTransactions, selectedCashAccIds, reportData]);

    const allCashAccIdsSet = useMemo(() => {
        return new Set(
            (reportData?.Cash || []).map((acc) => String(acc.Acc_Id).trim())
        );
    }, [reportData]);

    // Calculate groups and balances
    const parsedData = useMemo(() => {
        const obList = reportData?.OB || [];

        const isFiltered = !selectedGroups.includes("All") && selectedGroups.length > 0;

        const allCashAccIds = allCashAccIdsSet;

        const getInvoiceKey = (tx: any) => tx.invoice_no || tx.Trans_Id || "";
        const cashToCashInvoiceKeys = new Set<string>();
        const invoiceTxMap = new Map<string, any[]>();
        filteredTransactions.forEach((tx) => {
            const key = getInvoiceKey(tx);
            if (key) {
                if (!invoiceTxMap.has(key)) {
                    invoiceTxMap.set(key, []);
                }
                const list = invoiceTxMap.get(key);
                if (list) {
                    list.push(tx);
                }
            }
        });

        invoiceTxMap.forEach((txList, key) => {
            const hasDebitCash = txList.some((tx) => tx.Debit_Ac_Id && allCashAccIds.has(String(tx.Debit_Ac_Id).trim()));
            const hasCreditCash = txList.some((tx) => tx.Credit_Ac_Id && allCashAccIds.has(String(tx.Credit_Ac_Id).trim()));
            if (hasDebitCash && hasCreditCash) {
                cashToCashInvoiceKeys.add(key);
            }
        });

        const cashList = (reportData?.Cash || []).filter(
            (acc) => selectedCashAccIds.has(String(acc.Acc_Id))
        );
        const bankList = (reportData?.Bank || []).filter(
            (acc) => matchingOpposingAccIds.has(String(acc.Acc_Id)) && !allCashAccIds.has(String(acc.Acc_Id))
        );
        const ledgerGrpList = (reportData?.LedgerGrp || []).filter(
            (acc) => matchingOpposingAccIds.has(String(acc.Acc_Id)) && !allCashAccIds.has(String(acc.Acc_Id))
        );
        const dexList = (reportData?.DEX || []).filter(
            (acc) => matchingOpposingAccIds.has(String(acc.Acc_Id)) && !allCashAccIds.has(String(acc.Acc_Id))
        );
        const idexList = (reportData?.IDEX || []).filter(
            (acc) => matchingOpposingAccIds.has(String(acc.Acc_Id)) && !allCashAccIds.has(String(acc.Acc_Id))
        );

        const allDefinedAccIds = new Set<string>([
            ...allCashAccIds,
            ...(reportData?.Bank || []).map((acc) => String(acc.Acc_Id)),
            ...(reportData?.LedgerGrp || []).map((acc) => String(acc.Acc_Id)),
            ...(reportData?.DEX || []).map((acc) => String(acc.Acc_Id)),
            ...(reportData?.IDEX || []).map((acc) => String(acc.Acc_Id))
        ]);

        const othersMap = new Map<string, CashBoxMasterAccount>();
        filteredTransactions.forEach((tx) => {
            const debitIdStr = tx.Debit_Ac_Id ? String(tx.Debit_Ac_Id) : "";
            const creditIdStr = tx.Credit_Ac_Id ? String(tx.Credit_Ac_Id) : "";

            const isDebitCash = debitIdStr && selectedCashAccIds.has(debitIdStr);
            const isCreditCash = creditIdStr && selectedCashAccIds.has(creditIdStr);
            const isJournal = tx.voucher_name && tx.voucher_name.toLowerCase().includes("journal");

            if (isJournal) {
                if (debitIdStr && debitIdStr !== "0" && !allDefinedAccIds.has(debitIdStr)) {
                    if (!othersMap.has(debitIdStr)) {
                        othersMap.set(debitIdStr, {
                            Acc_Id: debitIdStr,
                            Account_name: tx.Particulars || `Account (${debitIdStr})`,
                            Group_Name: "Others",
                            Group_Id: "Others"
                        });
                    }
                }
                if (creditIdStr && creditIdStr !== "0" && !allDefinedAccIds.has(creditIdStr)) {
                    if (!othersMap.has(creditIdStr)) {
                        othersMap.set(creditIdStr, {
                            Acc_Id: creditIdStr,
                            Account_name: tx.Particulars || `Account (${creditIdStr})`,
                            Group_Name: "Others",
                            Group_Id: "Others"
                        });
                    }
                }
            } else {
                if (isDebitCash && creditIdStr && creditIdStr !== "0" && !allDefinedAccIds.has(creditIdStr)) {
                    if (!othersMap.has(creditIdStr)) {
                        othersMap.set(creditIdStr, {
                            Acc_Id: creditIdStr,
                            Account_name: tx.Particulars || `Account (${creditIdStr})`,
                            Group_Name: "Others",
                            Group_Id: "Others"
                        });
                    }
                }
                if (isCreditCash && debitIdStr && debitIdStr !== "0" && !allDefinedAccIds.has(debitIdStr)) {
                    if (!othersMap.has(debitIdStr)) {
                        othersMap.set(debitIdStr, {
                            Acc_Id: debitIdStr,
                            Account_name: tx.Particulars || `Account (${debitIdStr})`,
                            Group_Name: "Others",
                            Group_Id: "Others"
                        });
                    }
                }
            }
        });
        const othersList = Array.from(othersMap.values());

        const masterMap = {
            Cash: cashList,
            Bank: bankList,
            LedgerGrp: ledgerGrpList,
            DEX: dexList,
            IDEX: idexList,
            Others: othersList,
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
                        if (selectedCashAccIds.has(String(accId))) {
                            sum += Number(obItem.OB_Amount) || 0;
                            hasFilteredOB = true;
                        }
                    } else if (groupId) {
                        if (selectedGroupIds.has(String(groupId))) {
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
            const masterIds = new Set(masters.map((m) => String(m.Acc_Id).trim()));

            const matchedTransactions = filteredTransactions.filter((tx) => {
                const txCreditAcIdStr = tx.Credit_Ac_Id ? String(tx.Credit_Ac_Id).trim() : "";
                const txDebitAcIdStr = tx.Debit_Ac_Id ? String(tx.Debit_Ac_Id).trim() : "";

                // If it is the Cash group, BOTH sides of the transaction must be cash accounts,
                // unless it is a one-sided transaction where Credit or Debit is 0.
                if (config.masterKey === "Cash") {
                    const key = getInvoiceKey(tx);
                    const isCashToCash = key && cashToCashInvoiceKeys.has(key);
                    if (!isCashToCash) return false;

                    if (config.side === "debit") {
                        return tx.Credit_Ac_Id && allCashAccIds.has(txCreditAcIdStr);
                    } else {
                        return tx.Debit_Ac_Id && allCashAccIds.has(txDebitAcIdStr);
                    }
                }

                if (config.side === "debit") {
                    return tx.Debit_Ac_Id && masterIds.has(txDebitAcIdStr);
                } else {
                    return tx.Credit_Ac_Id && masterIds.has(txCreditAcIdStr);
                }
            });

            const subLedgerMap: Record<string, { accId: string; name: string; amount: number }> = {};
            matchedTransactions.forEach((tx) => {
                let accId = config.side === "debit" ? String(tx.Debit_Ac_Id).trim() : String(tx.Credit_Ac_Id).trim();
                let amount = config.side === "debit" ? tx.Dr_Amount : tx.Cr_Amount;

                if (config.masterKey === "Cash") {
                    const txDebitAcIdStr = tx.Debit_Ac_Id ? String(tx.Debit_Ac_Id).trim() : "";
                    const txCreditAcIdStr = tx.Credit_Ac_Id ? String(tx.Credit_Ac_Id).trim() : "";
                    if (tx.Debit_Ac_Id && allCashAccIds.has(txDebitAcIdStr)) {
                        accId = txDebitAcIdStr;
                        amount = tx.Dr_Amount;
                    } else if (tx.Credit_Ac_Id && allCashAccIds.has(txCreditAcIdStr)) {
                        accId = txCreditAcIdStr;
                        amount = tx.Cr_Amount;
                    }
                }

                if (!subLedgerMap[accId]) {
                    const allLists = [
                        ...(reportData?.Cash || []),
                        ...(reportData?.Bank || []),
                        ...(reportData?.LedgerGrp || []),
                        ...(reportData?.DEX || []),
                        ...(reportData?.IDEX || []),
                        ...othersList,
                    ];
                    const masterAcc = allLists.find((m) => String(m.Acc_Id).trim() === accId);
                    subLedgerMap[accId] = {
                        accId,
                        name: masterAcc ? masterAcc.Account_name : (tx.Particulars || `Account (${accId})`),
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
            othersList,
            cashToCashInvoiceKeys,
        };
    }, [reportData, selectedCashAccIds, selectedGroupIds, filteredTransactions, matchingOpposingAccIds, selectedGroups, allCashAccIdsSet]);

    // Handle opening detail modal
    const handleLedgerClick = (accId: string, name: string, side: "debit" | "credit") => {
        setSelectedLedger({ accId, name, side });
        setDetailModalOpen(true);
    };

    // Filter transactions for clicked sub-ledger inside modal
    const modalTransactions = useMemo(() => {
        if (!selectedLedger || !filteredTransactions) return [];
        const { accId, side } = selectedLedger;
        const accIdTrim = String(accId).trim();
        const isCash = allCashAccIdsSet.has(accIdTrim);

        return filteredTransactions.filter((tx) => {
            if (isCash) {
                // For Cash group, only cash-to-cash transactions should show
                const key = tx.invoice_no || tx.Trans_Id || "";
                const isCashToCash = key && parsedData.cashToCashInvoiceKeys.has(key);
                if (!isCashToCash) return false;

                if (side === "debit") {
                    return String(tx.Credit_Ac_Id).trim() === accIdTrim;
                } else {
                    return String(tx.Debit_Ac_Id).trim() === accIdTrim;
                }
            } else {
                if (side === "debit") {
                    return String(tx.Debit_Ac_Id).trim() === accIdTrim;
                } else {
                    return String(tx.Credit_Ac_Id).trim() === accIdTrim;
                }
            }
        });
    }, [selectedLedger, filteredTransactions, allCashAccIdsSet, parsedData.cashToCashInvoiceKeys]);

    // Find opposing ledger name
    const getOpposingLedgerName = (tx: CashBoxTransaction) => {
        if (!selectedLedger) return "";
        const accId = String(selectedLedger.accId).trim();
        const isCash = allCashAccIdsSet.has(accId);

        let opposingId;
        if (isCash) {
            opposingId = String(tx.Debit_Ac_Id).trim() === accId ? tx.Credit_Ac_Id : tx.Debit_Ac_Id;
        } else {
            opposingId = selectedLedger.side === "debit" ? tx.Credit_Ac_Id : tx.Debit_Ac_Id;
        }

        if (!opposingId || String(opposingId) === "0") return "CASH";

        const allLists = [
            ...(reportData?.Cash || []),
            ...(reportData?.Bank || []),
            ...(reportData?.LedgerGrp || []),
            ...(reportData?.DEX || []),
            ...(reportData?.IDEX || []),
            ...(parsedData?.othersList || []),
        ];
        const acc = allLists.find((x) => String(x.Acc_Id).trim() === String(opposingId).trim());
        return acc ? acc.Account_name : (tx.Particulars || `Account (${opposingId})`);
    };

    // Sum total inside modal
    const modalTotal = useMemo(() => {
        if (!selectedLedger) return 0;
        const accId = String(selectedLedger.accId).trim();
        const isCash = allCashAccIdsSet.has(accId);

        return modalTransactions.reduce((sum, tx) => {
            if (isCash) {
                const amount = String(tx.Debit_Ac_Id).trim() === accId ? tx.Dr_Amount : tx.Cr_Amount;
                return sum + amount;
            }
            return sum + (selectedLedger.side === "debit" ? tx.Dr_Amount : tx.Cr_Amount);
        }, 0);
    }, [modalTransactions, selectedLedger, allCashAccIdsSet]);

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
            for (let idx = 0; idx < parsedData.debitGroups.length; idx++) {
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

            for (let idx = 0; idx < parsedData.debitGroups.length; idx++) {
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
                                    {parsedData.debitGroups.map((_, idx) => {
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
                                                                            onClick={() => handleLedgerClick(leftSub.accId, leftSub.name, "debit")}
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
                                                                            onClick={() => handleLedgerClick(rightSub.accId, rightSub.name, "credit")}
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
                                <TableRow sx={{ height: "33px" }}>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", height: "33px", py: 0 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", height: "33px", py: 0 }}>Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", height: "33px", py: 0 }}>Voucher Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", height: "33px", py: 0 }}>Voucher No</TableCell>
                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", height: "33px", py: 0 }}>Ledgers</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", pr: 2, height: "33px", py: 0 }}>Amount</TableCell>
                                </TableRow>
                                {modalTransactions.length > 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} sx={{ position: "sticky", top: "33px", zIndex: 2, fontWeight: 700, backgroundColor: "#f8fafc" }} align="right">Total</TableCell>
                                        <TableCell align="right" sx={{ position: "sticky", top: "33px", zIndex: 2, fontWeight: 700, color: selectedLedger?.side === "debit" ? "#0f766e" : "#be123c", backgroundColor: "#f8fafc", pr: 2 }}>
                                            {formatNum(modalTotal)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableHead>
                            <TableBody>
                                {modalTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    modalTransactions.map((tx, idx) => {
                                        const narration = (tx.Narration || tx.Line_Naration || "").trim();
                                        return (
                                            <React.Fragment key={`${tx.Trans_Id}-${idx}`}>
                                                <TableRow hover>
                                                    <TableCell>{dayjs(tx.Ledger_Date).format("DD-MM-YYYY")}</TableCell>
                                                    <TableCell>{formatTime(tx.Ledger_Date)}</TableCell>
                                                    <TableCell>{tx.voucher_name}</TableCell>
                                                    <TableCell>{tx.invoice_no}</TableCell>
                                                    <TableCell>{getOpposingLedgerName(tx)}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600, pr: 2 }}>
                                                        {formatNum(
                                                            selectedLedger && allCashAccIdsSet.has(String(selectedLedger.accId).trim())
                                                                ? (String(tx.Debit_Ac_Id).trim() === String(selectedLedger.accId).trim() ? tx.Dr_Amount : tx.Cr_Amount)
                                                                : (selectedLedger?.side === "debit" ? tx.Dr_Amount : tx.Cr_Amount)
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                {narration && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} sx={{ py: 0.5, borderTop: "none", color: "#4f46e5", fontWeight: 600, fontStyle: "italic", fontSize: "0.8rem", pl: 4 }}>
                                                            * {narration}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
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
