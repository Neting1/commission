import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Distributor, Currency, calculateDifference, calculatePercentage } from './types';

export async function exportToExcel(distributors: Distributor[], currency: Currency, startDate?: string, endDate?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Commission Calculator';
  workbook.created = new Date();

  // Filter distributors by date range if provided
  const filteredDistributors = distributors.filter(d => {
    if (!d.date) return true; // If no date, include it
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });

  // Sheet 1: Calculations Data
  const distSheet = workbook.addWorksheet('Calculations Data');
  distSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: `Actual Amount (${currency.code})`, key: 'actual', width: 25 },
    { header: `Discount Amount (${currency.code})`, key: 'discount', width: 25 },
    { header: `Difference (${currency.code})`, key: 'difference', width: 25 },
    { header: '% Difference', key: 'percentage', width: 20 },
  ];

  filteredDistributors.forEach((d, index) => {
    const rowNum = index + 2; // +1 for header, +1 for 1-based index
    
    // Formula for Difference: Actual - Discount
    const diffFormula = `C${rowNum}-D${rowNum}`;
    const diffResult = calculateDifference(d);
    
    // Formula for Percentage: (Difference / Actual) * 100
    // Explicitly check for 0 to prevent #DIV/0! errors in Excel
    const pctFormula = `IF(C${rowNum}=0, 0, (E${rowNum}/C${rowNum})*100)`;
    const pctResult = calculatePercentage(d);
    
    distSheet.addRow({
      date: d.date || '',
      name: d.name,
      actual: d.actualAmount || 0,
      discount: d.discountAmount || 0,
    });
    
    distSheet.getCell(`E${rowNum}`).value = { formula: diffFormula, result: diffResult };
    distSheet.getCell(`F${rowNum}`).value = { formula: pctFormula, result: pctResult };
    
    distSheet.getCell(`C${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`D${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`E${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`F${rowNum}`).numFmt = '0.00"%"';
  });

  // Add Grand Totals
  const lastRow = filteredDistributors.length + 2;
  distSheet.addRow({
    name: 'GRAND TOTAL',
  });
  
  const totalActual = filteredDistributors.reduce((sum, d) => sum + (d.actualAmount || 0), 0);
  const totalDiscount = filteredDistributors.reduce((sum, d) => sum + (d.discountAmount || 0), 0);
  const totalDifference = totalActual - totalDiscount;
  const totalPct = totalActual === 0 ? 0 : (totalDifference / totalActual) * 100;
  
  distSheet.getCell(`C${lastRow}`).value = { formula: `SUM(C2:C${lastRow-1})`, result: totalActual };
  distSheet.getCell(`D${lastRow}`).value = { formula: `SUM(D2:D${lastRow-1})`, result: totalDiscount };
  distSheet.getCell(`E${lastRow}`).value = { formula: `SUM(E2:E${lastRow-1})`, result: totalDifference };
  distSheet.getCell(`F${lastRow}`).value = { formula: `IF(C${lastRow}=0, 0, (E${lastRow}/C${lastRow})*100)`, result: totalPct };
  
  distSheet.getCell(`B${lastRow}`).font = { bold: true };
  distSheet.getCell(`C${lastRow}`).font = { bold: true };
  distSheet.getCell(`D${lastRow}`).font = { bold: true };
  distSheet.getCell(`E${lastRow}`).font = { bold: true };
  distSheet.getCell(`F${lastRow}`).font = { bold: true };
  
  distSheet.getCell(`C${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  distSheet.getCell(`D${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  distSheet.getCell(`E${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  distSheet.getCell(`F${lastRow}`).numFmt = '0.00"%"';

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
