import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Distributor, Currency, calculateDifference, calculatePercentage } from './types';

export async function exportToExcel(
  transactions: Distributor[], 
  summary: Distributor[], 
  currency: Currency, 
  startDate?: string, 
  endDate?: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Commission Calculator';
  workbook.created = new Date();

  // --- Sheet 1: Summary ---
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: `Total Actual (${currency.code})`, key: 'actual', width: 25 },
    { header: `Total Discount (${currency.code})`, key: 'discount', width: 25 },
    { header: `Total Difference (${currency.code})`, key: 'difference', width: 25 },
    { header: 'Overall % Diff', key: 'percentage', width: 20 },
  ];

  summary.forEach((d, index) => {
    const rowNum = index + 2; // +1 for header, +1 for 1-based index
    
    const diffFormula = `B${rowNum}-C${rowNum}`;
    const diffResult = calculateDifference(d);
    
    const pctFormula = `IF(B${rowNum}=0, 0, (D${rowNum}/B${rowNum})*100)`;
    const pctResult = calculatePercentage(d);
    
    summarySheet.addRow({
      name: d.name,
      actual: d.actualAmount || 0,
      discount: d.discountAmount || 0,
    });
    
    summarySheet.getCell(`D${rowNum}`).value = { formula: diffFormula, result: diffResult };
    summarySheet.getCell(`E${rowNum}`).value = { formula: pctFormula, result: pctResult };
    
    summarySheet.getCell(`B${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    summarySheet.getCell(`C${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    summarySheet.getCell(`D${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    summarySheet.getCell(`E${rowNum}`).numFmt = '0.00"%"';
  });

  // Add Grand Totals for Summary
  const lastRow = summary.length + 2;
  summarySheet.addRow({
    name: 'GRAND TOTAL',
  });
  
  const totalActual = summary.reduce((sum, d) => sum + (d.actualAmount || 0), 0);
  const totalDiscount = summary.reduce((sum, d) => sum + (d.discountAmount || 0), 0);
  const totalDifference = totalActual - totalDiscount;
  const totalPct = totalActual === 0 ? 0 : (totalDifference / totalActual) * 100;
  
  summarySheet.getCell(`B${lastRow}`).value = { formula: `SUM(B2:B${lastRow-1})`, result: totalActual };
  summarySheet.getCell(`C${lastRow}`).value = { formula: `SUM(C2:C${lastRow-1})`, result: totalDiscount };
  summarySheet.getCell(`D${lastRow}`).value = { formula: `SUM(D2:D${lastRow-1})`, result: totalDifference };
  summarySheet.getCell(`E${lastRow}`).value = { formula: `IF(B${lastRow}=0, 0, (D${lastRow}/B${lastRow})*100)`, result: totalPct };
  
  ['B', 'C', 'D', 'E'].forEach(col => {
    summarySheet.getCell(`${col}${lastRow}`).font = { bold: true };
    summarySheet.getCell(`${col}${lastRow}`).numFmt = col === 'E' ? '0.00"%"' : '"' + currency.symbol + '"#,##0.00';
  });

  // --- Sheet 2: Transactions ---
  const transSheet = workbook.addWorksheet('Transactions');
  transSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: `Actual Amount (${currency.code})`, key: 'actual', width: 25 },
    { header: `Discount Amount (${currency.code})`, key: 'discount', width: 25 },
    { header: `Difference (${currency.code})`, key: 'difference', width: 25 },
    { header: '% Difference', key: 'percentage', width: 20 },
  ];

  transactions.forEach((d, index) => {
    const rowNum = index + 2;
    
    const diffFormula = `C${rowNum}-D${rowNum}`;
    const diffResult = calculateDifference(d);
    
    const pctFormula = `IF(C${rowNum}=0, 0, (E${rowNum}/C${rowNum})*100)`;
    const pctResult = calculatePercentage(d);
    
    transSheet.addRow({
      date: d.date || '',
      name: d.name,
      actual: d.actualAmount || 0,
      discount: d.discountAmount || 0,
    });
    
    transSheet.getCell(`E${rowNum}`).value = { formula: diffFormula, result: diffResult };
    transSheet.getCell(`F${rowNum}`).value = { formula: pctFormula, result: pctResult };
    
    transSheet.getCell(`C${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    transSheet.getCell(`D${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    transSheet.getCell(`E${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    transSheet.getCell(`F${rowNum}`).numFmt = '0.00"%"';
  });

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  let filename = `Calculations_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  if (startDate && endDate) {
    filename = `Calculations_Report_${startDate}_to_${endDate}.xlsx`;
  } else if (startDate) {
    filename = `Calculations_Report_from_${startDate}.xlsx`;
  } else if (endDate) {
    filename = `Calculations_Report_until_${endDate}.xlsx`;
  }
  
  saveAs(blob, filename);
}
