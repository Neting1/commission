import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Distributor, Currency, calculateDifference, calculatePercentage } from './types';

export async function exportToExcel(distributors: Distributor[], currency: Currency) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Commission Calculator';
  workbook.created = new Date();

  // Sheet 1: Calculations Data
  const distSheet = workbook.addWorksheet('Calculations Data');
  distSheet.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: `Actual Amount (${currency.code})`, key: 'actual', width: 25 },
    { header: `Discount Amount (${currency.code})`, key: 'discount', width: 25 },
    { header: `Difference (${currency.code})`, key: 'difference', width: 25 },
    { header: '% Difference', key: 'percentage', width: 20 },
  ];

  distributors.forEach((d, index) => {
    const rowNum = index + 2; // +1 for header, +1 for 1-based index
    
    // Formula for Difference: Actual - Discount
    const diffFormula = `B${rowNum}-C${rowNum}`;
    const diffResult = calculateDifference(d);
    
    // Formula for Percentage: (Difference / Actual) * 100
    const pctFormula = `IF(B${rowNum}>0, (D${rowNum}/B${rowNum})*100, 0)`;
    const pctResult = calculatePercentage(d);
    
    distSheet.addRow({
      name: d.name,
      actual: d.actualAmount || 0,
      discount: d.discountAmount || 0,
    });
    
    distSheet.getCell(`D${rowNum}`).value = { formula: diffFormula, result: diffResult };
    distSheet.getCell(`E${rowNum}`).value = { formula: pctFormula, result: pctResult };
    
    distSheet.getCell(`B${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`C${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`D${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`E${rowNum}`).numFmt = '0.00"%"';
  });

  // Add Grand Totals
  const lastRow = distributors.length + 2;
  distSheet.addRow({
    name: 'GRAND TOTAL',
  });
  
  const totalActual = distributors.reduce((sum, d) => sum + (d.actualAmount || 0), 0);
  const totalDiscount = distributors.reduce((sum, d) => sum + (d.discountAmount || 0), 0);
  const totalDifference = totalActual - totalDiscount;
  const totalPct = totalActual > 0 ? (totalDifference / totalActual) * 100 : 0;
  
  distSheet.getCell(`B${lastRow}`).value = { formula: `SUM(B2:B${lastRow-1})`, result: totalActual };
  distSheet.getCell(`C${lastRow}`).value = { formula: `SUM(C2:C${lastRow-1})`, result: totalDiscount };
  distSheet.getCell(`D${lastRow}`).value = { formula: `SUM(D2:D${lastRow-1})`, result: totalDifference };
  distSheet.getCell(`E${lastRow}`).value = { formula: `IF(B${lastRow}>0, (D${lastRow}/B${lastRow})*100, 0)`, result: totalPct };
  
  distSheet.getCell(`B${lastRow}`).font = { bold: true };
  distSheet.getCell(`C${lastRow}`).font = { bold: true };
  distSheet.getCell(`D${lastRow}`).font = { bold: true };
  distSheet.getCell(`E${lastRow}`).font = { bold: true };
  
  distSheet.getCell(`B${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  distSheet.getCell(`C${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  distSheet.getCell(`D${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  distSheet.getCell(`E${lastRow}`).numFmt = '0.00"%"';

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Calculations_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}
