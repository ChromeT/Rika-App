import * as XLSX from 'xlsx';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { formatMoney as formatMoneyUtil } from './formatUtils';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

const formatMoney = (val) => formatMoneyUtil(val || 0);

const CHART_COLORS = [
  '#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#9D84B7', '#FF9F43', '#00D2D3', '#54A0FF', '#5F27CD'
];

export const exportToXLS = async (transactions, period = 'Laporan', userName = 'User', filters = { user: 'Kita', type: 'Semua' }, accounts = []) => {
  try {
    const { user: filterUser, type: filterType } = filters;
    
    let filtered = transactions || [];
    if (filterUser === 'Saya') filtered = filtered.filter(tx => tx?.owner === userName);
    else if (filterUser === 'Pasangan') filtered = filtered.filter(tx => tx?.owner !== userName);
    
    if (filterType === 'Pengeluaran') filtered = filtered.filter(tx => tx?.type === 'expense');
    else if (filterType === 'Pemasukan') filtered = filtered.filter(tx => tx?.type === 'income');

    if (filtered.length === 0) {
      Alert.alert('Data kosong', 'Tidak ada transaksi yang cocok dengan filter.');
      return;
    }

    const categoryMap = {};
    let totalExpense = 0;
    let totalIncome = 0;

    filtered.forEach(tx => {
      if (!tx) return;
      const amount = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      if (tx.type === 'expense') {
        const cat = tx.category || 'Lainnya';
        categoryMap[cat] = (categoryMap[cat] || 0) + amount;
        totalExpense += amount;
      } else if (tx.type === 'income') {
        totalIncome += amount;
      }
    });

    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    const rows = [
      [`RIKA APP - LAPORAN KEUANGAN PREMIUM`],
      [`Generated for: ${userName}`],
      ['Periode:', period],
      ['Filter Pengguna:', filterUser],
      ['Filter Jenis:', filterType],
      ['Tanggal Ekspor:', new Date().toLocaleString('id-ID')],
      [],
      [filterType === 'Pemasukan' ? 'RINGKASAN PEMASUKAN PER KATEGORI' : 'RINGKASAN PENGELUARAN PER KATEGORI'],
      ['KATEGORI', 'NOMINAL (Rp)', 'PERSENTASE (%)'],
    ];

    sortedCats.forEach(([cat, amount]) => {
      const totalForPercent = totalExpense > 0 ? totalExpense : 1;
      const percent = ((amount / totalForPercent) * 100).toFixed(1) + '%';
      rows.push([cat, amount, percent]);
    });
    
    rows.push([], ['RINGKASAN KEUANGAN TOTAL']);
    if (filterType !== 'Pengeluaran' && totalIncome > 0) rows.push(['Total Pemasukan', totalIncome]);
    if (filterType !== 'Pemasukan' && totalExpense > 0) rows.push(['Total Pengeluaran', totalExpense]);
    if (filterType === 'Semua' && (totalIncome > 0 || totalExpense > 0)) rows.push(['Saldo Akhir (Net)', totalIncome - totalExpense]);

    rows.push([], ['DETAIL RIWAYAT TRANSAKSI']);
    rows.push(['TANGGAL', 'KETERANGAN', 'KATEGORI', 'DOMPET/SUMBER', 'TIPE', 'METODE', 'OLEH', 'PORSI SAYA', 'PORSI PASANGAN', 'TOTAL NOMINAL']);

    filtered.forEach(tx => {
      if (!tx) return;
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
          const acc = (accounts || []).find(a => a?.id === (tx.type === 'transfer' ? tx.fromAccountId : tx.accountId));
          return acc ? acc.name : (tx.walletName || 'Tunai');
        })(),
        tx.type === 'income' ? 'Pemasukan' : tx.type === 'transfer' ? 'Transfer' : 'Pengeluaran',
        tx.isJoint ? 'Uang Bersama' : (tx.isPatungan ? 'Patungan' : 'Pribadi'),
        tx.owner || '-',
        myP,
        parP,
        total
      ]);
    });

    // Sanitize rows to ensure no null/undefined values reach XLSX
    const sanitizedRows = rows.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return '-';
        // Ensure no complex objects are passed as cell values
        if (typeof cell === 'object' && !(cell instanceof Date)) return JSON.stringify(cell);
        return cell;
      })
    );

    const ws = XLSX.utils.aoa_to_sheet(sanitizedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Rika');

    const timestamp = Date.now();
    const filename = `Rika_Report_${timestamp}.xlsx`;

    // Robust sanitization for Android file system
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, sanitizedFilename);
    } else {
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileUri = `${FileSystem.documentDirectory}${sanitizedFilename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Simpan Laporan Excel Rika',
          UTI: 'com.microsoft.excel.xlsx'
        });
      } else {
        Alert.alert('Gagal', 'Fitur berbagi tidak tersedia di perangkat ini.');
      }
    }
  } catch (e) {
    console.error('XLS Export Error:', e);
    // More detailed error message for debugging
    const errorMsg = e.message || 'Terjadi kesalahan teknis.';
    Alert.alert('Gagal Ekspor', `Sistem gagal membuat file Excel. \n\nDetail: ${errorMsg}`);
  }
};

export const exportToPDF = async (transactions, period = 'Laporan', userName = 'User', filters = { user: 'Kita', type: 'Semua' }, accounts = []) => {
  try {
    const { user: filterUser, type: filterType } = filters;
    
    let filtered = transactions || [];
    if (filterUser === 'Saya') filtered = filtered.filter(tx => tx?.owner === userName);
    else if (filterUser === 'Pasangan') filtered = filtered.filter(tx => tx?.owner !== userName);
    
    if (filterType === 'Pengeluaran') filtered = filtered.filter(tx => tx?.type === 'expense');
    else if (filterType === 'Pemasukan') filtered = filtered.filter(tx => tx?.type === 'income');

    if (filtered.length === 0) {
      Alert.alert('Data kosong', 'Tidak ada transaksi untuk dicetak.');
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = {};

    filtered.forEach(tx => {
      if (!tx) return;
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

    // Insights Calculation
    const expenses = filtered.filter(tx => tx.type === 'expense');
    const categoryCounts = {};
    let topTransaction = { name: '-', amount: 0 };
    
    expenses.forEach(tx => {
      const amt = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      if (amt > topTransaction.amount) topTransaction = { name: tx.name, amount: amt };
      const cat = tx.category || 'Lainnya';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const topCategoryByFreq = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    const topCategoryByAmt = sortedCats[0] || ['-', 0];
    const netBalance = totalIncome - totalExpense;

    let svgContent = '';
    let legendRows = '';
    if (totalExpense > 0) {
      const RADIUS = 40;
      const CIRCUM = 2 * Math.PI * RADIUS;
      let offset = 0;

      svgContent = `<svg width="140" height="140" viewBox="0 0 100 100" style="transform: rotate(-90deg)">`;
      sortedCats.slice(0, 7).forEach(([cat, amount], i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const dash = (amount / totalExpense) * CIRCUM;
        const percent = ((amount / totalExpense) * 100).toFixed(1) + '%';
        svgContent += `<circle cx="50" cy="50" r="${RADIUS}" fill="transparent" stroke="${color}" stroke-width="14" stroke-dasharray="${dash} ${CIRCUM - dash}" stroke-dashoffset="-${offset}" />`;
        offset += dash;
        
        legendRows += `
          <tr class="legend-item">
            <td style="width:14px; border:none; padding: 6px 0;"><div style="width:10px; height:10px; border-radius:3px; background:${color};"></div></td>
            <td style="border:none; font-size:12px; padding:6px 12px; font-weight:500; color:#334155;">${cat}</td>
            <td style="border:none; font-size:10px; color:#94A3B8; text-align:right;">${percent}</td>
            <td style="border:none; font-size:12px; text-align:right; font-weight:600; color:#0F172A; padding-left:20px;">Rp ${formatMoney(amount)}</td>
          </tr>
        `;
      });
      svgContent += `</svg>`;
    }

    let txRows = '';
    filtered.slice(0, 500).forEach(tx => {
      if (!tx) return;
      const amount = (tx.myContrib || 0) + (tx.partnerContrib || 0);
      const date = new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const acc = (accounts || []).find(a => a?.id === (tx.type === 'transfer' ? tx.fromAccountId : tx.accountId));
      const walletName = acc ? acc.name : (tx.walletName || 'Tunai');
      const isExpense = tx.type === 'expense';
      
      txRows += `
        <div class="tx-card">
          <div class="tx-left">
            <div class="tx-icon-bg" style="background: ${isExpense ? '#EF444415' : '#10B98115'}">
              <span style="font-size: 20px;">${isExpense ? '📉' : '📈'}</span>
            </div>
            <div class="tx-info">
              <div class="tx-name">${tx.name || '-'}</div>
              <div class="tx-meta">${tx.category || '-'} • ${walletName}</div>
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-amount ${isExpense ? 'expense' : 'income'}">${isExpense ? '-' : '+'}Rp ${formatMoney(amount)}</div>
            <div class="tx-date">${date}</div>
          </div>
        </div>`;
    });

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rika Premium Financial Statement</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1E293B; background: #F8FAFC; margin: 0; }
          
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
          .brand { font-size: 28px; font-weight: 800; color: #0F172A; letter-spacing: -1.5px; }
          .brand span { color: #6366F1; }
          
          .report-badge { background: #6366F1; color: white; padding: 6px 16px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

          /* Summary Cards */
          .summary-grid { display: flex; gap: 20px; margin-bottom: 40px; }
          .summary-card { flex: 1; background: white; padding: 24px; border-radius: 32px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .summary-label { font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .summary-value { font-size: 22px; font-weight: 800; color: #0F172A; }
          .summary-value.income { color: #10B981; }
          .summary-value.expense { color: #EF4444; }

          /* Insight Box */
          .insight-box { background: #6366F1; border-radius: 32px; padding: 30px; color: white; margin-bottom: 40px; position: relative; overflow: hidden; }
          .insight-box::after { content: '💡'; position: absolute; right: -10px; bottom: -10px; font-size: 80px; opacity: 0.1; }
          .insight-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; opacity: 0.9; }
          .insight-text { font-size: 14px; line-height: 1.8; font-weight: 500; }
          .insight-text b { font-weight: 800; color: #FFD93D; }

          /* Analysis Section */
          .section-header { font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; text-transform: uppercase; letter-spacing: 1.5px; }
          .section-header::after { content: ''; flex: 1; height: 1px; background: #E2E8F0; }

          /* Transaction Card - Identical to App */
          .tx-card { 
            background: white; 
            padding: 16px 20px; 
            border-radius: 24px; 
            margin-bottom: 12px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            border: 1px solid #F1F5F9;
          }
          .tx-left { display: flex; align-items: center; gap: 16px; }
          .tx-icon-bg { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
          .tx-info { display: flex; flex-direction: column; }
          .tx-name { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
          .tx-meta { font-size: 12px; color: #64748B; font-weight: 500; }
          
          .tx-right { text-align: right; }
          .tx-amount { font-size: 16px; font-weight: 800; margin-bottom: 2px; }
          .tx-amount.income { color: #10B981; }
          .tx-amount.expense { color: #EF4444; }
          .tx-date { font-size: 11px; color: #94A3B8; font-weight: 600; }

          /* Chart Styling */
          .analysis-box { background: white; padding: 30px; border-radius: 40px; border: 1px solid #E2E8F0; display: flex; align-items: center; gap: 40px; margin-bottom: 40px; }
          
          .footer { text-align: center; margin-top: 60px; padding: 40px; border-top: 1px solid #E2E8F0; }
          .footer-text { font-size: 11px; color: #94A3B8; font-weight: 500; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">RIKA<span>.</span></div>
          <div class="report-badge">${period}</div>
        </div>

        <div class="summary-grid">
          ${(filterType !== 'Pemasukan' && totalExpense > 0) ? `
          <div class="summary-card">
            <div class="summary-label">Pengeluaran</div>
            <div class="summary-value expense">Rp ${formatMoney(totalExpense)}</div>
          </div>
          ` : ''}
          ${(filterType !== 'Pengeluaran' && totalIncome > 0) ? `
          <div class="summary-card">
            <div class="summary-label">Pemasukan</div>
            <div class="summary-value income">Rp ${formatMoney(totalIncome)}</div>
          </div>
          ` : ''}
          ${(filterType === 'Semua' && (totalIncome > 0 || totalExpense > 0)) ? `
          <div class="summary-card">
            <div class="summary-label">Saldo Netto</div>
            <div class="summary-value">Rp ${formatMoney(netBalance)}</div>
          </div>
          ` : ''}
        </div>

        <div class="insight-box">
           <div class="insight-title">Analisa & Insight Strategis</div>
            <div class="insight-text">
              ${filterType === 'Semua' ? `
                Berdasarkan seluruh aktivitas keuangan kita, pengeluaran terbesar ada pada <b>${topTransaction.name}</b> (Rp ${formatMoney(topTransaction.amount)}). 
                ${totalIncome > 0 ? `Kita juga berhasil mengumpulkan pemasukan sebesar <b>Rp ${formatMoney(totalIncome)}</b>.` : ''}
              ` : filterType === 'Pemasukan' ? `
                Berdasarkan data pemasukan kita, total dana yang terkumpul adalah <b>Rp ${formatMoney(totalIncome)}</b>.
              ` : `
                Pengeluaran terbesar kita kali ini adalah <b>${topTransaction.name}</b> dengan nominal <b>Rp ${formatMoney(topTransaction.amount)}</b>.
                Kategori yang paling banyak menyerap anggaran adalah <b>${topCategoryByAmt[0]}</b>.
              `}
              
              ${filterType === 'Semua' ? (
                netBalance > 0 
                ? `<br/><br/>Kabar baik! Kita memiliki surplus sebesar <b>Rp ${formatMoney(netBalance)}</b>. Yuk, tabung sisanya buat goal kita!` 
                : `<br/><br/>Perhatian: Pengeluaran kita sedikit lebih besar dari pemasukan. Yuk, lebih bijak lagi di periode depan.`
              ) : ''}
            </div>
        </div>


        ${totalExpense > 0 ? `
        <div class="section-header">ANALISA PENGELUARAN</div>
        <div class="analysis-box">
          <div style="width: 140px;">${svgContent}</div>
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse;">
              ${legendRows}
            </table>
          </div>
        </div>
        ` : ''}

        <div class="section-header">RIWAYAT TRANSAKSI</div>
        <div class="transactions-list">
          ${txRows}
        </div>

        <div class="footer">
          <div class="footer-text">
            Laporan ini disusun secara otomatis oleh Rika Financial Engine.<br/>
            Dicetak oleh <b>${userName}</b> pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </body>
      </html>`;

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        Alert.alert('Popup Blocked', 'Pastikan browser mengizinkan popup untuk mencetak PDF.');
      }
    } else {
      await Print.printAsync({ html });
    }
  } catch (e) {
    console.error('PDF Error:', e);
    Alert.alert('Gagal', 'Sistem gagal membuat PDF. Silakan coba lagi.');
  }
};
