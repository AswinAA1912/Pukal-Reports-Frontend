import React from "react";
import {
    Box,
    Drawer,
    Typography,
    TextField,
    MenuItem,
    Button,
    IconButton,
} from "@mui/material";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";

export interface DropdownOption {
    label: string;
    value: string | number;
}

interface ReportFilterDrawerProps {
    open: boolean;
    onToggle: () => void;   // 🔥 single toggle handler
    onClose: () => void;

    fromDate: string;
    toDate: string;
    onFromDateChange: (value: string) => void;
    onToDateChange: (value: string) => void;

    dropdownLabel: string;
    dropdownValue: string | number;
    dropdownOptions: DropdownOption[];
    onDropdownChange: (value: string | number) => void;

    onApply: () => void;
}

const ReportFilterDrawer: React.FC<ReportFilterDrawerProps> = ({
    open,
    onToggle,
    onClose,
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    dropdownLabel,
    dropdownValue,
    dropdownOptions,
    onDropdownChange,
    onApply,
}) => {
    return (
        <>
            {/* 🔥 FIXED TOGGLE ARROW */}
            <IconButton
                onClick={onToggle}
                sx={{
                    position: "fixed",
                    right: 1,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 25,
                    height: 30,
                    bgcolor: "#1E3A8A",
                    color: "#fff",
                    zIndex: 1300,
                    borderRadius: "6px",
                    boxShadow: 2,
                    "&:hover": {
                        bgcolor: "#162E6E",
                    },
                }}
            >
                <KeyboardArrowLeftIcon
                    sx={{
                        fontSize: 22,
                        transition: "0.25s",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                />
            </IconButton>

            {/* DRAWER */}
            <Drawer anchor="right" open={open} onClose={onClose}>
                <Box
                    width={320}
                    p={2}
                    sx={{ backgroundColor: "#F1F5F9", height: "100%" }}
                >
                    <Typography variant="h6" mb={2} fontWeight={700}>
                        Filters
                    </Typography>

                    <TextField
                        type="date"
                        label="From Date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={fromDate}
                        onChange={(e) => onFromDateChange(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        type="date"
                        label="To Date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={toDate}
                        onChange={(e) => onToDateChange(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        select
                        label={dropdownLabel}
                        fullWidth
                        value={dropdownValue}
                        onChange={(e) => {
                            const value = e.target.value;
                            const option = dropdownOptions.find(opt => String(opt.value) === value);
                            onDropdownChange(option ? option.value : "");
                        }}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        {dropdownOptions.map((opt) => (
                            <MenuItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        fullWidth
                        sx={{
                            backgroundColor: "#1E3A8A",
                            color: "#fff",
                            fontWeight: 600,
                            "&:hover": { backgroundColor: "#162E6E" },
                        }}
                        onClick={() => {
                            onApply(); 
                            onClose(); 
                        }}
                    >
                        Apply Filter
                    </Button>

                </Box>
            </Drawer>
        </>
    );
};

export default ReportFilterDrawer;
