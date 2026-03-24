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
    const earnedFormula = `IF(C${rowNum}="percentage", B${rowNum}*(D${rowNum}/100), D${rowNum})`;
    const distEarned = calculateDistributorCommission(d);
    
    distSheet.addRow({
      name: d.name,
      sales: d.totalSales,
      type: d.commissionType,
      value: d.commissionValue,
    });
    
    distSheet.getCell(`E${rowNum}`).value = { formula: earnedFormula, result: distEarned };
    distSheet.getCell(`B${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    distSheet.getCell(`E${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  });

  // Sheet 2: Sales Rep Breakdown
  const repSheet = workbook.addWorksheet('Sales Rep Breakdown');
  repSheet.columns = [
    { header: 'Distributor Name', key: 'distName', width: 30 },
    { header: 'Rep Name', key: 'repName', width: 30 },
    { header: 'Commission Type', key: 'type', width: 20 },
    { header: 'Commission Value', key: 'value', width: 20 },
    { header: `Earned Commission (${currency.code})`, key: 'earned', width: 25 },
  ];

  let repRowIndex = 2;
  distributors.forEach((d) => {
    d.salesReps.forEach(rep => {
      // Use SUMIF to dynamically find the distributor's earned commission based on Name
      const distEarnedFormula = `SUMIF('Distributor Data'!A:A, A${repRowIndex}, 'Distributor Data'!E:E)`;
      
      // Formula for Rep Earned Commission
      const earnedFormula = `IF(C${repRowIndex}="percentage", ${distEarnedFormula}*(D${repRowIndex}/100), D${repRowIndex})`;
      const repEarned = calculateSalesRepCommission(rep, calculateDistributorCommission(d));
      
      repSheet.addRow({
        distName: d.name,
        repName: rep.name,
        type: rep.commissionType,
        value: rep.commissionValue,
      });
      
      repSheet.getCell(`E${repRowIndex}`).value = { formula: earnedFormula, result: repEarned };
      repSheet.getCell(`E${repRowIndex}`).numFmt = '"' + currency.symbol + '"#,##0.00';
      
      repRowIndex++;
    });
  });

  // Sheet 3: Summary Calculations
  const summarySheet = workbook.addWorksheet('Summary Calculations');
  summarySheet.columns = [
    { header: 'Distributor Name', key: 'distName', width: 30 },
    { header: `Total Distributor Commission (${currency.code})`, key: 'distComm', width: 35 },
    { header: `Total Sales Rep Commission (${currency.code})`, key: 'repComm', width: 35 },
    { header: `Net Earnings/Spending (${currency.code})`, key: 'net', width: 30 },
  ];

  distributors.forEach((d, index) => {
    const rowNum = index + 2;
    
    // Use SUMIF to dynamically calculate totals based on Distributor Name
    const distCommFormula = `SUMIF('Distributor Data'!A:A, A${rowNum}, 'Distributor Data'!E:E)`;
    const repCommFormula = `SUMIF('Sales Rep Breakdown'!A:A, A${rowNum}, 'Sales Rep Breakdown'!E:E)`;
    const netFormula = `B${rowNum}-C${rowNum}`;
    
    const distEarned = calculateDistributorCommission(d);
    const repEarned = d.salesReps.reduce((sum, rep) => sum + calculateSalesRepCommission(rep, distEarned), 0);
    const netEarned = distEarned - repEarned;
    
    summarySheet.addRow({
      distName: d.name,
    });
    
    summarySheet.getCell(`B${rowNum}`).value = { formula: distCommFormula, result: distEarned };
    summarySheet.getCell(`C${rowNum}`).value = { formula: repCommFormula, result: repEarned };
    summarySheet.getCell(`D${rowNum}`).value = { formula: netFormula, result: netEarned };
    
    summarySheet.getCell(`B${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    summarySheet.getCell(`C${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
    summarySheet.getCell(`D${rowNum}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  });

  // Add Grand Totals
  const lastRow = distributors.length + 2;
  summarySheet.addRow({
    distName: 'GRAND TOTAL',
  });
  
  // Calculate grand total results for the result property
  const totalDistComm = distributors.reduce((sum, d) => sum + calculateDistributorCommission(d), 0);
  const totalRepComm = distributors.reduce((sum, d) => {
    const distEarned = calculateDistributorCommission(d);
    return sum + d.salesReps.reduce((rSum, rep) => rSum + calculateSalesRepCommission(rep, distEarned), 0);
  }, 0);
  const totalNet = totalDistComm - totalRepComm;
  
  summarySheet.getCell(`B${lastRow}`).value = { formula: `SUM(B2:B${lastRow-1})`, result: totalDistComm };
  summarySheet.getCell(`C${lastRow}`).value = { formula: `SUM(C2:C${lastRow-1})`, result: totalRepComm };
  summarySheet.getCell(`D${lastRow}`).value = { formula: `SUM(D2:D${lastRow-1})`, result: totalNet };
  
  summarySheet.getCell(`B${lastRow}`).font = { bold: true };
  summarySheet.getCell(`C${lastRow}`).font = { bold: true };
  summarySheet.getCell(`D${lastRow}`).font = { bold: true };
  
  summarySheet.getCell(`B${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  summarySheet.getCell(`C${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';
  summarySheet.getCell(`D${lastRow}`).numFmt = '"' + currency.symbol + '"#,##0.00';

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Commission_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}
