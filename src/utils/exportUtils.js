import * as XLSX from 'xlsx';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// Format money to IDR
const formatMoney = (val) => {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val || 0);
};

// Export transactions to XLS (Excel)
export const exportToXLS = async (transactions, period = 'Bulanan') => {
  try {
    if (!transactions || transactions.length === 0) {
      Alert.alert('Data kosong', 'Tidak ada transaksi untuk diexport.');
      return;
    }

    // Prepare data for Excel
    const data = [
      ['Rika App - Laporan ' + period],
      ['Tanggal', 'Nama', 'Kategori', 'Tipe', 'Pemilik', 'Kontribusi Saya', 'Kontribusi Pasangan', 'Total'],
    ];

    transactions.forEach(tx => {
      const total = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      const d = new Date(tx.date);
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-';
      data.push([
        dateStr,
        tx.name || '-',
        tx.category || '-',
        tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        tx.owner || '-',
        tx.myContrib || 0,
        tx.partnerContrib || 0,
        total
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
      { wch: 15 },
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

    // Write to file
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileUri = FileSystem.cacheDirectory + 'rika-laporan-' + period.toLowerCase() + '-' + Date.now() + '.xlsx';

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Share the file
    await Sharing.shareAsync(fileUri);

    Alert.alert('Berhasil', 'File XLS berhasil dibuat dan dibagikan.');
  } catch (e) {
    console.error('XLS export error:', e);
    Alert.alert('Gagal', 'Tidak dapat mengekspor ke XLS: ' + e.message);
  }
};

// Export transactions to PDF
export const exportToPDF = async (transactions, period = 'Bulanan') => {
  try {
    if (!transactions || transactions.length === 0) {
      Alert.alert('Data kosong', 'Tidak ada transaksi untuk diexport.');
      return;
    }

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(tx => {
      const total = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      if (tx.type === 'income') totalIncome += total;
      else totalExpense += total;
    });

    // Build table rows
    let tableRows = '';
    transactions.forEach(tx => {
      const total = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      const typeClass = tx.type === 'income' ? 'income' : 'expense';
      const typeText = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      const d2 = new Date(tx.date);
      const dateStr2 = !isNaN(d2.getTime()) ? d2.toLocaleDateString('id-ID') : '-';
      tableRows += '<tr>' +
        '<td>' + dateStr2 + '</td>' +
        '<td>' + (tx.name || '-') + '</td>' +
        '<td>' + (tx.category || '-') + '</td>' +
        '<td class="' + typeClass + '">' + typeText + '</td>' +
        '<td>' + (tx.owner || '-') + '</td>' +
        '<td>Rp ' + formatMoney(total) + '</td>' +
        '</tr>';
    });

    // Create HTML content for PDF
    const html = '<html>' +
      '<head>' +
        '<meta charset="utf-8">' +
        '<style>' +
          'body { font-family: Helvetica, sans-serif; padding: 20px; }' +
          'h1 { color: #2c3e50; font-size: 24px; margin-bottom: 5px; }' +
          '.subtitle { color: #7f8c8d; font-size: 12px; margin-bottom: 20px; }' +
          'table { width: 100%; border-collapse: collapse; margin-top: 20px; }' +
          'th { background-color: #3498db; color: white; padding: 10px; text-align: left; font-size: 12px; }' +
          'td { padding: 8px 10px; border-bottom: 1px solid #ecf0f1; font-size: 11px; }' +
          '.income { color: #27ae60; }' +
          '.expense { color: #e74c3c; }' +
          '.footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #ecf0f1; }' +
          '.total-row { font-weight: bold; background-color: #f8f9fa; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<h1>Rika App - Laporan ' + period + '</h1>' +
        '<div class="subtitle">Dicetak pada ' + new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) + '</div>' +
        '<table>' +
          '<tr>' +
            '<th>Tanggal</th>' +
            '<th>Nama</th>' +
            '<th>Kategori</th>' +
            '<th>Tipe</th>' +
            '<th>Pemilik</th>' +
            '<th>Total</th>' +
          '</tr>' +
          tableRows +
          '<tr class="total-row">' +
            '<td colspan="4">TOTAL</td>' +
            '<td class="income">Pemasukan: Rp ' + formatMoney(totalIncome) + '</td>' +
            '<td class="expense">Pengeluaran: Rp ' + formatMoney(totalExpense) + '</td>' +
          '</tr>' +
        '</table>' +
        '<div class="footer">' +
          '<div style="color: #7f8c8d; font-size: 10px;">Dibuat oleh Rika App - ' + new Date().getFullYear() + '</div>' +
        '</div>' +
      '</body>' +
    '</html>';

    // Print to PDF
    await Print.printAsync({ html });

    Alert.alert('Berhasil', 'PDF berhasil dibuat dan diprint/share.');
  } catch (e) {
    console.error('PDF export error:', e);
    Alert.alert('Gagal', 'Tidak dapat mengekspor ke PDF: ' + e.message);
  }
};
