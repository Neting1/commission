import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Distributor, Currency, calculateDistributorCommission, calculateSalesRepCommission } from './types';

export async function exportToExcel(distributors: Distributor[], currency: Currency) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Commission Calculator';
  workbook.created = new Date();

  // Sheet 1: Distributor Data
  const distSheet = workbook.addWorksheet('Distributor Data');
  distSheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Distributor Name', key: 'name', width: 30 },
    { header: `Total Sales (${currency.code})`, key: 'sales', width: 20 },
    { header: 'Commission Type', key: 'type', width: 20 },
    { header: 'Commission Value', key: 'value', width: 20 },
    { header: `Earned Commission (${currency.code})`, key: 'earned', width: 25 },
  ];

  distributors.forEach((d, index) => {
    const rowNum = index + 2; // +1 for header, +1 for 1-based index
    
    // Formula for Earned Commission
    // If type is percentage: sales * (value / 100)
    // If type is fixed: value
    const earnedFormula = `IF(D${rowNum}="percentage", C${rowNum}*(E${rowNum}/100), E${rowNum})`;
    const distEarned = calculateDistributorCommission(d);
    
    distSheet.addRow({
      id: d.displayId || d.id,
      name: d.name,
      sales: d.totalSales,
      type: d.commissionType,
      value: d.commissionValue,
    });
    
    distSheet.getCell(`F${rowNum}`).value = { formula: earnedFormula, result: distEarned };
    distSheet.getCell(`C${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`F${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  });

  // Sheet 2: Sales Rep Breakdown
  const repSheet = workbook.addWorksheet('Sales Rep Breakdown');
  repSheet.columns = [
    { header: 'Distributor ID', key: 'distId', width: 36 },
    { header: 'Distributor Name', key: 'distName', width: 30 },
    { header: 'Rep ID', key: 'repId', width: 36 },
    { header: 'Rep Name', key: 'repName', width: 30 },
    { header: 'Commission Type', key: 'type', width: 20 },
    { header: 'Commission Value', key: 'value', width: 20 },
    { header: `Earned Commission (${currency.code})`, key: 'earned', width: 25 },
  ];

  let repRowIndex = 2;
  distributors.forEach((d) => {
    d.salesReps.forEach(rep => {
      // Use SUMIF to dynamically find the distributor's earned commission based on ID
      const distEarnedFormula = `SUMIF('Distributor Data'!A:A, A${repRowIndex}, 'Distributor Data'!F:F)`;
      
      // Formula for Rep Earned Commission
      const earnedFormula = `IF(E${repRowIndex}="percentage", ${distEarnedFormula}*(F${repRowIndex}/100), F${repRowIndex})`;
      const repEarned = calculateSalesRepCommission(rep, calculateDistributorCommission(d));
      
      repSheet.addRow({
        distId: d.displayId || d.id,
        distName: d.name,
        repId: rep.id,
        repName: rep.name,
        type: rep.commissionType,
        value: rep.commissionValue,
      });
      
      repSheet.getCell(`G${repRowIndex}`).value = { formula: earnedFormula, result: repEarned };
      repSheet.getCell(`G${repRowIndex}`).numFmt = '"' + currency.symbol + '"#,##0.00';
      
      repRowIndex++;
    });
  });

  // Sheet 3: Summary Calculations
  const summarySheet = workbook.addWorksheet('Summary Calculations');
  summarySheet.columns = [
    { header: 'Distributor ID', key: 'distId', width: 36 },
    { header: 'Distributor Name', key: 'distName', width: 30 },
    { header: `Total Distributor Commission (${currency.code})`, key: 'distComm', width: 35 },
    { header: `Total Sales Rep Commission (${currency.code})`, key: 'repComm', width: 35 },
    { header: `Net Earnings/Spending (${currency.code})`, key: 'net', width: 30 },
  ];

  distributors.forEach((d, index) => {
    const rowNum = index + 2;
    
    // Use SUMIF to dynamically calculate totals based on Distributor ID
    const distCommFormula = `SUMIF('Distributor Data'!A:A, A${rowNum}, 'Distributor Data'!F:F)`;
    const repCommFormula = `SUMIF('Sales Rep Breakdown'!A:A, A${rowNum}, 'Sales Rep Breakdown'!G:G)`;
    const netFormula = `C${rowNum}-D${rowNum}`;
    
    const distEarned = calculateDistributorCommission(d);
    const repEarned = d.salesReps.reduce((sum, rep) => sum + calculateSalesRepCommission(rep, distEarned), 0);
    const netEarned = distEarned - repEarned;
    
    summarySheet.addRow({
      distId: d.displayId || d.id,
      distName: d.name,
    });
    
    summarySheet.getCell(`C${rowNum}`).value = { formula: distCommFormula, result: distEarned };
    summarySheet.getCell(`D${rowNum}`).value = { formula: repCommFormula, result: repEarned };
    summarySheet.getCell(`E${rowNum}`).value = { formula: netFormula, result: netEarned };
    
    summarySheet.getCell(`C${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    summarySheet.getCell(`D${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    summarySheet.getCell(`E${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  });

  // Add Grand Totals
  const lastRow = distributors.length + 2;
  summarySheet.addRow({
    distId: 'GRAND TOTAL',
    distName: '',
  });
  
  // Calculate grand total results for the result property
  const totalDistComm = distributors.reduce((sum, d) => sum + calculateDistributorCommission(d), 0);
  const totalRepComm = distributors.reduce((sum, d) => {
    const distEarned = calculateDistributorCommission(d);
    return sum + d.salesReps.reduce((rSum, rep) => rSum + calculateSalesRepCommission(rep, distEarned), 0);
  }, 0);
  const totalNet = totalDistComm - totalRepComm;
  
  summarySheet.getCell(`C${lastRow}`).value = { formula: `SUM(C2:C${lastRow-1})`, result: totalDistComm };
  summarySheet.getCell(`D${lastRow}`).value = { formula: `SUM(D2:D${lastRow-1})`, result: totalRepComm };
  summarySheet.getCell(`E${lastRow}`).value = { formula: `SUM(E2:E${lastRow-1})`, result: totalNet };
  
  summarySheet.getCell(`C${lastRow}`).font = { bold: true };
  summarySheet.getCell(`D${lastRow}`).font = { bold: true };
  summarySheet.getCell(`E${lastRow}`).font = { bold: true };
  
  summarySheet.getCell(`C${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  summarySheet.getCell(`D${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  summarySheet.getCell(`E${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Commission_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}
