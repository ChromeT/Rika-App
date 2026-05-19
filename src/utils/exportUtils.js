import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { formatMoney as formatMoneyUtil } from './formatUtils';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

const formatMoney = (val) => formatMoneyUtil(val || 0);

const CHART_COLORS = [
  '#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#9D84B7', '#FF9F43', '#00D2D3', '#54A0FF', '#5F27CD'
];

export const exportToXLS = async (transactions, period = 'Laporan', userName = 'User', filters = { user: 'Kita', type: 'Semua' }, accounts = [], budgetData = null) => {
  try {
    const { user: filterUser, type: filterType } = filters;
    
    let filtered = transactions || [];
    if (filterUser === 'Ayip') filtered = filtered.filter(tx => tx?.owner === userName);
    else if (filterUser === 'Rika') filtered = filtered.filter(tx => tx?.owner !== userName);
    
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
    rows.push(['TANGGAL', 'KETERANGAN', 'KATEGORI', 'DOMPET/SUMBER', 'TIPE', 'METODE', 'OLEH', 'PORSI AYIP', 'PORSI RIKA', 'TOTAL NOMINAL']);

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
        tx.isJoint || tx.isPatungan ? 'Bersama' : (tx.owner || '-'),
        myP,
        parP,
        total
      ]);
    });

    // Sanitize rows to ensure no null/undefined values reach XLSX
    const sanitizedRows = rows.map(row => 
      row.map(cell => (cell === null || cell === undefined) ? '-' : cell)
    );

    const ws = XLSX.utils.aoa_to_sheet(sanitizedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Rika');

    // ─── Budget Plan Sheet ───
    if (budgetData && budgetData.budgets && budgetData.budgets.length > 0) {
      const { budgets, realization = {}, calculateMonthlyBudget } = budgetData;
      const normalizeCategory = (str) => str?.toLowerCase().trim() ?? '';
      const totalMonthly = calculateMonthlyBudget ? calculateMonthlyBudget() : 0;
      const totalReal = Object.values(realization).reduce((a, b) => a + b, 0);
      const currentMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const budgetRows = [
        ['RENCANA BUDGET BULAN INI'],
        ['Kategori', 'Icon', 'Tipe', 'Estimasi/Bulan (Rp)', 'Realisasi Bulan Ini (Rp)', 'Selisih (Rp)', 'Status', 'Milik'],
        ...budgets.map(b => {
          const monthly = b.type === 'daily'
            ? Number(b.estimatedAmount) * Number(b.daysPerMonth || currentMonthDays)
            : Number(b.estimatedAmount);
          const real = realization[normalizeCategory(b.category)] || 0;
          const diff = monthly - real;
          return [
            b.category,
            b.icon || '',
            b.type === 'daily' ? 'Harian' : b.type === 'monthly' ? 'Bulanan' : 'Sekali',
            monthly,
            real,
            diff,
            diff >= 0 ? 'Aman' : 'Over Budget',
            b.owner || 'Kita',
          ];
        }),
        [],
        ['TOTAL', '', '', totalMonthly, totalReal, totalMonthly - totalReal, totalMonthly - totalReal >= 0 ? 'Surplus' : 'Defisit', ''],
      ];
      const wsBudget = XLSX.utils.aoa_to_sheet(budgetRows);
      XLSX.utils.book_append_sheet(wb, wsBudget, 'Budget Plan');
    }

    const timestamp = Date.now();
    const filename = `Rika_Report_${timestamp}.xlsx`;
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, sanitizedFilename);
    } else {
      // Use type 'base64' but ensure we use global Buffer if available
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileUri = `${FileSystem.documentDirectory}${sanitizedFilename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: 'base64'
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
    Alert.alert('Gagal Ekspor XLS', `Terjadi kesalahan saat membuat file Excel: ${e.message}`);
  }
};

export const exportToPDF = async (transactions, period = 'Laporan', userName = 'User', filters = { user: 'Kita', type: 'Semua' }, accounts = [], householdUsers = [], budgetData = null) => {
  try {
    const { user: filterUser, type: filterType } = filters;
    
    let filtered = transactions || [];
    if (filterUser === 'Ayip') filtered = filtered.filter(tx => tx?.owner === userName);
    else if (filterUser === 'Rika') filtered = filtered.filter(tx => tx?.owner !== userName);
    
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
      if (!tx || tx.type === 'transfer') return; // Skip transfer dari perhitungan
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
    const topCategoryByAmt = sortedCats[0] || ['-', 0];
    const netBalance = totalIncome - totalExpense;
    const totalAsset = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0);

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

    // ─── Precompute Budget Section ───
    const ICON_EMOJI_MAP = {
      'restaurant': '🍽️', 'receipt': '🧾', 'shopping-bag': '🛍️',
      'directions-car': '🚗', 'movie': '🎬', 'medical-services': '💊',
      'savings': '💰', 'home': '🏠', 'credit-card': '💳',
      'two-wheeler': '🏍️', 'phone-iphone': '📱', 'school': '🎓',
      'flight': '✈️', 'work': '💼', 'label': '🏷️', 'more-horiz': '📌',
    };
    let budgetSectionHtml = '';
    let budgetNarrative = '';
    if (budgetData && budgetData.budgets && budgetData.budgets.length > 0) {
      const { budgets: bArr, realization: real = {}, calculateMonthlyBudget: calcFn } = budgetData;
      const normCat = (str) => str?.toLowerCase().trim() ?? '';
      // Fuzzy match: coba exact dulu, lalu partial (contains)
      const getRealAmt = (budgetCat) => {
        const key = normCat(budgetCat);
        if (real[key] !== undefined) return real[key];
        for (const [txCat, amt] of Object.entries(real)) {
          if (txCat.includes(key) || key.includes(txCat)) return amt;
        }
        return 0;
      };
      const currentMonthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const budgetMonthly = calcFn
        ? calcFn()
        : bArr.reduce((sum, b) => sum + (b.type === 'daily'
            ? Number(b.estimatedAmount) * Number(b.daysPerMonth || currentMonthDays)
            : Number(b.estimatedAmount)), 0);
      // Total realisasi = sum per-baris (konsisten dengan tampilan tabel)
      const budgetReal = bArr.reduce((sum, b) => sum + getRealAmt(b.category), 0);
      const totalExpenseThisMonth = Object.values(real).reduce((a, v) => a + v, 0);
      const budgetDiff = budgetMonthly - budgetReal;
      const budgetOk = budgetDiff >= 0;

      const bRowsHtml = bArr.map(b => {
        const monthly = b.type === 'daily'
          ? Number(b.estimatedAmount) * Number(b.daysPerMonth || currentMonthDays)
          : Number(b.estimatedAmount);
        const realAmt = getRealAmt(b.category);
        const diff = monthly - realAmt;
        const isOver = diff < 0;
        const emoji = ICON_EMOJI_MAP[b.icon] || '📌';
        const catLabel = b.category || b.name || 'Lainnya';
        return `<tr style="border-bottom:1px solid #F1F5F9">
          <td style="padding:12px 16px;vertical-align:middle">
            <span style="margin-right:6px;font-size:16px">${emoji}</span>
            <span style="font-weight:600;color:#0F172A">${catLabel}</span>
            <span style="margin-left:6px;font-size:10px;color:#94A3B8;background:#F1F5F9;border-radius:4px;padding:2px 6px;font-weight:600">${b.owner || 'Kita'}</span>
          </td>
          <td style="text-align:right;padding:12px 16px;color:#475569;font-weight:600">Rp ${formatMoney(monthly)}</td>
          <td style="text-align:right;padding:12px 16px;color:#475569;font-weight:600">Rp ${formatMoney(realAmt)}</td>
          <td style="text-align:right;padding:12px 16px;font-weight:700;color:${isOver ? '#DC2626' : '#059669'}">${diff >= 0 ? '+' : '-'}Rp ${formatMoney(Math.abs(diff))}</td>
          <td style="text-align:center;padding:12px 16px">
            <span style="display:inline-block;background:${isOver ? '#FEE2E2' : '#D1FAE5'};color:${isOver ? '#DC2626' : '#059669'};border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:0.3px">
              ${isOver ? '&#9679; Over Budget' : '&#9679; Aman'}
            </span>
          </td>
        </tr>`;
      }).join('');

      budgetNarrative = `<br/><br/>Untuk rencana budget bulan ini, estimasi pengeluaran total <b>Rp ${formatMoney(budgetMonthly)}</b> dengan realisasi saat ini <b>Rp ${formatMoney(budgetReal)}</b> — ${budgetOk ? `masih ada ruang <b style="color:#FFD93D">Rp ${formatMoney(Math.abs(budgetDiff))}</b> sebelum batas budget tercapai.` : `budget sudah melebihi rencana sebesar <b style="color:#FFD93D">Rp ${formatMoney(Math.abs(budgetDiff))}</b>. Perlu perhatian lebih!`}`;

      budgetSectionHtml = `
        <div class="section-header">RENCANA BUDGET BULAN INI</div>
        <div style="background:white;border-radius:28px;border:1px solid #E2E8F0;margin-bottom:40px;box-shadow:0 2px 12px rgba(0,0,0,0.04);overflow:hidden">
          <div style="display:flex;border-bottom:1px solid #F1F5F9">
            <div style="flex:1;padding:20px 24px;border-right:1px solid #F1F5F9">
              <div style="font-size:10px;color:#64748B;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">ESTIMASI / BULAN</div>
              <div style="font-size:22px;font-weight:800;color:#0F172A">Rp ${formatMoney(budgetMonthly)}</div>
            </div>
            <div style="flex:1;padding:20px 24px;border-right:1px solid #F1F5F9">
              <div style="font-size:10px;color:#64748B;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">REALISASI BULAN INI</div>
              <div style="font-size:22px;font-weight:800;color:#0F172A">Rp ${formatMoney(budgetReal)}</div>
            </div>
            <div style="flex:1;padding:20px 24px;background:${budgetOk ? '#F0FDF4' : '#FEF2F2'}">
              <div style="font-size:10px;color:${budgetOk ? '#059669' : '#DC2626'};font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">${budgetOk ? 'SURPLUS BUDGET' : 'DEFISIT BUDGET'}</div>
              <div style="font-size:22px;font-weight:800;color:${budgetOk ? '#059669' : '#DC2626'}">${budgetOk ? '+' : '-'}Rp ${formatMoney(Math.abs(budgetDiff))}</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#F8FAFC">
                <th style="text-align:left;padding:12px 16px;color:#64748B;font-size:10px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase">KATEGORI</th>
                <th style="text-align:right;padding:12px 16px;color:#64748B;font-size:10px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase">ESTIMASI</th>
                <th style="text-align:right;padding:12px 16px;color:#64748B;font-size:10px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase">REALISASI</th>
                <th style="text-align:right;padding:12px 16px;color:#64748B;font-size:10px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase">SELISIH</th>
                <th style="text-align:center;padding:12px 16px;color:#64748B;font-size:10px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody>${bRowsHtml}</tbody>
            <tfoot>
              <tr style="font-weight:800;background:#F8FAFC;border-top:2px solid #E2E8F0">
                <td style="padding:14px 16px;font-size:13px;color:#0F172A;font-weight:800">TOTAL</td>
                <td style="text-align:right;padding:14px 16px;color:#0F172A;font-weight:800">Rp ${formatMoney(budgetMonthly)}</td>
                <td style="text-align:right;padding:14px 16px;color:#0F172A;font-weight:800">Rp ${formatMoney(budgetReal)}</td>
                <td style="text-align:right;padding:14px 16px;font-weight:800;font-size:15px;color:${budgetOk ? '#059669' : '#DC2626'}">${budgetOk ? '+' : '-'}Rp ${formatMoney(Math.abs(budgetDiff))}</td>
                <td style="text-align:center;padding:14px 16px">
                  <span style="display:inline-block;background:${budgetOk ? '#D1FAE5' : '#FEE2E2'};color:${budgetOk ? '#059669' : '#DC2626'};border-radius:10px;padding:7px 18px;font-size:12px;font-weight:800;letter-spacing:0.5px">
                    &#9679; ${budgetOk ? 'Surplus' : 'Defisit'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>`;
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
              <div class="tx-meta">
                ${tx.category || '-'} • ${walletName} • Oleh: ${tx.isJoint || tx.isPatungan ? 'Kita' : (tx.owner || '-')}
                ${(tx.isJoint || tx.isPatungan) ? `
                  <div style="margin-top: 4px; font-size: 10px; color: #64748B;">
                    Porsi: ${userName} (Rp ${formatMoney(tx.myContrib)}) • ${tx.owner === userName ? (householdUsers.find(u => u !== userName) || 'Rika') : tx.owner} (Rp ${formatMoney(tx.partnerContrib)})
                  </div>
                ` : ''}
              </div>
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
            <div class="summary-value" style="color: ${netBalance >= 0 ? '#10B981' : '#EF4444'}">
              Rp ${netBalance < 0 ? '-' : ''}${formatMoney(Math.abs(netBalance))}
            </div>
          </div>
          ` : ''}
        </div>

        ${filterType === 'Semua' ? `
        <div style="background: #0F172A; padding: 20px 30px; border-radius: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);">
          <div style="font-size: 12px; color: #94A3B8; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Total Sisa Uang Kita (Aset)</div>
          <div style="font-size: 22px; color: #F8FAFC; font-weight: 800;">Rp ${formatMoney(totalAsset)}</div>
        </div>
        ` : ''}

        <div class="insight-box">
           <div class="insight-title">Analisa & Insight Strategis</div>
            <div class="insight-text">
              ${filterType === 'Semua' ? `
                Berdasarkan seluruh aktivitas keuangan kita, kategori pengeluaran terbesar ada pada <b>${topCategoryByAmt[0]}</b> (Rp ${formatMoney(topCategoryByAmt[1])}). 
                ${totalIncome > 0 ? `Kita juga berhasil mengumpulkan pemasukan sebesar <b>Rp ${formatMoney(totalIncome)}</b>.` : ''}
              ` : filterType === 'Pemasukan' ? `
                Berdasarkan data pemasukan kita, total dana yang terkumpul adalah <b>Rp ${formatMoney(totalIncome)}</b>.
              ` : `
                Kategori pengeluaran terbesar kita kali ini adalah <b>${topCategoryByAmt[0]}</b> dengan nominal <b>Rp ${formatMoney(topCategoryByAmt[1])}</b>.
              `}
              
              ${filterType === 'Semua' ? (
                netBalance >= 0 
                ? `<br/><br/>Kabar baik! Kita memiliki surplus sebesar <b>Rp ${formatMoney(netBalance)}</b>. Yuk, tabung sisanya buat goal kita!` 
                : `<br/><br/>Perhatian: Pengeluaran kita sedikit lebih besar dari pemasukan (selisih Rp ${formatMoney(Math.abs(netBalance))}). Yuk, lebih bijak lagi di periode depan.`
              ) : ''}
              ${budgetNarrative}
            </div>
        </div>


        ${budgetSectionHtml}

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
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Simpan Laporan PDF Rika',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Gagal', 'Fitur berbagi tidak tersedia di perangkat ini.');
      }
    }
  } catch (e) {
    console.error('PDF Error:', e);
    Alert.alert('Gagal', 'Sistem gagal membuat PDF. Silakan coba lagi.');
  }
};
