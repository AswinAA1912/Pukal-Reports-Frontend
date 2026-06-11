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
                        .format("YYYY-MM-DD"),

                    Fromdate: dayjs(fromDate)
                        .format("YYYY-MM-DD"),

                    Todate: dayjs(toDate)
                        .format("YYYY-MM-DD"),
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

    const handleExportExcel = () => {
        if (!reportData) {
            toast.warning("No data available");
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([]);

        let row = 1;

        XLSX.utils.sheet_add_aoa(
            ws,
            [[`DAY ABSTRACT REPORT (${fromDate} To ${toDate})`]],
            { origin: `A${row}` }
        );

        row += 2;

        /* =========================
           DATA 1
        ========================= */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 1"]],
            { origin: `A${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data1 || [],
            {
                origin: `A${row + 1}`,
                skipHeader: false,
            }
        );

        /* =========================
           DATA 2
        ========================= */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 2"]],
            { origin: `E${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data2 || [],
            {
                origin: `E${row + 1}`,
                skipHeader: false,
            }
        );

        /* =========================
           DATA 4
        ========================= */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 4"]],
            { origin: `J${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data4 || [],
            {
                origin: `J${row + 1}`,
                skipHeader: false,
            }
        );

        row += Math.max(
            reportData.Data1?.length || 0,
            reportData.Data2?.length || 0,
            reportData.Data4?.length || 0
        ) + 6;

        /* =========================
           DATA 7
        ========================= */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 7"]],
            { origin: `A${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data7 || [],
            {
                origin: `A${row + 1}`,
                skipHeader: false,
            }
        );

        row += (reportData.Data7?.length || 0) + 5;

        /* =========================
           DATA 8
        ========================= */

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 8"]],
            { origin: `A${row}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data8 || [],
            {
                origin: `A${row + 1}`,
                skipHeader: false,
            }
        );

        /* =========================
           RIGHT SIDE TABLES
        ========================= */

        let rightRow = 4;

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 3"]],
            { origin: `P${rightRow}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data3 || [],
            {
                origin: `P${rightRow + 1}`,
                skipHeader: false,
            }
        );

        rightRow += (reportData.Data3?.length || 0) + 6;

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 5"]],
            { origin: `P${rightRow}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data5 || [],
            {
                origin: `P${rightRow + 1}`,
                skipHeader: false,
            }
        );

        rightRow += 8;

        XLSX.utils.sheet_add_aoa(
            ws,
            [["DATA 6"]],
            { origin: `P${rightRow}` }
        );

        XLSX.utils.sheet_add_json(
            ws,
            reportData.Data6 || [],
            {
                origin: `P${rightRow + 1}`,
                skipHeader: false,
            }
        );

        ws["!cols"] = Array(30).fill({
            wch: 20,
        });

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

        const doc = new jsPDF("landscape", "mm", "a4");

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");

        doc.text(
            `DAY ABSTRACT REPORT (${fromDate} TO ${toDate})`,
            148,
            12,
            { align: "center" }
        );

        let currentY = 20;

        const addTitle = (title: string) => {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(title, 14, currentY);
            currentY += 4;
        };

        /* ================= DATA 1 ================= */

        addTitle("DATA 1");

        autoTable(doc, {
            startY: currentY,
            head: [["Type", "Amount"]],
            body: (reportData.Data1 || []).map((r) => [
                r.Trans_Type,
                formatAmount(r.Trans_Amount),
            ]),
            styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        /* ================= DATA 2 ================= */

        addTitle("DATA 2");

        autoTable(doc, {
            startY: currentY,
            head: [["Type", "Count", "Amount"]],
            body: (reportData.Data2 || []).map((r) => [
                r.Trans_Type,
                r.Trans_Count,
                formatAmount(r.Trans_Amount),
            ]),
            styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        /* ================= DATA 4 ================= */

        addTitle("DATA 4");

        autoTable(doc, {
            startY: currentY,
            head: [["Type", "Count", "Amount"]],
            body: (reportData.Data4 || []).map((r) => [
                r.Trans_Type,
                r.Trans_Count,
                formatAmount(r.Trans_Amount),
            ]),
            styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        /* ================= DATA 7 ================= */

        addTitle("DATA 7");

        autoTable(doc, {
            startY: currentY,
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
            body: (reportData.Data7 || []).map((r, i) => [
                i + 1,
                r.Trans_Type,
                formatAmount(r.Credit_Amount),
                formatAmount(r.Debit_Amount),
                formatAmount(r.Credit_Amount_1),
                formatAmount(r.Debit_Amount_1),
            ]),
            styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        /* ================= DATA 8 ================= */

        addTitle("DATA 8");

        autoTable(doc, {
            startY: currentY,
            head: [
                [
                    "S.No",
                    "Trans Type",
                    "Debtors Credit",
                    "Debtors Debit",
                    "Creditors Credit",
                    "Creditors Debit",
                ],
            ],
            body: (reportData.Data8 || []).map((r, i) => [
                i + 1,
                r.Trans_Type,
                formatAmount(r.Credit_Amount),
                formatAmount(r.Debit_Amount),
                formatAmount(r.Credit_Amount_1),
                formatAmount(r.Debit_Amount_1),
            ]),
            styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        /* ================= DATA 3 ================= */

        addTitle("DATA 3");

        autoTable(doc, {
            startY: currentY,
            head: [["Master Name", "Credit", "Debit"]],
            body: (reportData.Data3 || []).map((r) => [
                r.Master_Name,
                formatAmount(r.Credit_Amount),
                formatAmount(r.Debit_Amount),
            ]),
            styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        /* ================= DATA 5 ================= */

        addTitle("DATA 5");

        autoTable(doc, {
            startY: currentY,
            head: [["Type", "Amount"]],
            body: [
                ["Receivable", formatAmount(reportData.Data5?.[0]?.Cr_Amount)],
                ["Payable", formatAmount(reportData.Data5?.[0]?.Dr_Amount)],
                ["Exp", formatAmount(reportData.Data5?.[0]?.OPB_Amount)],
            ],
            styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        /* ================= DATA 6 ================= */

        addTitle("DATA 6");

        autoTable(doc, {
            startY: currentY,
            head: [["Type", "Amount"]],
            body: [
                ["Opening", formatAmount(reportData.Data6?.[0]?.OB_Amount)],
                ["Credit", formatAmount(reportData.Data6?.[0]?.Credit_Amt)],
                ["Debit", formatAmount(reportData.Data6?.[0]?.Debit_Amt)],
                ["Closing", formatAmount(reportData.Data6?.[0]?.Bal_Amount)],
            ],
            styles: { fontSize: 8 },
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

    // const SectionTitle = ({
    //     title,
    // }: {
    //     title: string;
    // }) => (
    //     <Typography
    //         sx={{
    //             py: 0.4,
    //             px: 1,
    //             fontWeight: 700,
    //             fontSize: "0.75rem",
    //             backgroundColor: "#1E3A8A",
    //             color: "#fff",
    //             lineHeight: 1.2,
    //         }}
    //     >
    //         {title}
    //     </Typography>
    // );

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
            backgroundColor: "#1E3A8A",
            color: "#fff",
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
                                    rowSpan={2}
                                    sx={{ fontWeight: 700 }}
                                >
                                    S.No
                                </TableCell>
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
                                            {index + 1}
                                        </TableCell>

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

                                <TableCell />

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
                                    rowSpan={2}
                                    sx={{ fontWeight: 700 }}
                                >
                                    S.No
                                </TableCell>
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
                                            {index + 1}
                                        </TableCell>

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

                                <TableCell />

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

    const getLedgerGroups = () => {

        if (!reportData?.Data3?.length) return [];

        const grouped = reportData.Data3.reduce(
            (acc: any, row: any) => {

                const master =
                    row.Master_Name || "Others";

                const group =
                    row.group_name || "Others";

                if (!acc[master]) {
                    acc[master] = {};
                }

                if (!acc[master][group]) {
                    acc[master][group] = [];
                }

                acc[master][group].push(row);

                return acc;
            },
            {}
        );

        return grouped;
    };

    const renderData3Table = () => {

        const groups = getLedgerGroups();

        let sno = 1;

        return (
            <Paper sx={{ mb: 2 }}>

                <TableContainer>
                    <Table
                        size="small"
                        sx={{
                            ...compactTableStyle,
                            minWidth: 900,
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>S No</TableCell>
                                <TableCell>Expenses</TableCell>
                                <TableCell align="right">
                                    Credit
                                </TableCell>
                                <TableCell align="right">
                                    Debit
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>

                            {Object.entries(groups).map(
                                ([master, grpObj]: any) => (
                                    <React.Fragment key={master}>

                                        <TableRow
                                            sx={{
                                                backgroundColor:
                                                    "#dbeafe",
                                            }}
                                        >
                                            <TableCell
                                                colSpan={4}
                                                sx={{
                                                    fontWeight: 700,
                                                    color: "blue",
                                                }}
                                            >
                                                {master}
                                            </TableCell>
                                        </TableRow>

                                        {Object.entries(grpObj).map(
                                            ([group, ledgers]: any) => {

                                                const totalCredit =
                                                    ledgers.reduce(
                                                        (
                                                            s: number,
                                                            x: any
                                                        ) =>
                                                            s +
                                                            Number(
                                                                x.Credit_Amount ||
                                                                0
                                                            ),
                                                        0
                                                    );

                                                const totalDebit =
                                                    ledgers.reduce(
                                                        (
                                                            s: number,
                                                            x: any
                                                        ) =>
                                                            s +
                                                            Number(
                                                                x.Debit_Amount ||
                                                                0
                                                            ),
                                                        0
                                                    );

                                                return (
                                                    <React.Fragment
                                                        key={group}
                                                    >
                                                        <TableRow
                                                            sx={{
                                                                backgroundColor:
                                                                    "#f3f4f6",
                                                            }}
                                                        >
                                                            <TableCell />
                                                            <TableCell
                                                                sx={{
                                                                    fontWeight:
                                                                        700,
                                                                    color:
                                                                        "blue",
                                                                }}
                                                            >
                                                                {group}
                                                            </TableCell>

                                                            <TableCell align="right">
                                                                {formatAmount(
                                                                    totalCredit
                                                                )}
                                                            </TableCell>

                                                            <TableCell align="right">
                                                                {formatAmount(
                                                                    totalDebit
                                                                )}
                                                            </TableCell>
                                                        </TableRow>

                                                        {ledgers.map(
                                                            (
                                                                row: any
                                                            ) => (
                                                                <TableRow
                                                                    key={
                                                                        sno
                                                                    }
                                                                >
                                                                    <TableCell>
                                                                        {
                                                                            sno++
                                                                        }
                                                                    </TableCell>

                                                                    <TableCell>
                                                                        {
                                                                            row.ledger_name
                                                                        }
                                                                    </TableCell>

                                                                    <TableCell align="right">
                                                                        {formatAmount(
                                                                            row.Credit_Amount
                                                                        )}
                                                                    </TableCell>

                                                                    <TableCell align="right">
                                                                        {formatAmount(
                                                                            row.Debit_Amount
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        )}
                                                    </React.Fragment>
                                                );
                                            }
                                        )}
                                    </React.Fragment>
                                )
                            )}
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
                                    rowSpan={2}
                                    sx={{ fontWeight: 700 }}
                                >
                                    S.No
                                </TableCell>
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
                                        {index + 1}
                                    </TableCell>

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

                                <TableCell />

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

    const renderData7And8 = () => {

        const renderTable = (
            title: string,
            rows: any[]
        ) => {

            const leftHeader =
                title === "Data 7"
                    ? "Receipt"
                    : "Sundry Debtors";

            const rightHeader =
                title === "Data 7"
                    ? "Payment"
                    : "Sundry Creditors";

            return (
                <Paper sx={{ mb: 2, width: "100%", }}>
                    <Table
                        size="small"
                        sx={{
                            ...compactTableStyle,
                            minWidth: 700,
                        }}
                    >

                        <TableHead>

                            {/* Main Header */}

                            <TableRow>

                                <TableCell
                                    rowSpan={2}
                                    sx={{ fontWeight: 700 }}
                                >
                                    S.No
                                </TableCell>

                                <TableCell
                                    rowSpan={2}
                                    sx={{ fontWeight: 700 }}
                                >
                                    Trans Type
                                </TableCell>

                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {leftHeader}
                                </TableCell>

                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {rightHeader}
                                </TableCell>

                            </TableRow>

                            {/* Sub Header */}

                            <TableRow>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Credit
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Debit
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Credit
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Debit
                                </TableCell>

                            </TableRow>

                        </TableHead>

                        <TableBody>

                            {rows.map((row, index) => (
                                <TableRow key={index}>

                                    <TableCell>
                                        {index + 1}
                                    </TableCell>

                                    <TableCell>
                                        {row.Trans_Type}
                                    </TableCell>

                                    {/* Sundry Debtors */}

                                    <TableCell align="right">
                                        {formatAmount(
                                            row.Credit_Amount
                                        )}
                                    </TableCell>

                                    <TableCell align="right">
                                        {formatAmount(
                                            row.Debit_Amount
                                        )}
                                    </TableCell>

                                    {/* Sundry Creditors */}

                                    <TableCell align="right">
                                        {formatAmount(
                                            row.Credit_Amount_1
                                        )}
                                    </TableCell>

                                    <TableCell align="right">
                                        {formatAmount(
                                            row.Debit_Amount_1
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
                                    colSpan={2}
                                    sx={{ fontWeight: 700 }}
                                >
                                    TOTAL
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {formatAmount(
                                        rows.reduce(
                                            (s, r) =>
                                                s +
                                                Number(
                                                    r.Credit_Amount || 0
                                                ),
                                            0
                                        )
                                    )}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {formatAmount(
                                        rows.reduce(
                                            (s, r) =>
                                                s +
                                                Number(
                                                    r.Debit_Amount || 0
                                                ),
                                            0
                                        )
                                    )}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {formatAmount(
                                        rows.reduce(
                                            (s, r) =>
                                                s +
                                                Number(
                                                    r.Credit_Amount_1 || 0
                                                ),
                                            0
                                        )
                                    )}
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {formatAmount(
                                        rows.reduce(
                                            (s, r) =>
                                                s +
                                                Number(
                                                    r.Debit_Amount_1 || 0
                                                ),
                                            0
                                        )
                                    )}
                                </TableCell>

                            </TableRow>

                        </TableBody>

                    </Table>
                </Paper>
            );
        };

        return (
            <Box>
                {renderTable(
                    "Data 7",
                    reportData?.Data7 || []
                )}

                {renderTable(
                    "Data 8",
                    reportData?.Data8 || []
                )}
            </Box>
        );
    };

    const renderData5And6 = () => {

        const debtors = reportData?.Data5?.[0];
        const creditors = reportData?.Data6?.[0];

        if (!debtors && !creditors) return null;

        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    minWidth: 500,
                    width: "100%",
                }}
            >

                {/* Top Table */}

                <Paper>
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
                                    backgroundColor: "#E8E8E8",
                                }}
                            >
                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Sundry Creditors
                                </TableCell>

                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Sundry Debtors
                                </TableCell>
                            </TableRow>

                            <TableRow
                                sx={{
                                    backgroundColor: "#F5F5F5",
                                }}
                            >
                                <TableCell sx={{ fontWeight: 700 }}>
                                    Type
                                </TableCell>

                                <TableCell
                                    align="right"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Amount
                                </TableCell>

                                <TableCell sx={{ fontWeight: 700 }}>
                                    Type
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

                            <TableRow>
                                <TableCell>
                                    Receivable
                                </TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        creditors?.Cr_Amount
                                    )}
                                </TableCell>

                                <TableCell>
                                    Receivable
                                </TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        debtors?.Cr_Amount
                                    )}
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell>
                                    Payable
                                </TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        creditors?.Dr_Amount
                                    )}
                                </TableCell>

                                <TableCell>
                                    Payable
                                </TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        debtors?.Dr_Amount
                                    )}
                                </TableCell>
                            </TableRow>

                            <TableRow sx={{
                                backgroundColor: "#F8FAFC",
                            }}>
                                <TableCell>
                                    Exp
                                </TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        creditors?.OPB_Amount
                                    )}
                                </TableCell>

                                <TableCell>
                                    Exp
                                </TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        debtors?.OPB_Amount
                                    )}
                                </TableCell>
                            </TableRow>

                        </TableBody>
                    </Table>
                </Paper>

                {/* Bottom Table */}

                <Paper>
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
                                    backgroundColor: "#E8E8E8",
                                }}
                            >
                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Sundry Creditors
                                </TableCell>

                                <TableCell
                                    colSpan={2}
                                    align="center"
                                    sx={{ fontWeight: 700 }}
                                >
                                    Sundry Debtors
                                </TableCell>
                            </TableRow>

                        </TableHead>

                        <TableBody>

                            <TableRow>
                                <TableCell>Opening</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        creditors?.OB_Amount
                                    )}
                                </TableCell>

                                <TableCell>Opening</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        debtors?.OB_Amount
                                    )}
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell>Credit</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        creditors?.Credit_Amt
                                    )}
                                </TableCell>

                                <TableCell>Credit</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        debtors?.Credit_Amt
                                    )}
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell>Debit</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        creditors?.Debit_Amt
                                    )}
                                </TableCell>

                                <TableCell>Debit</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        debtors?.Debit_Amt
                                    )}
                                </TableCell>
                            </TableRow>

                            <TableRow sx={{
                                backgroundColor: "#F8FAFC",
                            }}>
                                <TableCell>Closing</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        creditors?.Bal_Amount
                                    )}
                                </TableCell>

                                <TableCell>Closing</TableCell>

                                <TableCell align="right">
                                    {formatAmount(
                                        debtors?.Bal_Amount
                                    )}
                                </TableCell>
                            </TableRow>

                        </TableBody>
                    </Table>
                </Paper>

            </Box>
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
                                gap: 2,
                                alignItems: "flex-start",
                                overflowX: "auto",
                            }}
                        >
                            {/* LEFT SIDE */}

                            <Box
                                sx={{
                                    flex: "0 0 auto",
                                    minWidth: 850,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                {/* Top Row */}

                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    {renderData1Table()}
                                    {renderData2Table()}
                                    {renderData4Table()}
                                </Box>

                                {/* Bottom Row */}

                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 2,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    {renderData7And8()}
                                    {renderData5And6()}
                                </Box>
                            </Box>

                            {/* RIGHT SIDE */}

                            <Box
                                sx={{
                                    flex: "0 0 auto",
                                    minWidth: 900,
                                }}
                            >
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