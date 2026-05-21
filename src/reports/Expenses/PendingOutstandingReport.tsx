import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

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
} from "@mui/material";

import { useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../Layout/PageHeader";
import CommonPagination from "../../Components/CommonPagination";

import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { toast } from "react-toastify";

import { PartyOutstandingService } from "../../services/partyOutstanding.service";
import AppLayout from "../../Layout/appLayout";

const PendingOutstandingReport: React.FC = () => {
    const { accId } = useParams();
    const today = dayjs().format("YYYY-MM-DD");
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [fromDate] = useState(today);

    const [toDate] = useState(today);

    const [page, setPage] = useState(1);

    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [searchParams] =
        useSearchParams();

    const partyName =
        searchParams.get(
            "partyName"
        ) || "";

    /* ================= LOAD DATA ================= */

    const loadData =
        async () => {
            try {
                setLoading(true);

                const res =
                    await PartyOutstandingService.getPendingOutstanding(
                        accId || "",
                        fromDate,
                        toDate
                    );

                setRows(
                    res.data.data || []
                );
            } catch (err) {
                console.error(err);

                toast.error(
                    "Failed to load pending outstanding"
                );
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        if (accId) {
            loadData();
        }
    }, [
        accId,
        fromDate,
        toDate,
    ]);

    /* ================= PAGINATION ================= */

    const finalRows =
        useMemo(() => {
            const start =
                (page - 1) *
                rowsPerPage;

            return rows.slice(
                start,
                start + rowsPerPage
            );
        }, [
            rows,
            page,
            rowsPerPage,
        ]);

    /* ================= EXPORT EXCEL ================= */

    const handleExportExcel =
        () => {
            const exportRows =
                rows.map(
                    (
                        row,
                        index
                    ) => ({
                        SNo:
                            index + 1,

                        VoucherNo:
                            row.voucherNumber,

                        EventDate:
                            dayjs(
                                row.eventDate
                            ).format(
                                "DD-MM-YYYY"
                            ),

                        TotalValue:
                            row.totalValue,

                        DataSource:
                            row.dataSource,

                        ActualSource:
                            row.actualSource,

                        AgainstAmount:
                            row.againstAmount,

                        JournalAdjustment:
                            row.journalAdjustment,

                        AccountSide:
                            row.accountSide,

                        BillRefNo:
                            row.BillRefNo,

                        BalanceAmount:
                            row.BalanceAmount,
                    })
                );

            const ws =
                XLSX.utils.json_to_sheet(
                    exportRows
                );

            const wb =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                wb,
                ws,
                "Pending Outstanding"
            );

            XLSX.writeFile(
                wb,
                `PendingOutstanding_${dayjs().format(
                    "DDMMYYYY"
                )}.xlsx`
            );
        };

    /* ================= EXPORT PDF ================= */

    const handleExportPDF =
        () => {
            const doc =
                new jsPDF(
                    "landscape"
                );

            doc.text(
                "Pending Outstanding Report",
                14,
                10
            );

            autoTable(doc, {
                startY: 20,

                head: [[
                    "SNo",
                    "Voucher No",
                    "Date",
                    "Total Value",
                    "Data Source",
                    "Actual Source",
                    "Against Amount",
                    "Journal Adj",
                    "Account Side",
                    "Bill Ref No",
                    "Balance Amount",
                ]],

                body:
                    rows.map(
                        (
                            row,
                            index
                        ) => [
                                index + 1,

                                row.voucherNumber,

                                dayjs(
                                    row.eventDate
                                ).format(
                                    "DD-MM-YYYY"
                                ),

                                row.totalValue,

                                row.dataSource,

                                row.actualSource,

                                row.againstAmount,

                                row.journalAdjustment,

                                row.accountSide,

                                row.BillRefNo,

                                row.BalanceAmount,
                            ]
                    ),

                styles: {
                    fontSize: 7,
                },
            });

            doc.save(
                "PendingOutstanding.pdf"
            );
        };

    return (
        < >
            <PageHeader
                onExportPDF={
                    handleExportPDF
                }
                onExportExcel={
                    handleExportExcel
                }
            />

            <AppLayout fullWidth>

                <Box p={2}>
                    <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        mb={2}
                    >
                        <Typography
                            fontWeight={700}
                        >
                            {`Pending Balance of ${decodeURIComponent(
                                partyName || ""
                            )
                                }`}
                        </Typography>
                    </Box>

                    <Paper elevation={2}>
                        <TableContainer
                            sx={{
                                maxHeight: "72vh",
                            }}
                        >
                            <Table
                                stickyHeader
                                size="small"
                            >
                                <TableHead
                                    sx={{
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 5,
                                    }}
                                >
                                    {/* HEADER */}
                                    <TableRow
                                        sx={{
                                            background: "#1E3A8A",
                                        }}
                                    >
                                        {[
                                            "S.No",
                                            "Voucher No",
                                            "Date",
                                            "Source",
                                            "Dr / CR",
                                            "Total",
                                            "Pending",
                                        ].map((header) => (
                                            <TableCell
                                                key={header}
                                                align={
                                                    ["Total", "Pending"].includes(
                                                        header
                                                    )
                                                        ? "right"
                                                        : "left"
                                                }
                                                sx={{
                                                    color: "#fff",
                                                    fontWeight: 500,
                                                    background:
                                                        "#1E3A8A",
                                                    whiteSpace:
                                                        "nowrap",
                                                    borderBottom:
                                                        "none",
                                                }}
                                            >
                                                {header}
                                            </TableCell>
                                        ))}
                                    </TableRow>

                                    {/* TOTAL ROW */}
                                    <TableRow
                                        sx={{
                                            background: "#F3F4F6",
                                        }}
                                    >
                                        <TableCell
                                            sx={{
                                                fontWeight: 700,
                                            }}
                                        >
                                            Total
                                        </TableCell>

                                        <TableCell />
                                        <TableCell />
                                        <TableCell />
                                        <TableCell />

                                        {/* TOTAL */}
                                        <TableCell
                                            align="right"
                                            sx={{
                                                fontWeight: 700,
                                            }}
                                        >
                                            {Number(
                                                finalRows.reduce(
                                                    (
                                                        sum,
                                                        row
                                                    ) =>
                                                        sum +
                                                        Number(
                                                            row.totalValue ||
                                                            0
                                                        ),
                                                    0
                                                )
                                            ).toLocaleString(
                                                "en-IN",
                                                {
                                                    minimumFractionDigits: 2,
                                                }
                                            )}
                                        </TableCell>

                                        {/* PENDING */}
                                        <TableCell
                                            align="right"
                                            sx={{
                                                fontWeight: 700,
                                            }}
                                        >
                                            {Number(
                                                finalRows.reduce(
                                                    (
                                                        sum,
                                                        row
                                                    ) =>
                                                        sum +
                                                        Number(
                                                            row.BalanceAmount ||
                                                            0
                                                        ),
                                                    0
                                                )
                                            ).toLocaleString(
                                                "en-IN",
                                                {
                                                    minimumFractionDigits: 2,
                                                }
                                            )}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody
                                    sx={{
                                        background: "#fefeff",
                                    }}
                                >
                                    {loading ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                align="center"
                                            >
                                                <CircularProgress />
                                            </TableCell>
                                        </TableRow>
                                    ) : finalRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                align="center"
                                            >
                                                No Data Found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        finalRows.map(
                                            (
                                                row,
                                                index
                                            ) => (
                                                <TableRow
                                                    key={index}
                                                    hover
                                                    sx={{
                                                        background:"#ffffff"
                                                    }}
                                                >
                                                    {/* S.NO */}
                                                    <TableCell>
                                                        {(page - 1) *
                                                            rowsPerPage +
                                                            index +
                                                            1}
                                                    </TableCell>

                                                    {/* Voucher No */}
                                                    <TableCell>
                                                        {
                                                            row.voucherNumber
                                                        }
                                                    </TableCell>

                                                    {/* Date */}
                                                    <TableCell>
                                                        {row.eventDate
                                                            ? dayjs(
                                                                row.eventDate
                                                            ).format(
                                                                "DD-MM-YYYY"
                                                            )
                                                            : ""}
                                                    </TableCell>

                                                    {/* Source */}
                                                    <TableCell>
                                                        {
                                                            row.actualSource
                                                        }
                                                    </TableCell>

                                                    {/* Dr / CR */}
                                                    <TableCell>
                                                        {
                                                            row.accountSide
                                                        }
                                                    </TableCell>

                                                    {/* Total */}
                                                    <TableCell
                                                        align="right"
                                                    >
                                                        {Number(
                                                            row.totalValue ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </TableCell>

                                                    {/* Pending */}
                                                    <TableCell
                                                        align="right"
                                                        sx={{
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {Number(
                                                            row.BalanceAmount ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                minimumFractionDigits: 2,
                                                            }
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    <Box mt={2}>
                        <CommonPagination
                            totalRows={rows.length}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setPage}
                            onRowsPerPageChange={(value: number) => {
                                setRowsPerPage(value);
                                setPage(1);
                            }}
                        />
                    </Box>
                </Box>

            </AppLayout>
        </>
    );
};

export default PendingOutstandingReport;