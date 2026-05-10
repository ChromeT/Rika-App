import * as XLSX from 'xlsx';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

const formatMoney = (val) => {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val || 0);
};

const CHART_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#facc15', '#ef4444'
];

export const exportToXLS = async (transactions, period = 'Laporan', userName = 'User', filters = { user: 'Kita', type: 'Semua' }, accounts = []) => {
  try {
    const { user: filterUser, type: filterType } = filters;
    
    let filtered = transactions;
    if (filterUser === 'Saya') filtered = filtered.filter(tx => tx.owner === userName);
    else if (filterUser === 'Pasangan') filtered = filtered.filter(tx => tx.owner !== userName);
    
    if (filterType === 'Pengeluaran') filtered = filtered.filter(tx => tx.type === 'expense');
    else if (filterType === 'Pemasukan') filtered = filtered.filter(tx => tx.type === 'income');

    if (!filtered || filtered.length === 0) {
      Alert.alert('Data kosong', 'Tidak ada transaksi yang cocok dengan filter.');
      return;
    }

    const categoryMap = {};
    let totalExpense = 0;
    let totalIncome = 0;

    filtered.forEach(tx => {
      const amount = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      if (tx.type === 'expense') {
        const cat = tx.category || 'Lainnya';
        categoryMap[cat] = (categoryMap[cat] || 0) + amount;
        totalExpense += amount;
      } else {
        totalIncome += amount;
      }
    });

    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    const rows = [
      [`LAPORAN KEUANGAN ${userName.toUpperCase()}`],
      ['Periode:', period],
      ['Filter User:', filterUser],
      ['Filter Tipe:', filterType],
      ['Tanggal Cetak:', new Date().toLocaleString('id-ID')],
      [],
      [`RINGKASAN KATEGORI (${filterUser})`],
      ['Kategori', 'Nominal', 'Persentase'],
    ];

    sortedCats.forEach(([cat, amount]) => {
      const totalForPercent = totalExpense > 0 ? totalExpense : 1;
      const percent = ((amount / totalForPercent) * 100).toFixed(1) + '%';
      rows.push([cat, amount, percent]);
    });
    
    rows.push([], ['RINGKASAN TOTAL']);
    if (filterType !== 'Pengeluaran') rows.push(['Total Pemasukan', totalIncome]);
    if (filterType !== 'Pemasukan') rows.push(['Total Pengeluaran', totalExpense]);
    if (filterType === 'Semua') rows.push(['Saldo Akhir', totalIncome - totalExpense]);

    rows.push([], ['DETAIL TRANSAKSI']);
    rows.push(['Tanggal', 'Keterangan', 'Kategori', 'Sumber', 'Tipe', 'Mode', 'Oleh', 'Porsi Saya', 'Porsi Pasangan', 'Total Nominal']);

    filtered.forEach(tx => {
      const myP = Number(tx.myContrib || 0);
      const parP = Number(tx.partnerContrib || 0);
      const total = myP + parP;
      const d = new Date(tx.date);
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID') : '-';
      rows.push([
        dateStr,
        tx.name || '-',
        tx.category || '-',
        (() => {
          const acc = (accounts || []).find(a => a.id === tx.accountId);
          return acc ? acc.name : 'Tunai';
        })(),
        tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        tx.isJoint ? 'Uang Bersama (50:50)' : (tx.isPatungan ? 'Patungan Custom' : 'Pribadi'),
        tx.owner || '-',
        myP,
        parP,
        total
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

    const filename = `Laporan_${userName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;

    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, filename);
    } else {
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Simpan Laporan Excel',
        UTI: 'com.microsoft.excel.xlsx'
      });
    }
  } catch (e) {
    console.error('XLS Error:', e);
    Alert.alert('Gagal', 'Gagal mengekspor file Excel.');
  }
};

export const exportToPDF = async (transactions, period = 'Laporan', userName = 'User', filters = { user: 'Kita', type: 'Semua' }, accounts = []) => {
  try {
    const { user: filterUser, type: filterType } = filters;
    
    let filtered = transactions;
    if (filterUser === 'Saya') filtered = filtered.filter(tx => tx.owner === userName);
    else if (filterUser === 'Pasangan') filtered = filtered.filter(tx => tx.owner !== userName);
    
    if (filterType === 'Pengeluaran') filtered = filtered.filter(tx => tx.type === 'expense');
    else if (filterType === 'Pemasukan') filtered = filtered.filter(tx => tx.type === 'income');

    if (!filtered || filtered.length === 0) {
      Alert.alert('Data kosong', 'Tidak ada transaksi yang cocok dengan filter.');
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = {};

    filtered.forEach(tx => {
      const amount = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
        const cat = tx.category || 'Lainnya';
        categoryMap[cat] = (categoryMap[cat] || 0) + amount;
      }
    });

    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    let svgContent = '';
    let legendRows = '';
    if (totalExpense > 0) {
      const RADIUS = 40;
      const CIRCUM = 2 * Math.PI * RADIUS;
      let offset = 0;

      svgContent = `<svg width="120" height="120" viewBox="0 0 100 100" style="transform: rotate(-90deg)">`;
      sortedCats.slice(0, 6).forEach(([cat, amount], i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const dash = (amount / totalExpense) * CIRCUM;
        const percent = ((amount / totalExpense) * 100).toFixed(1) + '%';
        svgContent += `<circle cx="50" cy="50" r="${RADIUS}" fill="transparent" stroke="${color}" stroke-width="12" stroke-dasharray="${dash} ${CIRCUM - dash}" stroke-dashoffset="-${offset}" />`;
        offset += dash;
        
        legendRows += `
          <tr>
            <td style="width:12px; border:none;"><div style="width:10px; height:10px; background:${color};"></div></td>
            <td style="border:none; font-size:11px; padding:2px 8px;">${cat} <span style="color:#6b7280; font-size:9px;">(${percent})</span></td>
            <td style="border:none; font-size:11px; text-align:right;">Rp ${formatMoney(amount)}</td>
          </tr>
        `;
      });
      svgContent += `</svg>`;
    }

    let txRows = '';
    filtered.forEach(tx => {
      const myP = Number(tx.myContrib || 0);
      const parP = Number(tx.partnerContrib || 0);
      const amount = myP + parP;
      const date = new Date(tx.date).toLocaleDateString('id-ID');
      const acc = (accounts || []).find(a => a.id === tx.accountId);
      const walletName = acc ? acc.name : 'Tunai';
      const mode = tx.isJoint ? 'KITA (50:50)' : (tx.isPatungan ? 'PATUNGAN' : 'PRIBADI');
      txRows += `
        <tr>
          <td>${date}</td>
          <td>${tx.name || '-'}</td>
          <td>${walletName}</td>
          <td style="font-size:9px; font-weight:bold;">${mode}</td>
          <td style="color:${tx.type === 'income' ? '#059669' : '#dc2626'}">${tx.type === 'income' ? 'Masuk' : 'Keluar'}</td>
          <td style="text-align:right;">${formatMoney(myP)}</td>
          <td style="text-align:right;">${formatMoney(parP)}</td>
          <td style="text-align:right; font-weight:bold;">${formatMoney(amount)}</td>
        </tr>`;
    });

    const html = `
      <html>
      <head>
        <title>Rika Report - ${userName}</title>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1f2937; }
          .title { font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 4px; }
          .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 40px; }
          .section-title { font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 16px; border-left: 4px solid #6366f1; padding-left: 12px; }
          .chart-container { margin-bottom: 40px; background: #f9fafb; padding: 24px; border-radius: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 11px; color: #4b5563; border-bottom: 2px solid #e5e7eb; padding: 12px 8px; }
          td { font-size: 11px; padding: 10px 8px; border-bottom: 1px solid #f3f4f6; }
          .summary-card { margin-top: 40px; padding: 24px; background: #111827; border-radius: 16px; color: white; }
          .chart-total { font-size: 14px; font-weight: bold; color: #111827; margin-top: 16px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="title">Laporan Keuangan ${userName}</div>
        <div class="subtitle">Periode: ${period} | User: ${filterUser} | Tipe: ${filterType}</div>
        <div style="font-size:12px; color:#9ca3af; margin-bottom:40px;">Dicetak: ${new Date().toLocaleString('id-ID')}</div>

        ${filterType !== 'Pemasukan' && totalExpense > 0 ? `
        <div class="section-title">Visualisasi Pengeluaran (${filterUser})</div>
        <div class="chart-container">
          <table style="border:none;">
            <tr>
              <td style="width:140px; border:none; vertical-align:middle;">${svgContent}</td>
              <td style="border:none; vertical-align:top;">
                <table style="border:none; width:100%;">${legendRows}</table>
              </td>
            </tr>
          </table>
          <div class="chart-total">Total Pengeluaran: Rp ${formatMoney(totalExpense)}</div>
        </div>
        ` : ''}

        <div class="section-title">Detail Transaksi</div>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Keterangan</th>
              <th>Sumber</th>
              <th>Mode</th>
              <th>Tipe</th>
              <th style="text-align:right;">Saya (Rp)</th>
              <th style="text-align:right;">Pasangan (Rp)</th>
              <th style="text-align:right;">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${txRows}
          </tbody>
        </table>

        <div class="summary-card">
          <div style="font-size:12px; color:#9ca3af; margin-bottom:12px;">RINGKASAN TOTAL LAPORAN</div>
          <div style="display:table; width:100%;">
            ${filterType !== 'Pengeluaran' ? `
            <div style="display:table-row;">
              <div style="display:table-cell; font-size:13px;">Total Pemasukan</div>
              <div style="display:table-cell; text-align:right; font-size:16px; font-weight:bold; color:#34d399;">Rp ${formatMoney(totalIncome)}</div>
            </div>` : ''}
            ${filterType !== 'Pemasukan' ? `
            <div style="display:table-row;">
              <div style="display:table-cell; font-size:13px; padding-top:8px;">Total Pengeluaran</div>
              <div style="display:table-cell; text-align:right; font-size:16px; font-weight:bold; color:#fb7185; padding-top:8px;">Rp ${formatMoney(totalExpense)}</div>
            </div>` : ''}
            ${filterType === 'Semua' ? `
            <div style="display:table-row;">
              <div style="display:table-cell; font-size:15px; font-weight:bold; padding-top:16px; border-top:1px solid #374151;">SALDO AKHIR</div>
              <div style="display:table-cell; text-align:right; font-size:22px; font-weight:bold; padding-top:16px; border-top:1px solid #374151;">Rp ${formatMoney(totalIncome - totalExpense)}</div>
            </div>` : ''}
          </div>
        </div>
      </body>
      </html>`;

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    console.error('PDF Error:', e);
    Alert.alert('Gagal', 'Gagal mengekspor file PDF.');
  }
};



