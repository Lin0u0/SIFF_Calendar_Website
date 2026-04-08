import { state } from './state.js';
import { parseDateTime, parseDuration, calculateEndTime, drawRoundRect } from './utils.js';

function groupMoviesByDate() {
    const byDate = new Map();
    for (const movie of state.selectedMovies.values()) {
        const d = movie['日期'];
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d).push(movie);
    }
    const sorted = new Map();
    Array.from(byDate.keys())
        .sort((a, b) => parseDateTime(a, '00:00') - parseDateTime(b, '00:00'))
        .forEach(d => sorted.set(d, byDate.get(d).sort((a, b) => a['放映时间'].localeCompare(b['放映时间']))));
    return sorted;
}

export function generateShareImage() {
    if (state.selectedMovies.size === 0) { alert('请先选择电影'); return; }
    const userName = prompt('请输入您的昵称：', '影迷');
    if (userName === null) return;

    const modal = document.getElementById('shareModal');
    const body = document.querySelector('.share-modal-body');
    body.innerHTML = '<p style="padding:40px;text-align:center">正在生成图片...</p>';
    modal.classList.add('show');

    const logo = new Image();
    logo.onload = () => render(userName, logo);
    logo.onerror = () => render(userName, null);
    logo.src = 'siff-logo.jpg';
}

function render(userName, logo) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const W = 750, pad = 40, cardH = 140, cardGap = 20, headerH = 300;
    const byDate = groupMoviesByDate();

    let H = headerH;
    for (const [, movies] of byDate) { H += 80 + movies.length * (cardH + cardGap) + 40; }
    H -= 50;

    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#6366f1');
    bg.addColorStop(0.5, '#8b5cf6');
    bg.addColorStop(1, '#a855f7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle light beams
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(W * 0.3 + i * 100, 0);
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-40, 0, 80, H * 1.5);
        ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Header card
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    drawRoundRect(ctx, 40, 60, W - 80, 160, 20);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.font = '700 46px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#fff';
    const nameW = ctx.measureText(userName + ' ').width;
    ctx.fillText(userName, 60, 120);
    const title = state.dataSource === 'bjiff' ? '的 BJIFF 2026' : '的 SIFF 2025';
    ctx.fillText(title, 60 + nameW, 120);
    ctx.restore();

    ctx.font = '400 20px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`与 ${state.selectedMovies.size} 场电影相遇`, 60, 160);

    const dates = Array.from(byDate.keys());
    if (dates.length > 0) {
        const range = dates.length === 1 ? dates[0] : `${dates[0]} - ${dates[dates.length - 1]}`;
        ctx.fillText(range, 60, 190);
    }

    if (logo) ctx.drawImage(logo, W - 160, 90, 100, 100);

    // Movie cards
    let y = headerH;
    for (const [date, movies] of byDate) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        drawRoundRect(ctx, pad, y, 180, 50, 25);
        ctx.fill();
        ctx.font = '700 24px -apple-system, "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(date, pad + 90, y + 25);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        y += 80;

        movies.forEach(movie => {
            drawCard(ctx, movie, pad, y, W - 2 * pad, cardH);
            y += cardH + cardGap;
        });
        y += 20;
    }

    // Footer
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, H - 60); ctx.lineTo(W - 40, H - 60); ctx.stroke();
    ctx.font = '400 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('Powered by lin0u0', W / 2, H - 30);
    ctx.textAlign = 'left';

    // Display
    const body = document.querySelector('.share-modal-body');
    body.innerHTML = '<div class="canvas-container"><canvas id="shareCanvas"></canvas></div>';
    const display = document.getElementById('shareCanvas');
    display.width = canvas.width;
    display.height = canvas.height;
    display.getContext('2d').drawImage(canvas, 0, 0);
}

function drawCard(ctx, movie, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    drawRoundRect(ctx, x, y, w, h - 20, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Time tag
    const tw = 140;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    drawRoundRect(ctx, x + 20, y + 30, tw, 60, 25);
    ctx.fill();
    ctx.font = '700 20px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(movie['放映时间'], x + 20 + tw / 2, y + 55);

    const dur = parseDuration(movie['时长']);
    const [sh, sm] = movie['放映时间'].split(':').map(Number);
    ctx.font = '400 18px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(calculateEndTime(sh, sm, dur), x + 20 + tw / 2, y + 80);
    ctx.textAlign = 'left';

    // Title
    ctx.font = '700 28px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#fff';
    let title = movie['中文片名'];
    const maxW = w - tw - 80;
    if (ctx.measureText(title).width > maxW) {
        while (ctx.measureText(title + '...').width > maxW && title.length > 0) title = title.slice(0, -1);
        title += '...';
    }
    ctx.fillText(title, x + tw + 40, y + 45);

    ctx.font = '400 18px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${movie['影院']} · ${movie['影厅'] || ''}`, x + tw + 40, y + 75);

    ctx.font = '400 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const extra = [movie['导演'], movie['时长'], movie['票价'] ? movie['票价'] + '元' : ''].filter(Boolean).join(' | ');
    ctx.fillText(extra, x + tw + 40, y + 100);

    if (movie['见面会'] === '★') {
        const bx = x + w - 100, by = y + (h - 20) / 2 - 20;
        ctx.fillStyle = '#fbbf24';
        drawRoundRect(ctx, bx, by, 80, 40, 20);
        ctx.fill();
        ctx.font = '700 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText('见面会', bx + 40, by + 25);
        ctx.textAlign = 'left';
    }
    ctx.restore();
}

export function closeShareModal() {
    document.getElementById('shareModal').classList.remove('show');
}
