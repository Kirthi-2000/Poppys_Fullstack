import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FaSearch } from "react-icons/fa";
import { SiMicrosoftexcel } from "react-icons/si";
import { FaCalendarAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa";
import '../../assets/css/style.css';
import axios from "axios";
import * as XLSX from "xlsx";

// Modified table headers as per your request
const tableHeaders = [
  "S.No",
  "Date",
  "Line Number",
  "Total Hours",
  "Sewing",
  "Idle",
  "Rework",
  "No Feeding",
  "Meeting",
  "Maintenance",
  "Needle Break",
  "PT(%)",
  "NPT (%)",
  "Needle Runtime (%)",
  "Sewing Speed",
  "Stitch Count",
  "Piece Count",
];

// Raw data table headers
const rawDataHeaders = [
  "S.No",
  "Machine ID",
  "Line Number", 
  "Operator ID",
  "Operator Name",
  "Date",
  "Start Time",
  "End Time",
  "Mode",
  "Mode Description",
  "Stitch Count",
  "Needle Runtime",
  "Needle Stop Time",
  "Duration",
  "SPM",
  "Calculation Value",
  "TX Log ID",
  "STR Log ID",
  "AVERG",
  "PIECECNT",
  "Created At"
];

const pieColors = [
  "#3182ce",
  "#d69e2e",
  "#e53e3e",
  "#805ad5",
  "#718096",
  "#63b3ed",
];

function getPieData(row) {
  return [
    { name: "Sewing", value: parseFloat(row.sewingDecimal) || 0 },
    { name: "Idle", value: parseFloat(row.idleDecimal) || 0 },
    { name: "Rework", value: parseFloat(row.reworkDecimal) || 0 },
    { name: "No Feeding", value: parseFloat(row.noFeedingDecimal) || 0 },
    { name: "Meeting", value: parseFloat(row.meetingDecimal) || 0 },
    { name: "Maintenance", value: parseFloat(row.maintenanceDecimal) || 0 },
    { name: "Needle Break", value: parseFloat(row.needleBreakDecimal) || 0 },
  ];
}

function formatHoursMins(decimalHours) {
  if (!decimalHours) return "0h 0m";
  const totalMins = Math.round(Number(decimalHours) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

// Helper function to convert HH:MM to decimal hours for pie chart
function convertHHMMToDecimal(timeStr) {
  if (!timeStr || timeStr === "00:00") return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

export default function Line({ 
  tableOnly = false, 
  from: propFrom = "", 
  to: propTo = "", 
  machineId: propMachineId = "", 
  selectedOperatorId: propSelectedOperatorId = "", 
  lineId: propLineId = "" 
}) {
  // Use props for date values, similar to Machine.jsx and Operator.jsx
  const [from, setFrom] = useState(propFrom);
  const [to, setTo] = useState(propTo);
  const [lineId, setLineId] = useState(propLineId);
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [lineOptions, setLineOptions] = useState([]);
  const rowsPerPage = 10;
  const [filtersActive, setFiltersActive] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [rawPage, setRawPage] = useState(1);
  const [error, setError] = useState(null);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [showLineDropdown, setShowLineDropdown] = useState(false);
  const [dataGenerated, setDataGenerated] = useState(false);
  const [rawDataGenerated, setRawDataGenerated] = useState(false); // ✅ ADD THIS NEW STATE

  // Update state when props change
  useEffect(() => {
    setFrom(propFrom);
    setTo(propTo);
    setLineId(propLineId);
  }, [propFrom, propTo, propLineId]);

  // ✅ Fetch line options once on component mount
  useEffect(() => {
    const fetchLineOptions = async () => {
      try {
        const res = await axios.get("https://oceanatlantic.pinesphere.co.in/api/line-report/");
        const summary = res.data.summary || [];
        const uniqueLineIds = [...new Set(summary.map(row => {
          return row["Line Number"] || row["line_number"] || row["LINE_NUMBER"];
        }).filter(Boolean))];
        setLineOptions(uniqueLineIds);
      } catch (err) {
        console.error("Error fetching line options:", err);
        setLineOptions([]);
      }
    };

    fetchLineOptions();
  }, []); // Only fetch once on component mount

  // ✅ Fetch raw data from backend with frontend filtering
  const fetchRawData = async () => {
    setLoading(true);
    setError(null); // ✅ RESET ERROR
    try {
      const params = {};
      // ✅ REMOVED: Don't send line_id to API, we'll filter on frontend

      console.log("Line raw data request params:", params);

      const res = await axios.get("https://oceanatlantic.pinesphere.co.in/api/line-report/raw/", { params });
      console.log("Line raw data response:", res.data);
      
      const backendRawRows = res.data.raw_data || res.data || [];

      const mappedRawRows = backendRawRows.map((row, idx) => ({
        sNo: idx + 1,
        machineId: row["Machine ID"] || row["machine_id"] || "",
        lineNumber: row["Line Number"] || row["line_number"] || "",
        operatorId: row["Operator ID"] || row["operator_id"] || "",
        operatorName: row["Operator Name"] || row["operator_name"] || "",
        date: row["Date"] || row["date"] || "",
        startTime: row["Start Time"] || row["start_time"] || "",
        endTime: row["End Time"] || row["end_time"] || "",
        mode: row["Mode"] || row["mode"] || "",
        modeDescription: row["Mode Description"] || row["mode_description"] || getModelDescription(row["Mode"] || row["mode"]),
        stitchCount: row["Stitch Count"] || row["stitch_count"] || "-",
        needleRuntime: row["Needle Runtime"] || row["needle_runtime"] || "-",
        needleStopTime: row["Needle Stop Time"] || row["needle_stop_time"] || "-",
        duration: row["Duration"] || row["duration"] || "",
        spm: row["SPM"] || row["spm"] || "0",
        calculationValue: row["Calculation Value"] || row["calculation_value"] || "0",
        txLogId: row["TX Log ID"] || row["tx_log_id"] || "",
        strLogId: row["STR Log ID"] || row["str_log_id"] || "",
        averg: row["AVERG"] || row["AVERG"] || "0",         
        piececnt: row["PIECECNT"] || row["PIECECNT"] || "0",   
        createdAt: row["Created At"] || row["created_at"] || ""
      }));

      console.log("Mapped line raw rows:", mappedRawRows);
      setRawData(mappedRawRows);
    } catch (err) {
      console.error("Line raw data fetch error:", err);
      setError("Failed to fetch raw data"); // ✅ SET ERROR
      setRawData([]);
    }
    setLoading(false);
  };

  // Helper function to get mode description
  const getModelDescription = (mode) => {
    const modeDescriptions = {
      1: "Sewing",
      2: "Idle", 
      3: "No Feeding",
      4: "Meeting",
      5: "Maintenance", 
      6: "Rework",
      7: "Needle Break"
    };
    return modeDescriptions[mode] || "Unknown";
  };

  // ✅ Fetch data from line report endpoint with no date filtering on backend
  const fetchData = async () => {
    setLoading(true);
    setError(null); // ✅ RESET ERROR
    try {
      const params = {};
      
      // Don't send date filters to backend, we'll filter on frontend
      if (lineId) {
        params.line_id = lineId;
      }
      if (propMachineId) {
        params.machine_id = propMachineId;
      }
      if (propSelectedOperatorId) {
        params.operator_id = propSelectedOperatorId;
      }

      console.log("Fetching line data with params:", params);
      
      const response = await axios.get("https://oceanatlantic.pinesphere.co.in/api/line-report/", { params });
      
      console.log("Backend response:", response.data);
      
      const backendRows = response.data.summary || [];
      
      // ✅ Fix the data mapping to use correct backend field name
      const mappedRows = backendRows.map((row, idx) => {
        const lineNumber = row["Line Number"] || row["line_number"] || row["LINE_NUMBER"];
        
        return {
          sNo: row["S.no"] || row["S.No"] || (idx + 1),
          date: row["Date"] || "",
          lineNumber: lineNumber || "N/A",
          totalHours: row["Total Hours"] || "00:00",
          sewing: row["Sewing Hours"] || "00:00",
          idle: row["Idle Hours"] || "00:00",
          rework: row["Rework Hours"] || "00:00",
          noFeeding: row["No feeding Hours"] || "00:00",
          meeting: row["Meeting Hours"] || "00:00",
          maintenance: row["Maintenance Hours"] || "00:00",
          needleBreak: row["Needle Break"] || "00:00",
          // Add decimal versions for pie chart calculations
          totalHoursDecimal: convertHHMMToDecimal(row["Total Hours"]) || 0,
          sewingDecimal: convertHHMMToDecimal(row["Sewing Hours"]) || 0,
          idleDecimal: convertHHMMToDecimal(row["Idle Hours"]) || 0,
          reworkDecimal: convertHHMMToDecimal(row["Rework Hours"]) || 0,
          noFeedingDecimal: convertHHMMToDecimal(row["No feeding Hours"]) || 0,
          meetingDecimal: convertHHMMToDecimal(row["Meeting Hours"]) || 0,
          maintenanceDecimal: convertHHMMToDecimal(row["Maintenance Hours"]) || 0,
          needleBreakDecimal: convertHHMMToDecimal(row["Needle Break"]) || 0,
          pt: row["PT %"] || 0,
          npt: row["NPT %"] || 0,
          // ✅ FIX: Use correct backend field name for needle time
          needleRuntime: row["Needle Time %"] || 0,  // ✅ Changed from "Needle Runtime %" to "Needle Time %"
          sewingSpeed: row["SPM"] || 0,
          stitchCount: row["Stitch Count"] || 0,
          pieceCount: row["Piece Count"] || 0, // ✅ ADD THIS
        };
      });
      
      console.log("✅ Final mapped data:", mappedRows);
      setData(mappedRows);

    } catch (error) {
      console.error("Error fetching line data:", error);
      setError("Failed to fetch line data"); // ✅ SET ERROR
      setData([]);
    }
    setLoading(false);
  };

  // ✅ Only fetch when props change, not when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [propMachineId, propSelectedOperatorId, propLineId]); // Only fetch when props change, not filters

  // ✅ Frontend filtering logic (same as Machine.jsx and Operator.jsx)
  const applyFilters = (dataToFilter) => {
    let filtered = [...dataToFilter];
    
    // Apply date filters first
    if (from && to) {
      filtered = filtered.filter(row => {
        if (!row.date) return false;
        
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const fromDate = new Date(from);
        const toDate = new Date(to);
        
        return rowDate >= fromDate && rowDate <= toDate;
      });
    } else if (from) {
      filtered = filtered.filter(row => {
        if (!row.date) return false;
        
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const fromDate = new Date(from);
        
        return rowDate >= fromDate;
      });
    } else if (to) {
      filtered = filtered.filter(row => {
        if (!row.date) return false;
        
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const toDate = new Date(to);
        
        return rowDate <= toDate;
      });
    }

    // ✅ FIXED: Apply multi-select line ID filter (remove the old single lineId filter)
    if (selectedLineIds.length > 0) {
      filtered = filtered.filter(row =>
        row.lineNumber && selectedLineIds.includes(row.lineNumber.toString())
      );
    }

    return filtered;
  };

  // ✅ Apply filters to raw data
  const applyRawDataFilters = (dataToFilter) => {
    let filtered = [...dataToFilter];

    // Apply date filters
    if (from && to) {
      filtered = filtered.filter(row => {
        if (!row.date) return false;
        
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const fromDate = new Date(from);
        const toDate = new Date(to);
        
        return rowDate >= fromDate && rowDate <= toDate;
      });
    } else if (from) {
      filtered = filtered.filter(row => {
        if (!row.date) return false;
        
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const fromDate = new Date(from);
        
        return rowDate >= fromDate;
      });
    } else if (to) {
      filtered = filtered.filter(row => {
        if (!row.date) return false;
        
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const toDate = new Date(to);
        
        return rowDate <= toDate;
      });
    }

    // ✅ FIXED: Apply multi-select line ID filter (same as summary table)
    if (selectedLineIds.length > 0) {
      filtered = filtered.filter(row =>
        row.lineNumber && selectedLineIds.includes(row.lineNumber.toString())
      );
    }

    return filtered;
  };

  // ✅ Get line options logic
  const getFilteredLineOptions = () => {
    return lineOptions;
  };

  const getAvailableLineIds = () => {
    if (!from && !to) return lineOptions;
    
    let dateFiltered = [...data];
    
    if (from && to) {
      dateFiltered = dateFiltered.filter(row => {
        if (!row.date) return false;
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const fromDate = new Date(from);
        const toDate = new Date(to);
        return rowDate >= fromDate && rowDate <= toDate;
      });
    } else if (from) {
      dateFiltered = dateFiltered.filter(row => {
        if (!row.date) return false;
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const fromDate = new Date(from);
        return rowDate >= fromDate;
      });
    } else if (to) {
      dateFiltered = dateFiltered.filter(row => {
        if (!row.date) return false;
        const rowDateStr = row.date.replace(/:/g, '-');
        const rowDate = new Date(rowDateStr);
        const toDate = new Date(to);
        return rowDate <= toDate;
      });
    }
    
    return [...new Set(dateFiltered.map(row => row.lineNumber).filter(Boolean))];
  };

  const availableLineOptions = getFilteredLineOptions();
  const availableLineIds = getAvailableLineIds();

  // ✅ Apply filters to data
  const filtered = applyFilters(data);
  const filteredRawData = applyRawDataFilters(rawData);

  // ✅ Recalculate pie chart data based on filtered results
  const sumByKey = (key) =>
    filtered.reduce((sum, row) => sum + (parseFloat(row[key]) || 0), 0);

  const totalHoursSum = sumByKey("totalHoursDecimal");
  const sewingSum = sumByKey("sewingDecimal");
  const idleSum = sumByKey("idleDecimal");
  const reworkSum = sumByKey("reworkDecimal");
  const noFeedingSum = sumByKey("noFeedingDecimal");
  const meetingSum = sumByKey("meetingDecimal");
  const maintenanceSum = sumByKey("maintenanceDecimal");
  const needleBreakSum = sumByKey("needleBreakDecimal");

  // ✅ FIX: Calculate total piece count BEFORE using it in tiles
  const totalPieceCount = filtered.reduce((sum, row) => sum + (parseInt(row.pieceCount) || 0), 0);

  // ✅ FIXED: Calculate tile data based on FILTERED data, not original data
  const getTileDataFromFiltered = () => {
    if (filtered.length === 0) {
      return [
        {
          label: "Productive Time %",
          value: "0%",
          bg: "tile-bg-blue",
          color: "tile-color-blue",
        },
        {
          label: "Needle Time %", 
          value: "0%",
          bg: "tile-bg-green",
          color: "tile-color-green",
        },
        { 
          label: "Sewing Speed", 
          value: "0",
          bg: "tile-bg-orange", 
          color: "tile-color-orange" 
        },
        {
          label: "Total Hours",
          value: "0h 0m",
          bg: "tile-bg-pink",
          color: "tile-color-pink",
        },
        {
          label: "Piece Count",
          value: "0",
          bg: "tile-bg-purple",
          color: "tile-color-purple",
        },
      ];
    }

    // ✅ Calculate from FILTERED data
    const totalFilteredHours = filtered.reduce((sum, row) => sum + (parseFloat(row.totalHoursDecimal) || 0), 0);
    const avgPT = filtered.reduce((sum, row) => sum + (parseFloat(row.pt) || 0), 0) / filtered.length;
    const avgNeedleRuntime = filtered.reduce((sum, row) => sum + (parseFloat(row.needleRuntime) || 0), 0) / filtered.length;
    const avgSewingSpeed = filtered.reduce((sum, row) => sum + (parseFloat(row.sewingSpeed) || 0), 0) / filtered.length;
    const totalHoursDisplay = formatHoursMins(totalFilteredHours);

    return [
      {
        label: "Productive Time %",
        value: `${(avgPT || 0).toFixed(2)}%`,
        bg: "tile-bg-blue",
        color: "tile-color-blue",
      },
      {
        label: "Needle Time %",
        value: `${(avgNeedleRuntime || 0).toFixed(2)}%`,
        bg: "tile-bg-green",
        color: "tile-color-green",
      },
      { 
        label: "Sewing Speed", 
        value: Math.round(avgSewingSpeed || 0).toString(),
        bg: "tile-bg-orange", 
        color: "tile-color-orange" 
      },
      {
        label: "Total Hours",
        value: totalHoursDisplay,
        bg: "tile-bg-pink",
        color: "tile-color-pink",
      },
      { // ✅ FIX: Use calculated totalPieceCount
        label: "Piece Count",
        value: totalPieceCount.toString(),
        bg: "tile-bg-purple",
        color: "tile-color-purple",
      },
    ];
  };

  // ✅ Add helper function to convert HH:MM to "Xh Ym" format
  function convertHHMMToHoursMinutes(timeStr) {
    if (!timeStr || timeStr === "00:00") return "0h 0m";
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    return `${hours}h ${minutes}m`;
  }
  
  // ✅ Use filtered data for tiles
  const tiles = getTileDataFromFiltered();
  
  // ✅ Pagination calculations
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Raw data pagination
  const rawRowsPerPage = 10;
  const filteredRawPageCount = Math.max(1, Math.ceil(filteredRawData.length / rawRowsPerPage));
  const filteredRawPaginated = filteredRawData.slice(
    (rawPage - 1) * rawRowsPerPage,
    rawPage * rawRowsPerPage
  );

  // ✅ Event handlers
  const handleReset = () => {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(1);
    setRawPage(1);
    setLineId("");
    setSelectedLineIds([]);
    setFiltersActive(false);
    setError(null);
    setDataGenerated(false); // ✅ Reset summary data generated
    setRawDataGenerated(false); // ✅ Reset raw data generated
    fetchData();
  };

  const handleGenerate = () => {
    setPage(1);
    setFiltersActive(true);
    if (showRawData) {
      setRawDataGenerated(true); // ✅ Set raw data generated to true
    } else {
      setDataGenerated(true); // Set summary data generated to true
    }
    // The filtering happens automatically through the filtered variable
  };

  // ✅ Update handleRawData to reset appropriate states when switching between views
  const handleRawData = () => {
    if (showRawData) {
      setShowRawData(false);
      setRawDataGenerated(false); // ✅ Reset raw data generated when switching back
    } else {
      setShowRawData(true);
      setDataGenerated(false); // ✅ Reset summary data generated when switching to raw
      fetchRawData();
    }
  };

  // ✅ Export functions for summary data
  const handleCSV = () => {
    const csv = [
      tableHeaders.join(","),
      ...filtered.map((row, idx) =>
        [
          idx + 1, // ✅ FIXED: Use filtered index starting from 1
          row.date,
          row.lineNumber,
          row.totalHours,
          row.sewing,
          row.idle,
          row.rework,
          row.noFeeding,
          row.meeting,
          row.maintenance,
          row.needleBreak,
          row.pt,
          row.npt,
          row.needleRuntime,
          row.sewingSpeed,
          row.stitchCount,
          row.pieceCount,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "line_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHTML = () => {
    const html = `
      <table border="1">
        <thead>
          <tr>${tableHeaders.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (row, idx) => `
            <tr>
              <td>${idx + 1}</td> <!-- ✅ FIXED: Use filtered index -->
              <td>${row.date}</td>
              <td>${row.lineNumber}</td>
              <td>${row.totalHours}</td>
              <td>${row.sewing}</td>
              <td>${row.idle}</td>
              <td>${row.rework}</td>
              <td>${row.noFeeding}</td>
              <td>${row.meeting}</td>
              <td>${row.maintenance}</td>
              <td>${row.needleBreak}</td>
              <td>${row.pt}</td>
              <td>${row.npt}</td>
              <td>${row.needleRuntime}</td>
              <td>${row.sewingSpeed}</td>
              <td>${row.stitchCount}</td>
              <td>${row.pieceCount}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "line_report.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Update CSV export:
  const handleRawCSV = () => {
    const csv = [
      rawDataHeaders.join(","),
      ...filteredRawData.map((row, idx) =>
        [
          idx + 1,
          row.machineId,
          row.lineNumber,
          row.operatorId,
          row.operatorName,
          row.date,
          row.startTime,
          row.endTime,
          row.mode,
          row.modeDescription,
          row.stitchCount,
          row.needleRuntime,
          row.needleStopTime,
          row.duration,
          row.spm,
          row.calculationValue,
          row.txLogId,
          row.strLogId,
          row.averg,
          row.piececnt,
          row.createdAt,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "line_raw_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRawHTML = () => {
    const html = `
      <table border="1">
        <thead>
          <tr>${rawDataHeaders.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${filteredRawData
            .map(
              (row, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${row.machineId}</td>
              <td>${row.lineNumber}</td>
              <td>${row.operatorId}</td>
              <td>${row.operatorName}</td>
              <td>${row.date}</td>
              <td>${row.startTime}</td>
              <td>${row.endTime}</td>
              <td>${row.mode}</td>
              <td>${row.modeDescription}</td>
              <td>${row.stitchCount}</td>
              <td>${row.needleRuntime}</td>
              <td>${row.needleStopTime}</td>
              <td>${row.duration}</td>
              <td>${row.spm}</td>
              <td>${row.calculationValue}</td>
              <td>${row.txLogId}</td>
              <td>${row.strLogId}</td>
              <td>${row.averg}</td>
              <td>${row.piececnt}</td>            
              <td>${row.createdAt}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "line_raw_data.html";
    a.click();
    URL.revokeObjectURL(url);
  };
// ✅ Pagination components
const Pagination = () => (
  <div className="machine-pagination">
    <button
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page === 1}
      className="machine-btn machine-btn-blue"
    >
      Prev
    </button>
    <span className="machine-pagination-label">
      Page {page} of {pageCount}
    </span>
    <button
      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
      disabled={page === pageCount}
      className="machine-btn machine-btn-blue"
    >
      Next
    </button>
  </div>
);

const RawPagination = () => (
  <div className="machine-pagination">
    <button
      onClick={() => setRawPage((p) => Math.max(1, p - 1))}
      disabled={rawPage === 1}
      className="machine-btn machine-btn-blue"
    >
      Prev
    </button>
    <span className="machine-pagination-label">
      Page {rawPage} of {filteredRawPageCount}
    </span>
    <button
      onClick={() => setRawPage((p) => Math.min(filteredRawPageCount, p + 1))}
      disabled={rawPage === filteredRawPageCount}
      className="machine-btn machine-btn-blue"
    >
      Next
    </button>
  </div>
);

// ✅ ADD ERROR BOUNDARY RENDERING
if (error) {
  return (
    <div className="machine-root">
      <div style={{ 
        padding: "20px", 
        textAlign: "center", 
        backgroundColor: "#ffebee", 
        border: "1px solid #f44336", 
        borderRadius: "4px",
        color: "#d32f2f"
      }}>
        <h3>Error Loading Line Report</h3>
        <p>{error}</p>
        <button 
          onClick={() => {
            setError(null);
            fetchData();
          }}
          className="machine-btn machine-btn-blue"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
  // ✅ ADD ERROR BOUNDARY RENDERING
  if (error) {
    return (
      <div className="machine-root">
        <div style={{ 
          padding: "20px", 
          textAlign: "center", 
          backgroundColor: "#ffebee", 
          border: "1px solid #f44336", 
          borderRadius: "4px",
          color: "#d32f2f"
        }}>
          <h3>Error Loading Line Report</h3>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchData();
            }}
            className="machine-btn machine-btn-blue"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If tableOnly mode, return only the table
  if (tableOnly) {
    return (
      <div className="machine-table-card">
        <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
          <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
            <thead>
              <tr>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "8px 12px",
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                      background: "#d3edff",
                      fontWeight: 600,
                      fontSize: "15px",
                      minWidth: "110px",
                      color: "#000",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableHeaders.length}
                    className="machine-table-nodata"
                  >
                    {loading ? "Loading..." : "No data found."}
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={idx}>
                    <td>{(page - 1) * rowsPerPage + idx + 1}</td> {/* ✅ FIXED: Use calculated S.No */}
                    <td>{row.date}</td>
                    <td>{row.lineNumber}</td>
                    <td>{row.totalHours}</td>
                    <td>{row.sewing}</td>
                    <td>{row.idle}</td>
                    <td>{row.rework}</td>
                    <td>{row.noFeeding}</td>
                    <td>{row.meeting}</td>
                    <td>{row.maintenance}</td>
                    <td>{row.needleBreak}</td>
                    <td>{row.pt}%</td>
                    <td>{row.npt}%</td>
                    <td>{row.needleRuntime}%</td>
                    <td>{row.sewingSpeed}</td>
                    <td>{row.stitchCount}</td>
                    <td>{row.pieceCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>
    );
  }

  // Main component rendering
  return (
    <div className="machine-root">
      {/* Title and Buttons Row */}
      <div className="machine-title-row">
        <div className="machine-title">
          {showRawData ? 'Line Raw Data' : 'Line Report Table'}
        </div>
        <div className="machine-title-btns">
          <button
            type="button"
            className="machine-btn machine-btn-csv"
            onClick={showRawData ? handleRawCSV : handleCSV}
          >
            <SiMicrosoftexcel className="machine-btn-icon" /> CSV
          </button>
          <button
            type="button"
            className="machine-btn machine-btn-html"
            onClick={showRawData ? handleRawHTML : handleHTML}
          >
            <FaDownload className="machine-btn-icon" />
            HTML
          </button>
          <button
            type="button"
            className={`machine-btn ${showRawData ? 'machine-btn-orange' : 'machine-btn-raw'}`}
            onClick={handleRawData}
          >
            <FaDownload className="machine-btn-icon" />
            {showRawData ? 'View Summary' : 'View Raw Data'}
          </button>
        </div>
      </div>

      {/* ✅ UPDATED: Show filters for both summary and raw data views */}
      <div className="machine-table-card" style={{ marginBottom: "16px", padding: "16px" }}>
        <div className="machine-header-actions" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 25, alignItems: "center" }}>
            <div className="date-input-group" style={{ display: "flex", gap: 8 }}>
              <div className="date-field" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span><FaCalendarAlt className="calendar-icon" /></span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="date-input"
                  style={{ width: 110 }}
                />
                <span className="date-label" style={{ fontSize: 12 }}>From</span>
              </div>
              <div className="date-field" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span><FaCalendarAlt className="calendar-icon" /></span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="date-input"
                  style={{ width: 110 }}
                />
                <span className="date-label" style={{ fontSize: 12 }}>To</span>
              </div>
            </div>
            {/* Multi-select Line Dropdown */}
            <div className="line-dropdown-wrapper">
              <button
                type="button"
                className="machine-select"
                onClick={() => setShowLineDropdown((v) => !v)}
              >
                {selectedLineIds.length === 0
                  ? "Select Line ID(s)"
                  : selectedLineIds.length <= 2
                    ? selectedLineIds.join(", ")
                    : `${selectedLineIds.slice(0, 2).join(", ")} +${selectedLineIds.length - 2} more`}
                <span className="machine-select-arrow">▼</span>
              </button>
              {showLineDropdown && (
                <div className="machine-dropdown-list">
                  {/* Select All */}
                  <label className="machine-dropdown-item machine-dropdown-selectall">
                    <input
                      type="checkbox"
                      checked={
                        availableLineOptions
                          .filter(id => !from && !to ? true : availableLineIds.includes(id))
                          .every(id => selectedLineIds.includes(id.toString()))
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedLineIds(
                            availableLineOptions
                              .filter(id => !from && !to ? true : availableLineIds.includes(id))
                              .map(id => id.toString())
                          );
                        } else {
                          setSelectedLineIds([]);
                        }
                        setRawPage(1);
                      }}
                      className="machine-checkbox"
                    />
                    <span>Select All</span>
                  </label>
                  {/* Individual Line IDs */}
                  {availableLineOptions
                    .filter(id => !from && !to ? true : availableLineIds.includes(id))
                    .map(id => id.toString())
                    .sort((a, b) => Number(a) - Number(b))
                    .map(id => (
                      <label key={id} className="machine-dropdown-item">
                        <input
                          type="checkbox"
                          className="machine-checkbox"
                          checked={selectedLineIds.includes(id)}
                          onChange={() => {
                            setSelectedLineIds(prev =>
                              prev.includes(id)
                                ? prev.filter(lid => lid !== id)
                                : [...prev, id]
                            );
                            setRawPage(1);
                          }}
                        />
                        <span>{id}</span>
                      </label>
                    ))}
                  {(from || to) && availableLineIds.length === 0 && (
                    <div className="machine-dropdown-nodata">
                      No lines have data for the selected date range.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="machine-btn machine-btn-blue machine-btn-generate"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Loading..." : "Generate"}
            </button>
            <button
              type="button"
              className="machine-btn machine-btn-red machine-btn-reset"
              onClick={() => {
                setFrom("");
                setTo("");
                setSelectedLineIds([]);
                setDataGenerated(false); // ✅ ADD THIS
                setRawDataGenerated(false); // ✅ ADD THIS
                setLineId("");
                setPage(1);
                setRawPage(1);
              }}
              style={{ height: 32, fontSize: 14, padding: "0 16px" }}
            >
              Reset
            </button>
          </div>
        </div>
        {/* Filter Status */}
        {(from || to || lineId || selectedLineIds.length > 0) && (
          <div style={{ 
            padding: "8px 16px", 
            marginBottom: "16px", 
            backgroundColor: (showRawData ? filteredRawData.length > 0 : filtered.length > 0) ? "#e3f2fd" : "#ffebee", 
            borderRadius: "4px", 
            fontSize: "14px",
            color: (showRawData ? filteredRawData.length > 0 : filtered.length > 0) ? "#1976d2" : "#d32f2f"
          }}>
            <strong>Active Filters:</strong>
            {from && <span style={{ marginLeft: "8px" }}>From: {from}</span>}
            {to && <span style={{ marginLeft: "8px" }}>To: {to}</span>}
            {lineId && <span style={{ marginLeft: "8px" }}>Line: {lineId}</span>}
            {selectedLineIds.length > 0 && (
              <span style={{ marginLeft: "8px" }}>
                Line(s): {selectedLineIds.join(", ")}
              </span>
            )}
            <span style={{ marginLeft: "8px" }}>
              ({showRawData ? filteredRawData.length : filtered.length} of {showRawData ? rawData.length : data.length} records)
            </span>
            {(showRawData ? filteredRawData.length === 0 : filtered.length === 0) && (
              <div style={{ marginTop: "4px", fontWeight: "bold" }}>
                ⚠️ No data found for the selected combination. Try adjusting your filters.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ UPDATED: Show dashboard for both summary and raw data when not generated */}
      {showRawData ? (
        /* Raw Data View */
        !rawDataGenerated ? (
          /* ✅ NEW: Raw Data Dashboard Card */
          <div className="machine-table-card">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              minHeight: '300px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              border: '2px dashed #ff9800'
            }}>
              <div style={{ fontSize: '48px', color: '#ff9800', marginBottom: '20px' }}>📋</div>
              <h3 style={{ color: '#e65100', marginBottom: '10px', fontSize: '24px' }}>
                Line Raw Data Dashboard
              </h3>
              <p style={{ color: '#f57c00', fontSize: '16px', marginBottom: '30px', maxWidth: '400px' }}>
                Select your filters and click <strong>Generate</strong> to view detailed line raw data and logs
              </p>
              <div style={{
                padding: '15px 25px',
                backgroundColor: '#fff8e1',
                borderRadius: '6px',
                color: '#f57c00',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                💡 Tip: Raw data shows individual line log entries with detailed timestamps
              </div>
            </div>
          </div>
        ) : (
          /* Raw Data Table - Show when rawDataGenerated is true */
          <div className="machine-table-card" style={{ marginTop: '20px' }}>
            <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
              <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
                <thead>
                  <tr>
                    {rawDataHeaders.map((h) => (
                      <th
                        key={h}
                        style={{
                          whiteSpace: "nowrap",
                          padding: "8px 12px",
                          textAlign: "center",
                          border: "1px solid #e2e8f0",
                          background: "#ffecb3", // Yellow background like Machine.jsx
                          fontWeight: 600,
                          fontSize: "14px",
                          minWidth: "100px",
                          color: "#000",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={`raw-loading-${idx}`}>
                        {rawDataHeaders.map((_, colIdx) => (
                          <td
                            key={colIdx}
                            style={{ textAlign: "center", padding: "20px" }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                color: "#666",
                              }}
                            >
                              <div
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  border: "2px solid #f3f3f3",
                                  borderTop: "2px solid #3498db",
                                  borderRadius: "50%",
                                  animation: "spin 1s linear infinite",
                                }}
                              ></div>
                              Loading...
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredRawPaginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={rawDataHeaders.length}
                        className="machine-table-nodata"
                      >
                        {from || to || selectedLineIds.length > 0 // ✅ FIXED: Check selectedLineIds instead of lineId
                          ? "No raw data found for the selected filters."
                          : "No raw data found."}
                      </td>
                    </tr>
                  ) : (
                    filteredRawPaginated.map((row, idx) => (
                      <tr key={idx}>
                        <td>{(rawPage - 1) * rawRowsPerPage + idx + 1}</td>
                        <td>{row.machineId}</td>
                        <td>{row.lineNumber}</td>
                        <td>{row.operatorId}</td>
                        <td>{row.operatorName}</td>
                        <td>{row.date}</td>
                        <td>{row.startTime}</td>
                        <td>{row.endTime}</td>
                        <td>{row.mode}</td>
                        <td>{row.modeDescription}</td>
                        <td>{row.stitchCount}</td>
                        <td>{row.needleRuntime}</td>
                        <td>{row.needleStopTime}</td>
                        <td>{row.duration}</td>
                        <td>{row.spm}</td>
                        <td>{row.calculationValue}</td>
                        <td>{row.txLogId}</td>
                        <td>{row.strLogId}</td>
                        <td>{row.averg}</td>
                        <td>{row.piececnt}</td>
                        <td>{row.createdAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <RawPagination />
          </div>
        )
      ) : (
        /* Summary View */
        !dataGenerated ? (
          /* Summary Dashboard Card */
          <div className="line-table-card">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              minHeight: '300px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px dashed #dee2e6'
            }}>
              <div style={{ fontSize: '48px', color: '#6c757d', marginBottom: '20px' }}>📊</div>
              <h3 style={{ color: '#495057', marginBottom: '10px', fontSize: '24px' }}>
                Line Report Dashboard
              </h3>
              <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '30px', maxWidth: '400px' }}>
                Select your filters and click <strong>Generate</strong> to view line data and analytics
              </p>
              <div style={{
                padding: '15px 25px',
                backgroundColor: '#e3f2fd',
                borderRadius: '6px',
                color: '#1976d2',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                💡 Tip: Use filters to analyze specific lines or time periods
              </div>
            </div>
          </div>
        ) : (
          /* Summary Table and Charts */
          <>
            {/* Table Card */}
            <div className="machine-table-card">
              <div className="machine-table-scroll" style={{ overflowX: "auto", minWidth: "100%" }}>
                <table className="machine-table" style={{ tableLayout: "auto", width: "100%" }}>
                  <thead>
                    <tr>
                      {tableHeaders.map((h) => (
                        <th
                          key={h}
                          style={{
                            whiteSpace: "nowrap",
                            padding: "8px 12px",
                            textAlign: "center",
                            border: "1px solid #e2e8f0",
                            background: "#d3edff",
                            fontWeight: 600,
                            fontSize: "15px",
                            minWidth: "110px",
                            color: "#000",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={tableHeaders.length}
                          className="machine-table-nodata"
                        >
                          {(from || to || lineId || selectedLineIds.length > 0) ? "No data found for the selected filters." : "No data found."}
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{(page - 1) * rowsPerPage + idx + 1}</td> {/* ✅ FIXED: Use calculated S.No */}
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.date}</td>
                          <td style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>{row.lineNumber}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.totalHours}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.sewing}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.idle}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.rework}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.noFeeding}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.meeting}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.maintenance}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.needleBreak}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.pt}%</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.npt}%</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.needleRuntime}%</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.sewingSpeed}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.stitchCount}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{row.pieceCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination />
            </div>

            {/* ✅ Tiles Row - Use filtered tile data */}
            <div className="machine-tiles-row machine-tiles-row-full">
              {tiles.map((tile, idx) => (
                <div
                  className={`machine-tile machine-tile-shade ${tile.bg} ${tile.color}`}
                  key={tile.label}
                >
                  <div className="machine-tile-label">{tile.label}</div>
                  <div className="machine-tile-value">{tile.value}</div>
                </div>
              ))}
            </div>

            {/* Pie Chart Card - Full width */}
            <div className="machine-pie-card machine-pie-card-full" style={{ display: 'flex', alignItems: 'center', gap: '2rem', minHeight: '400px', padding: '35px', }}>
              <div className="machine-pie-chart machine-pie-chart-large" style={{ minWidth: 420, width: 420, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Sewing", value: Math.max(sewingSum, 0.01) },
                        { name: "Idle", value: Math.max(idleSum, 0.01) },
                        { name: "Rework", value: Math.max(reworkSum, 0.01) },
                        { name: "No Feeding", value: Math.max(noFeedingSum, 0.01) },
                        { name: "Meeting", value: Math.max(meetingSum, 0.01) },
                        { name: "Maintenance", value: Math.max(maintenanceSum, 0.01) },
                        { name: "Needle Break", value: Math.max(needleBreakSum, 0.01) },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={60}
                      labelLine={false}
                      label={false}
                    >
                                       
                                            {[
                                              sewingSum,
                                              idleSum,
                                              reworkSum,
                                              noFeedingSum,
                                              meetingSum,
                                              maintenanceSum,
                                              needleBreakSum,
                                            ].map((_, i) => (
                                              <Cell key={i} fill={pieColors[i % pieColors.length]}  
                                              style={{ cursor: 'pointer' }} />
                                            ))}
                                          </Pie>
                    <Tooltip 
                      formatter={(value, name) => [
                        `${formatHoursMins(value)} (${((value / totalHoursSum) * 100).toFixed(1)}%)`,
                        name
                      ]}
                      labelStyle={{ color: '#000' }}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="machine-pie-info" style={{ flex: 1, padding: '1rem' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '16px' }}>
                  Hours Breakdown ({filtered.length} of {data.length} records: {formatHoursMins(totalHoursSum)})
                </div>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                  <b>Filtered Total Hours:</b> {formatHoursMins(totalHoursSum)}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div>{formatHoursMins(sewingSum)} : Sewing Hours</div>
                  <div>{formatHoursMins(idleSum)} : Idle Hours</div>
                  <div>{formatHoursMins(reworkSum)} : Rework Hours</div>
                  <div>{formatHoursMins(noFeedingSum)} : No Feeding Hours</div>
                  <div>{formatHoursMins(meetingSum)} : Meeting Hours</div>
                  <div>{formatHoursMins(maintenanceSum)} : Maintenance Hours</div>
                  <div>{formatHoursMins(needleBreakSum)} : Needle Break Hours</div>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}