import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    CircularProgress
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp, Edit } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { SettingsService } from "../services/reportSettings.services";
import { toast, ToastContainer } from "react-toastify";

// ✅ IMPORT HEADER
import Header, { HEADER_HEIGHT } from "../Layout/Header";

/* ================= TYPES ================= */

type TemplateType = {
    Type_Id: number;
    Report_Type: string;
};

type ReportItem = {
    Report_Id: number;
    Report_Name: string;
    templates: TemplateType[];
};

type GroupedReports = Record<string, ReportItem[]>;

/* ================= COMPONENT ================= */

const ReportList: React.FC = () => {
    const [grouped, setGrouped] = useState<GroupedReports>({});
    const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await SettingsService.getReportList();
            setGrouped(res.data.data || {});
        } catch (err) {
            console.error(err);
            toast.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (parent: string) => {
        setOpenRows((prev) => ({
            ...prev,
            [parent]: !prev[parent]
        }));
    };

    const handleCreate = () => {
        navigate("/settings");
    };

    const handleEdit = (reportId: number, typeId: number) => {
        navigate(`/settings?reportId=${reportId}&typeId=${typeId}`);
    };

    return (
        <>
            {/* ✅ HEADER */}
            <Header headerColor="#1E3A8A" />

            {/* ✅ PAGE CONTENT */}
            <Box sx={{ mt: `${HEADER_HEIGHT}px`, p: 2 }}>
                <ToastContainer />

                {/* TOP BAR */}
                <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">Report Templates</Typography>

                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        sx={{ textTransform: "none" }}
                    >
                        Create Template
                    </Button>
                </Box>

                <Paper sx={{ borderRadius: 2 }}>
                    {loading ? (
                        <Box p={3} textAlign="center">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow
                                    sx={{
                                        backgroundColor: "#1E3A8A",
                                        "& th": {
                                            color: "#fff",
                                            fontWeight: 600,
                                            borderBottom: "none"
                                        }
                                    }}
                                >
                                    <TableCell width={50}></TableCell>
                                    <TableCell>Parent Report</TableCell>
                                    <TableCell>Template Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell align="center">Action</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {Object.keys(grouped).map((parent) => (
                                    <React.Fragment key={parent}>

                                        {/* 🔷 PARENT ROW */}
                                        <TableRow
                                            sx={{
                                                backgroundColor: "#EEF2FF",
                                                "& td": { borderBottom: "1px solid #e0e0e0" }
                                            }}
                                        >
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleRow(parent)}
                                                >
                                                    {openRows[parent] ? (
                                                        <KeyboardArrowUp />
                                                    ) : (
                                                        <KeyboardArrowDown />
                                                    )}
                                                </IconButton>
                                            </TableCell>

                                            <TableCell colSpan={4}>
                                                <Typography fontWeight={600}>
                                                    {parent}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>

                                        {/* ✅ CHILD ROWS DIRECTLY */}
                                        {openRows[parent] &&
                                            grouped[parent].map((report) =>
                                                report.templates.map((type) => (
                                                    <TableRow
                                                        key={`${report.Report_Id}-${type.Type_Id}`}
                                                        hover
                                                        sx={{
                                                            "&:hover": {
                                                                backgroundColor: "#F9FAFB"
                                                            }
                                                        }}
                                                    >
                                                        {/* 1️⃣ Expand column */}
                                                        <TableCell width={50}></TableCell>

                                                        {/* 2️⃣ Parent column */}
                                                        <TableCell></TableCell>

                                                        {/* 3️⃣ Template Name */}
                                                        <TableCell sx={{ fontWeight: 500 }}>
                                                            {report.Report_Name}
                                                        </TableCell>

                                                        {/* 4️⃣ Type */}
                                                        <TableCell>
                                                            <Typography
                                                                sx={{
                                                                    px: 1.5,
                                                                    py: 0.5,
                                                                    borderRadius: 1,
                                                                    display: "inline-block",
                                                                    backgroundColor:
                                                                        type.Report_Type === "Abstract"
                                                                            ? "#E0F2FE"
                                                                            : "#EDE9FE",
                                                                    color:
                                                                        type.Report_Type === "Abstract"
                                                                            ? "#0369A1"
                                                                            : "#5B21B6",
                                                                    fontSize: 13,
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                {type.Report_Type}
                                                            </Typography>
                                                        </TableCell>

                                                        {/* 5️⃣ Action */}
                                                        <TableCell align="center">
                                                            <IconButton
                                                                color="primary"
                                                                onClick={() =>
                                                                    handleEdit(report.Report_Id, type.Type_Id)
                                                                }
                                                                sx={{
                                                                    backgroundColor: "#EEF2FF",
                                                                    "&:hover": { backgroundColor: "#E0E7FF" }
                                                                }}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}

                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Paper>
            </Box>
        </>
    );
};

export default ReportList;