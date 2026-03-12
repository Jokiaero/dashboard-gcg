import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Export array of objects to Excel
 */
export const exportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export array of objects to PDF using jsPDF and jspdf-autotable
 */
export const exportToPDF = (
    data: any[],
    columns: { header: string; dataKey: string }[],
    filename: string,
    title: string = "Laporan"
) => {
    if (!data || data.length === 0) return;
    
    // Create new document (landscape orientation usually better for tables)
    const doc = new jsPDF({ orientation: "landscape" });
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 22);

    // Map data to array of arrays for autoTable
    const body = data.map((item) => {
        return columns.map((col) => {
            const val = item[col.dataKey];
            return val !== null && val !== undefined ? String(val) : "-";
        });
    });

    const head = [columns.map((col) => col.header)];

    autoTable(doc, {
        head: head,
        body: body,
        startY: 28,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [43, 76, 61] } // Dark green header matching UI
    });

    doc.save(`${filename}.pdf`);
};
