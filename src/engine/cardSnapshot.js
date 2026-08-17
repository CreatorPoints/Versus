/**
 * VERSUS - Ultra-Crisp 2X High-DPI Canvas Card Snapshot Generator
 * Renders the Chess Game Review Card directly to a 2D Canvas without CORS font issues,
 * stylesheet access bugs, or DOM clipping. Exports directly to Clipboard or PNG file.
 */
export async function snapshotAnalysisCard(data) {
  const width = 1100;
  const height = 1180;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Outer Card
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(30, 30, width - 60, height - 60, 28);
  ctx.fill();
  ctx.stroke();

  // 1. Header Badge
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(width / 2 - 170, 60, 340, 36, 18);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.fillText('♟️ VERSUS • GAME REVIEW & ANALYSIS', width / 2, 84);

  // Result Title
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(data.title || 'White Won by Checkmate', width / 2, 140);

  // Subtitle
  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(data.subtitle || 'Full Moves Report • Lichess-Grade Review', width / 2, 175);

  // 2. Player Comparison Boxes
  const boxW = 460;
  const boxH = 200;
  const boxY = 215;

  // Player 1 (White / Blue)
  ctx.fillStyle = '#f0f9ff';
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(65, boxY, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  // P1 Name
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.textAlign = 'center';
  ctx.fillText(data.p1Name || 'Player 1 (White)', 65 + boxW / 2, boxY + 42);

  // P1 Accuracy
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`${data.p1Acc || 85}%`, 65 + boxW / 2, boxY + 106);

  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('ACCURACY', 65 + boxW / 2, boxY + 128);

  // P1 Elo & Perf Badges
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(65 + 60, boxY + 148, 140, 32, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`ELO: ${data.p1Elo || 1500}`, 65 + 130, boxY + 170);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(65 + 260, boxY + 148, 140, 32, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0369a1';
  ctx.fillText(`Perf: ${data.p1Perf || 1600}`, 65 + 330, boxY + 170);

  // VS Divider
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('VS', width / 2, boxY + boxH / 2 + 8);

  // Player 2 (Black / Pink)
  ctx.fillStyle = '#fff1f2';
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(width - 65 - boxW, boxY, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  // P2 Name
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#e11d48';
  ctx.fillText(data.p2Name || 'AI Bot (Black)', width - 65 - boxW / 2, boxY + 42);

  // P2 Accuracy
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`${data.p2Acc || 75}%`, width - 65 - boxW / 2, boxY + 106);

  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('ACCURACY', width - 65 - boxW / 2, boxY + 128);

  // P2 Elo & Perf Badges
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#fecdd3';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(width - 65 - boxW + 60, boxY + 148, 140, 32, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#be123c';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`ELO: ${data.p2Elo || 1100}`, width - 65 - boxW + 130, boxY + 170);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(width - 65 - boxW + 260, boxY + 148, 140, 32, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#be123c';
  ctx.fillText(`Perf: ${data.p2Perf || 1050}`, width - 65 - boxW + 330, boxY + 170);

  // 3. Move Classification Breakdown Table
  const tableY = 450;
  const tableW = width - 130;
  const tableH = 390;

  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(65, tableY, tableW, tableH, 20);
  ctx.fill();
  ctx.stroke();

  const rows = [
    { label: 'Brilliant Moves', badge: '💎 Brilliant', badgeBg: '#dbeafe', badgeColor: '#1d4ed8', p1: data.p1Stats.brilliant, p2: data.p2Stats.brilliant },
    { label: 'Great Moves', badge: '⭐ Great', badgeBg: '#e0e7ff', badgeColor: '#4338ca', p1: data.p1Stats.great, p2: data.p2Stats.great },
    { label: 'Best Moves', badge: '🟢 Best', badgeBg: '#dcfce7', badgeColor: '#15803d', p1: data.p1Stats.best, p2: data.p2Stats.best },
    { label: 'Inaccuracies', badge: '🟡 Inaccuracy', badgeBg: '#fef9c3', badgeColor: '#a16207', p1: data.p1Stats.inaccuracy, p2: data.p2Stats.inaccuracy },
    { label: 'Mistakes', badge: '🟠 Mistake', badgeBg: '#ffedd5', badgeColor: '#c2410c', p1: data.p1Stats.mistake, p2: data.p2Stats.mistake },
    { label: 'Blunders', badge: '🔴 Blunder', badgeBg: '#fee2e2', badgeColor: '#b91c1c', p1: data.p1Stats.blunder, p2: data.p2Stats.blunder }
  ];

  const rowHeight = 56;
  rows.forEach((r, idx) => {
    const ry = tableY + 20 + idx * rowHeight;

    // Badge
    ctx.fillStyle = r.badgeBg;
    ctx.beginPath();
    ctx.roundRect(95, ry, 130, 36, 10);
    ctx.fill();

    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = r.badgeColor;
    ctx.textAlign = 'center';
    ctx.fillText(r.badge, 160, ry + 24);

    // P1 Count
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0ea5e9';
    ctx.textAlign = 'right';
    ctx.fillText(`${r.p1 || 0}`, 340, ry + 26);

    // Label
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText(r.label, width / 2, ry + 24);

    // P2 Count
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'left';
    ctx.fillText(`${r.p2 || 0}`, width - 340, ry + 26);
  });

  // 4. PGN Box Preview
  const pgnY = 865;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(65, pgnY, tableW, 160, 16);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText('📜 PGN MOVE LOG:', 85, pgnY + 28);

  ctx.font = '500 14px "Courier New", Courier, monospace';
  ctx.fillStyle = '#1e293b';
  
  // Wrap PGN text into 3 lines
  const pgnText = data.pgn || '1. e4 e5 2. Nf3 Nc6';
  const words = pgnText.split(' ');
  let line = '';
  let lineY = pgnY + 54;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > tableW - 40 && i > 0) {
      ctx.fillText(line, 85, lineY);
      line = words[i] + ' ';
      lineY += 22;
      if (lineY > pgnY + 140) {
        ctx.fillText(line + '...', 85, lineY);
        line = '';
        break;
      }
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, 85, lineY);

  // Footer Branding
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText('🎮 VERSUS PARTY • https://versus-party.web.app', width / 2, height - 55);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ blob, canvas });
    }, 'image/png');
  });
}
