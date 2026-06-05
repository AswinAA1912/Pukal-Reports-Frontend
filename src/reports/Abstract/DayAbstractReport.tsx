import React, { useEffect, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    CircularProgress,
    TextField
} from "@mui/material";

import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

import AppLayout, { useToggleMode } from "../../Layout/appLayout";
import PageHeader from "../../Layout/PageHeader";
import ReportFilterDrawer from "../../Components/ReportFilterDrawer";

import {
    DayAbstractReportService,
    DayAbstractReportResponse,
} from "../../services/dayAbstract.service";

const DayAbstractReport: React.FC = () => {

    const today = dayjs().format("YYYY-MM-DD");

    const { toggleMode, setToggleMode } = useToggleMode();

    const [loading, setLoading] = useState(false);

    const [drawerOpen, setDrawerOpen] = useState(false);

    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    const [liveData, setLiveData] =
        useState<DayAbstractReportResponse | null>(null);

    const [savedData, setSavedData] =
        useState<DayAbstractReportResponse | null>(null);

    const [dayClosing, setDayClosing] = useState<string>("0");

    const reportData =
        toggleMode === "Abstract"
            ? liveData
            : savedData;

    /* ================= LOAD REPORT ================= */

    const loadReport = async () => {
        try {
            setLoading(true);

            const result =
                await DayAbstractReportService.getDayAbstractReport({
                    Predate: dayjs(fromDate)
                        .subtract(1, "day")
                        .format("YYYY/MM/DD"),

                    Fromdate: dayjs(fromDate)
                        .format("YYYY/MM/DD"),

                    Todate: dayjs(toDate)
                        .format("YYYY/MM/DD"),
                });

            setLiveData(result);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    /* ================= INITIAL LOAD ================= */

    useEffect(() => {
        loadReport();
    }, []);

    /* ================= SAVE SNAPSHOT ================= */

    const handleSaveSnapshot = () => {
        if (!liveData) {
            toast.warning("No data available");
            return;
        }

        setSavedData(
            JSON.parse(JSON.stringify(liveData))
        );

        toast.success("Snapshot saved successfully");
    };

    /* ================= EXPORT EXCEL ================= */

    const getGroupedData = () => {

        if (!reportData?.Data3?.length) return [];

        return Object.values(
            reportData.Data3.reduce(
                (
                    acc: Record<
                        string,
                        {
                            transType: string;
                            receiptCredit: number;
                            receiptDebit: number;
                            paymentCredit: number;
                            paymentDebit: number;
                        }
                    >,
                    row
                ) => {

                    const key = row.Master_Name;

                    if (!acc[key]) {
                        acc[key] = {
                            transType: key,
                            receiptCredit: 0,
                            receiptDebit: 0,
                            paymentCredit: 0,
                            paymentDebit: 0,
                        };
                    }

                    const transType =
                        row.Trans_Type?.toUpperCase() || "";

                    if (
                        transType === "RECEIPTS" ||
                        transType === "RECEIPT"
                    ) {
                        acc[key].receiptCredit += Number(
                            row.Credit_Amount || 0
                        );

                        acc[key].receiptDebit += Number(
                            row.Debit_Amount || 0
                        );
                    }

                    if (
                        transType === "PAYMENTS" ||
                        transType === "PAYMENT"
                    ) {
                        acc[key].paymentCredit += Number(
                            row.Credit_Amount || 0
                        );

                        acc[key].paymentDebit += Number(
                            row.Debit_Amount || 0
                        );
                    }

                    return acc;

                },
                {}
            )
        );
    };

    const handleExportExcel = () => {

        if (!reportData) {
            toast.warning("No data available");
            return;
        }

        const systemClosing =
            reportData.Data1.reduce(
                (sum, row) =>
                    sum + Number(row.Trans_Amount || 0),
                0
            );

        const difference =
            systemClosing - Number(dayClosing || 0);

       const groupedData = getGroupedData();
       
        const ws = XLSX.utils.aoa_to_sheet([]);

        let row = 1;

        XLSX.utils.sheet_add_aoa(
            ws,
            [[
                `DAY ABSTRACT REPORT (${fromDate} To ${toDate})`
            ]],
            { origin: `A${row}` }
        );

        row += 2;

        XLSX.utils.sheet_add_aoa(
            ws,
            [[
                "System Closing",
                formatAmount(systemClosing),
                "",
                "Day Closing",
                formatAmount(Number(dayClosing || 0)),
                "",
                "Difference",
                formatAmount(difference)
            ]],
            { origin: `A${row}` }
        );

        row += 3;

        /* DATA 1 */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 1 - SUMMARY"]],
            { origin: `A${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data1,
            {
                origin: `A${row + 1}`,
                skipHeader: false,
            }
        );

        /* DATA 2 */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 2 - TRANSACTION"]],
            { origin: `F${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data2,
            {
                origin: `F${row + 1}`,
                skipHeader: false,
            }
        );

        /* DATA 4 */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 4 - SALES SPLIT"]],
            { origin: `K${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data4,
            {
                origin: `K${row + 1}`,
                skipHeader: false,
            }
        );

        row +=
            Math.max(
                reportData.Data1.length,
                reportData.Data2.length,
                reportData.Data4.length
            ) + 5;

        /* DATA 3 */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 3 - LEDGER SUMMARY"]],
            { origin: `A${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            groupedData,
            {
                origin: `A${row + 1}`,
                skipHeader: false,
            }
        );

        ws["!cols"] = [
            { wch: 30 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
        ];

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "Day Abstract"
        );

        XLSX.writeFile(
            wb,
            `Day_Abstract_Report_${dayjs().format(
                "DDMMYYYY_HHmmss"
            )}.xlsx`
        );
    };

    /* ================= EXPORT PDF ================= */

    const handleExportPDF = () => {

        if (!reportData) {
            toast.warning("No data available");
            return;
        }

        const doc = new jsPDF(
            "landscape",
            "mm",
            "a4"
        );

        /* -----------------------------
           HEADER
        ------------------------------ */

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");

        doc.text(
            `DAY ABSTRACT REPORT (${fromDate} TO ${toDate})`,
            105,
            12,
            { align: "center" }
        );

        const systemClosing =
            reportData.Data1.reduce(
                (sum, row) =>
                    sum + Number(row.Trans_Amount || 0),
                0
            );

        const difference =
            systemClosing - Number(dayClosing || 0);

        doc.setFontSize(10);

        doc.text(
            `System Closing : ${formatAmount(systemClosing)}`,
            15,
            22
        );

        doc.text(
            `Day Closing : ${formatAmount(
                Number(dayClosing || 0)
            )}`,
            110,
            22
        );

        doc.text(
            `Difference : ${formatAmount(difference)}`,
            210,
            22
        );

        /* -----------------------------
           DATA 1 (LEFT)
        ------------------------------ */

        autoTable(doc, {
            startY: 30,
            margin: { left: 10 },
            tableWidth: 70,

            head: [["Trans Type", "Amount"]],

            body: reportData.Data1.map((row) => [
                row.Trans_Type,
                formatAmount(row.Trans_Amount),
            ]),

            styles: {
                fontSize: 8,
                cellPadding: 1.5,
            },

            headStyles: {
                fillColor: [220, 220, 220],
                textColor: 0,
            },
        });

        /* -----------------------------
           DATA 2 (CENTER)
        ------------------------------ */

        autoTable(doc, {
            startY: 30,
            margin: { left: 90 },
            tableWidth: 80,

            head: [["Trans Type", "Count", "Amount"]],

            body: reportData.Data2.map((row) => [
                row.Trans_Type,
                row.Trans_Count,
                formatAmount(row.Trans_Amount),
            ]),

            styles: {
                fontSize: 8,
                cellPadding: 1.5,
            },

            headStyles: {
                fillColor: [220, 220, 220],
                textColor: 0,
            },
        });

        /* -----------------------------
           DATA 4 (RIGHT)
        ------------------------------ */

        autoTable(doc, {
            startY: 30,
            margin: { left: 185 },
            tableWidth: 85,

            head: [["Type", "Count", "Amount"]],

            body: reportData.Data4.map((row) => [
                row.Trans_Type,
                row.Trans_Count,
                formatAmount(row.Trans_Amount),
            ]),

            styles: {
                fontSize: 8,
                cellPadding: 1.5,
            },

            headStyles: {
                fillColor: [220, 220, 220],
                textColor: 0,
            },
        });

        /* -----------------------------
           DATA 3 GROUPED SUMMARY
        ------------------------------ */

        type GroupedRow = {
            transType: string;
            receiptCredit: number;
            receiptDebit: number;
            paymentCredit: number;
            paymentDebit: number;
        };

        const groupedData: GroupedRow[] =
            Object.values(
                reportData.Data3.reduce(
                    (
                        acc: Record<string, GroupedRow>,
                        row
                    ) => {

                        const key =
                            row.Master_Name ||
                            "Others";

                        if (!acc[key]) {
                            acc[key] = {
                                transType: key,
                                receiptCredit: 0,
                                receiptDebit: 0,
                                paymentCredit: 0,
                                paymentDebit: 0,
                            };
                        }

                        const type =
                            row.Trans_Type?.toUpperCase();

                        if (
                            type === "RECEIPT" ||
                            type === "RECEIPTS"
                        ) {
                            acc[key].receiptCredit += Number(
                                row.Credit_Amount || 0
                            );

                            acc[key].receiptDebit += Number(
                                row.Debit_Amount || 0
                            );
                        }

                        if (
                            type === "PAYMENT" ||
                            type === "PAYMENTS"
                        ) {
                            acc[key].paymentCredit += Number(
                                row.Credit_Amount || 0
                            );

                            acc[key].paymentDebit += Number(
                                row.Debit_Amount || 0
                            );
                        }

                        return acc;

                    },
                    {}
                )
            );

        autoTable(doc, {
            startY: 105,

            head: [
                [
                    "S.No",
                    "Trans Type",
                    "Receipt Credit",
                    "Receipt Debit",
                    "Payment Credit",
                    "Payment Debit",
                ],
            ],

            body: groupedData.map(
                (row, index) => [
                    index + 1,
                    row.transType,
                    formatAmount(
                        row.receiptCredit
                    ),
                    formatAmount(
                        row.receiptDebit
                    ),
                    formatAmount(
                        row.paymentCredit
                    ),
                    formatAmount(
                        row.paymentDebit
                    ),
                ]
            ),

            styles: {
                fontSize: 8,
                cellPadding: 1.5,
            },

            headStyles: {
                fillColor: [220, 220, 220],
                textColor: 0,
            },

            foot: [[
                "",
                "TOTAL",

                formatAmount(
                    groupedData.reduce(
                        (s, r) =>
                            s + r.receiptCredit,
                        0
                    )
                ),

                formatAmount(
                    groupedData.reduce(
                        (s, r) =>
                            s + r.receiptDebit,
                        0
                    )
                ),

                formatAmount(
                    groupedData.reduce(
                        (s, r) =>
                            s + r.paymentCredit,
                        0
                    )
                ),

                formatAmount(
                    groupedData.reduce(
                        (s, r) =>
                            s + r.paymentDebit,
                        0
                    )
                ),
            ]],

            footStyles: {
                fillColor: [240, 240, 240],
                textColor: 0,
                fontStyle: "bold",
            },
        });

        doc.save(
            `Day_Abstract_Report_${dayjs().format(
                "DDMMYYYY_HHmmss"
            )}.pdf`
        );
    };

    const formatAmount = (
        value: number | undefined
    ) => {
        return Number(value || 0).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        );
    };

    /* ================= SECTION HEADER ================= */

    const SectionTitle = ({
        title,
    }: {
        title: string;
    }) => (
        <Typography
            sx={{
                p: 1,
                fontWeight: 700,
                fontSize: "0.9rem",
                backgroundColor: "#1E3A8A",
                color: "#fff",
            }}
        >
            {title}
        </Typography>
    );

    const compactTableStyle = {
        width: "fit-content",
        minWidth: "unset",

        "& .MuiTableCell-root": {
            border: "1px solid #CFCFCF",
            py: 0.35,
            px: 0.8,
            fontSize: "0.78rem",
            whiteSpace: "nowrap",
        },

        "& .MuiTableHead-root .MuiTableCell-root": {
            fontWeight: 700,
            backgroundColor: "#E8E8E8",
        },
    };

    /* ================= DATA1 TABLE ================= */

    const renderData1Table = () => {

        if (!reportData?.Data1?.length) {
            return (
                <Paper
                    sx={{
                        mb: 2,
                        display: "inline-block",
                    }}
                >
                    <SectionTitle title="Data 1 - Summary" />

                    <Box p={3}>
                        <Typography align="center">
                            No Data Available
                        </Typography>
                    </Box>
                </Paper>
            );
        }

        const totalAmount =
            reportData.Data1.reduce(
                (sum, row) =>
                    sum + Number(row.Trans_Amount || 0),
                0
            );

        return (
            <Paper
                sx={{
                    mb: 2,
                    display: "inline-block",
                }}
            >
                <SectionTitle title="Data 1 - Summary" />

                <TableContainer>
                    <Table
                        size="small"
                        sx={{
                            ...compactTableStyle,
                            minWidth: 350,
                        }}
                    >
                        <TableHead>
                            <TableRow
                                sx={{
                                    backgroundColor: "#E2E8F0",
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Transaction Type
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Amount
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {reportData.Data1.map(
                                (row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {row.Trans_Type}
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatAmount(
                                                row.Trans_Amount
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            )}

                            <TableRow
                                sx={{
                                    backgroundColor: "#F8FAFC",
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    TOTAL
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {formatAmount(
                                        totalAmount
                                    )}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    /* ================= DATA2 TABLE ================= */

    const renderData2Table = () => {

        if (!reportData?.Data2?.length) {
            return (
                <Paper sx={{ mb: 2 }}>
                    <SectionTitle title="Data 2 - Transaction Summary" />

                    <Box p={3}>
                        <Typography align="center">
                            No Data Available
                        </Typography>
                    </Box>
                </Paper>
            );
        }

        const totalCount =
            reportData.Data2.reduce(
                (sum, row) =>
                    sum + Number(row.Trans_Count || 0),
                0
            );

        const totalAmount =
            reportData.Data2.reduce(
                (sum, row) =>
                    sum + Number(row.Trans_Amount || 0),
                0
            );

        return (
            <Paper sx={{ mb: 2 }}>
                <SectionTitle title="Data 2 - Transaction Summary" />

                <TableContainer>
                    <Table
                        size="small"
                        sx={{
                            ...compactTableStyle,
                            minWidth: 500,
                        }}
                    >
                        <TableHead>
                            <TableRow
                                sx={{
                                    backgroundColor: "#E2E8F0",
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Transaction Type
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Count
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Amount
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {reportData.Data2.map(
                                (row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {row.Trans_Type}
                                        </TableCell>

                                        <TableCell align="right">
                                            {row.Trans_Count}
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatAmount(
                                                row.Trans_Amount
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            )}

                            <TableRow
                                sx={{
                                    backgroundColor: "#F8FAFC",
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    TOTAL
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {totalCount}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {formatAmount(
                                        totalAmount
                                    )}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    /* ================= DATA3 TABLE ================= */

    const renderData3Table = () => {

        if (!reportData?.Data3?.length) {
            return (
                <Paper sx={{ mb: 2 }}>
                    <SectionTitle title="Data 3 - Ledger Summary" />

                    <Box p={3}>
                        <Typography align="center">
                            No Data Available
                        </Typography>
                    </Box>
                </Paper>
            );
        }

        type GroupedRow = {
            transType: string;
            receiptCredit: number;
            receiptDebit: number;
            paymentCredit: number;
            paymentDebit: number;
        };

        const groupedData: GroupedRow[] = Object.values(
            reportData.Data3.reduce(
                (
                    acc: Record<string, GroupedRow>,
                    row
                ) => {

                    const key = row.Master_Name;

                    if (!acc[key]) {
                        acc[key] = {
                            transType: key,
                            receiptCredit: 0,
                            receiptDebit: 0,
                            paymentCredit: 0,
                            paymentDebit: 0,
                        };
                    }

                    const transType =
                        row.Trans_Type?.toUpperCase() || "";

                    if (
                        transType === "RECEIPTS" ||
                        transType === "RECEIPT"
                    ) {
                        acc[key].receiptCredit += Number(
                            row.Credit_Amount || 0
                        );

                        acc[key].receiptDebit += Number(
                            row.Debit_Amount || 0
                        );
                    }

                    if (
                        transType === "PAYMENTS" ||
                        transType === "PAYMENT"
                    ) {
                        acc[key].paymentCredit += Number(
                            row.Credit_Amount || 0
                        );

                        acc[key].paymentDebit += Number(
                            row.Debit_Amount || 0
                        );
                    }

                    return acc;

                },
                {}
            )
        );

        const totalReceiptCredit =
            groupedData.reduce(
                (sum, row) =>
                    sum + row.receiptCredit,
                0
            );

        const totalReceiptDebit =
            groupedData.reduce(
                (sum, row) =>
                    sum + row.receiptDebit,
                0
            );

        const totalPaymentCredit =
            groupedData.reduce(
                (sum, row) =>
                    sum + row.paymentCredit,
                0
            );

        const totalPaymentDebit =
            groupedData.reduce(
                (sum, row) =>
                    sum + row.paymentDebit,
                0
            );

        return (
            <Paper
                sx={{
                    mb: 2,
                    display: "inline-block",
                }}
            >
                <SectionTitle title="Data 3 - Ledger Summary" />

                <TableContainer
                    sx={{
                        width: "fit-content",
                    }}
                >
                    <Table
                        size="small"
                        sx={{
                            ...compactTableStyle,
                            width: "fit-content",
                        }}
                    >
                        <TableHead>

                            <TableRow
                                sx={{
                                    backgroundColor: "#D9D9D9",
                                }}
                            >
                                <TableCell
                                    rowSpan={2}
                                    sx={{
                                        fontWeight: 700,
                                        textAlign: "center",
                                    }}
                                >
                                    S.No
                                </TableCell>

                                <TableCell
                                    rowSpan={2}
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Trans Type
                                </TableCell>

                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Receipt
                                </TableCell>

                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Payment
                                </TableCell>
                            </TableRow>

                            <TableRow
                                sx={{
                                    backgroundColor: "#E5E5E5",
                                }}
                            >
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Credit
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Debit
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Credit
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    Debit
                                </TableCell>
                            </TableRow>

                        </TableHead>

                        <TableBody>

                            {groupedData.map(
                                (row, index) => (
                                    <TableRow key={index}>

                                        <TableCell
                                            align="center"
                                        >
                                            {index + 1}
                                        </TableCell>

                                        <TableCell>
                                            {row.transType}
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatAmount(
                                                row.receiptCredit
                                            )}
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatAmount(
                                                row.receiptDebit
                                            )}
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatAmount(
                                                row.paymentCredit
                                            )}
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatAmount(
                                                row.paymentDebit
                                            )}
                                        </TableCell>

                                    </TableRow>
                                )
                            )}

                            <TableRow
                                sx={{
                                    backgroundColor: "#F5F5F5",
                                }}
                            >
                                <TableCell />

                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    TOTAL
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {formatAmount(
                                        totalReceiptCredit
                                    )}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {formatAmount(
                                        totalReceiptDebit
                                    )}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {formatAmount(
                                        totalPaymentCredit
                                    )}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {formatAmount(
                                        totalPaymentDebit
                                    )}
                                </TableCell>

                            </TableRow>

                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    /* ================= DATA4 TABLE ================= */

    const renderData4Table = () => {

        if (!reportData?.Data4?.length) {
            return (
                <Paper sx={{ mb: 2 }}>
                    <SectionTitle title="Data 4 - Sales Split" />

                    <Box p={3}>
                        <Typography align="center">
                            No Data Available
                        </Typography>
                    </Box>
                </Paper>
            );
        }

        const totalCount =
            reportData.Data4.reduce(
                (sum, row) =>
                    sum + Number(row.Trans_Count || 0),
                0
            );

        const totalAmount =
            reportData.Data4.reduce(
                (sum, row) =>
                    sum + Number(row.Trans_Amount || 0),
                0
            );

        return (
            <Paper sx={{ mb: 2 }}>
                <SectionTitle title="Data 4 - Sales Split" />

                <TableContainer>
                    <Table
                        size="small"
                        sx={{
                            ...compactTableStyle,
                            minWidth: 350,
                        }}
                    >
                        <TableHead>
                            <TableRow
                                sx={{
                                    backgroundColor: "#E2E8F0",
                                }}
                            >
                                <TableCell sx={{ fontWeight: 700 }}>
                                    Transaction Type
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Count
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Amount
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {reportData.Data4.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        {row.Trans_Type}
                                    </TableCell>

                                    <TableCell align="right">
                                        {row.Trans_Count}
                                    </TableCell>

                                    <TableCell align="right">
                                        {formatAmount(
                                            row.Trans_Amount
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}

                            <TableRow
                                sx={{
                                    backgroundColor: "#F8FAFC",
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    TOTAL
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {totalCount}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {formatAmount(totalAmount)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        );
    };

    const systemClosing =
        reportData?.Data1?.reduce(
            (sum, row) => sum + Number(row.Trans_Amount || 0),
            0
        ) || 0;

    const difference =
        systemClosing - Number(dayClosing || 0);

    /* ================= LOADING ================= */

    const renderLoading = () => {

        if (!loading) return null;

        return (
            <Box
                sx={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    backgroundColor: "rgba(255,255,255,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    };

    /* ================= EXPANDED EMPTY ================= */

    const renderExpandedEmpty = () => (
        <Paper sx={{ p: 4, mb: 2 }}>
            <Typography
                align="center"
                variant="h6"
                color="text.secondary"
            >
                No Saved Snapshot Available
            </Typography>

            <Typography
                align="center"
                variant="body2"
                color="text.secondary"
            >
                Click Save Snapshot in Abstract mode
                to store the current report.
            </Typography>
        </Paper>
    );

    /* ================= RENDER ================= */

    return (
        <>
            <PageHeader
                toggleMode={toggleMode}
                onToggleChange={setToggleMode}
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
            />

            <ReportFilterDrawer
                open={drawerOpen}
                onToggle={() => setDrawerOpen((p) => !p)}
                onClose={() => setDrawerOpen(false)}
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onApply={loadReport}
            />

            {renderLoading()}

            <AppLayout fullWidth>
                <Box
                    sx={{
                        p: 1,
                        backgroundColor: "#fff",
                        minHeight: "100vh",
                    }}
                >

                    {/* ACTION BUTTONS */}
                    <Box
                        sx={{
                            mb: 2,
                            p: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            flexWrap: "wrap",
                        }}
                    >
                        {/* SYSTEM CLOSING */}

                        <Box>
                            <Typography
                                sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    mb: 0.5,
                                }}
                            >
                                System Closing
                            </Typography>

                            <TextField
                                size="small"
                                value={formatAmount(systemClosing)}
                                InputProps={{
                                    readOnly: true,
                                }}
                                sx={{
                                    width: 180,
                                    "& input": {
                                        textAlign: "right",
                                        fontWeight: 700,
                                        color: "#0B7A0B",
                                    },
                                }}
                            />
                        </Box>

                        {/* DAY CLOSING */}

                        <Box>
                            <Typography
                                sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    mb: 0.5,
                                }}
                            >
                                Day Closing
                            </Typography>

                            <TextField
                                size="small"
                                value={dayClosing}
                                onChange={(e) =>
                                    setDayClosing(e.target.value)
                                }
                                sx={{
                                    width: 180,
                                    "& input": {
                                        textAlign: "right",
                                        fontWeight: 700,
                                    },
                                }}
                            />
                        </Box>

                        {/* DIFFERENCE */}

                        <Box>
                            <Typography
                                sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    mb: 0.5,
                                }}
                            >
                                Difference
                            </Typography>

                            <TextField
                                size="small"
                                value={formatAmount(difference)}
                                InputProps={{
                                    readOnly: true,
                                }}
                                sx={{
                                    width: 180,
                                    "& input": {
                                        textAlign: "right",
                                        fontWeight: 700,
                                        color:
                                            difference === 0
                                                ? "#0B7A0B"
                                                : "#D32F2F",
                                    },
                                }}
                            />
                        </Box>

                        {/* SAVE BUTTON */}

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSaveSnapshot}
                            disabled={!liveData}
                            sx={{
                                height: 40,
                                mt: 2.5,
                                borderRadius: 5
                            }}
                        >
                            Save
                        </Button>
                    </Box>

                    {/* EXPANDED EMPTY STATE */}

                    {toggleMode === "Expanded" &&
                        !savedData &&
                        renderExpandedEmpty()}

                    {/* REPORT TABLES */}

                    {reportData && (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                            }}
                        >

                            {/* Top Row */}
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "flex-start",
                                    flexWrap: "wrap",
                                }}
                            >
                                {renderData1Table()}
                                {renderData2Table()}
                                {renderData4Table()}
                            </Box>

                            {/* Bottom Row */}
                            <Box>
                                {renderData3Table()}
                            </Box>

                        </Box>
                    )}
                </Box>
            </AppLayout>
        </>
    );
};

export default DayAbstractReport;