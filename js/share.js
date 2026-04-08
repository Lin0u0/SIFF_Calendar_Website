import { state } from './state.js';
import { parseDateTime, parseDuration, calculateEndTime, drawRoundRect, getMovieDate, getMovieTime } from './utils.js';

const shareConfig = {
    userName: '影迷',
    showCinemaInfo: true,
    showPriceInfo: true,
};

function groupMoviesByDate() {
    const byDate = new Map();
    for (const movie of state.selectedMovies.values()) {
        const d = getMovieDate(movie);
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d).push(movie);
    }
    const sorted = new Map();
    Array.from(byDate.keys())
        .sort((a, b) => parseDateTime(a, '00:00') - parseDateTime(b, '00:00'))
        .forEach(d => sorted.set(d, byDate.get(d).sort((a, b) => getMovieTime(a).localeCompare(getMovieTime(b)))));
    return sorted;
}

export function generateShareImage() {
    if (state.selectedMovies.size === 0) { alert('请先选择电影'); return; }
    const userName = prompt('请输入您的昵称：', shareConfig.userName || '影迷');
    if (userName === null) return;
    shareConfig.userName = userName.trim() || '影迷';

    const modal = document.getElementById('shareModal');
    const body = document.querySelector('.share-modal-body');
    modal.classList.add('show');
    body.innerHTML = getShareControlsHTML();
    bindShareControls();
    render(shareConfig.userName);
}

function render(userName) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const W = 750, pad = 40, cardGap = 20, headerH = 300, footerH = 72;
    const byDate = groupMoviesByDate();

    let H = headerH + footerH;
    for (const [, movies] of byDate) {
        H += 80;
        movies.forEach((movie) => {
            H += getCardHeight(ctx, movie) + cardGap;
        });
        H += 20;
    }

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
    const headerX = 40;
    const headerY = 60;
    const headerW = W - 80;
    const headerHCard = 160;
    const headerContentMaxW = headerW - 64;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    drawRoundRect(ctx, headerX, headerY, headerW, headerHCard, 20);
    ctx.fill();

    const stats = getShareStats();
    const dates = Array.from(byDate.keys());
    const range = dates.length > 0
        ? (dates.length === 1 ? dates[0] : `${dates[0]} - ${dates[dates.length - 1]}`)
        : '';
    drawHeaderContent(ctx, {
        x: headerX + 32,
        y: headerY,
        w: headerContentMaxW,
        h: headerHCard,
        title: `${userName} 的 ${state.dataSource === 'bjiff' ? 'BJIFF 2026' : 'SIFF 2025'}`,
        subtitle: `与 ${state.selectedMovies.size} 场电影相遇`,
        range,
        stats,
    });

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
            const cardH = getCardHeight(ctx, movie);
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
    const container = document.querySelector('.share-modal-body .canvas-container');
    if (!container) return;
    container.innerHTML = '<canvas id="shareCanvas"></canvas>';
    const display = document.getElementById('shareCanvas');
    display.width = canvas.width;
    display.height = canvas.height;
    display.getContext('2d').drawImage(canvas, 0, 0);
}

function drawCard(ctx, movie, x, y, w, h) {
    ctx.save();
    const cardRadius = Math.round(Math.min(h * 0.18, 30));
    const badgeW = movie['见面会'] === '★' ? 100 : 0;
    const outerPadX = 24;
    const outerPadY = 20;
    const timePillW = 154;
    const timePillH = 76;
    const timePillRadius = Math.round(Math.min(timePillH * 0.34, cardRadius - 2));
    const gap = 22;
    const contentLeft = x + outerPadX + timePillW + gap;
    const contentRight = x + w - outerPadX - badgeW - (badgeW ? 16 : 0);
    const contentMaxW = Math.max(160, contentRight - contentLeft);
    const movieTime = getMovieTime(movie) || '00:00';
    const dur = parseDuration(movie['时长']);
    const [sh, sm] = movieTime.split(':').map(Number);
    const layout = measureCardLayout(ctx, movie, contentMaxW);
    const innerHeight = h - outerPadY * 2;
    const timePillY = y + outerPadY + (innerHeight - timePillH) / 2;
    const contentTop = y + outerPadY + (innerHeight - layout.totalHeight) / 2;

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    drawRoundRect(ctx, x, y, w, h, cardRadius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Time tag
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    drawRoundRect(ctx, x + outerPadX, timePillY, timePillW, timePillH, timePillRadius);
    ctx.fill();
    ctx.font = '700 20px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(movieTime, x + outerPadX + timePillW / 2, timePillY + 24);

    ctx.font = '400 18px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(calculateEndTime(sh, sm, dur), x + outerPadX + timePillW / 2, timePillY + 54);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Title
    ctx.font = '700 28px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    layout.titleLines.forEach((line, index) => {
        ctx.fillText(line, contentLeft, contentTop + index * layout.titleLineHeight);
    });

    ctx.font = '600 18px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    layout.cinemaLines.forEach((line, index) => {
        ctx.fillText(line, contentLeft, contentTop + layout.cinemaOffset + index * layout.cinemaLineHeight);
    });

    ctx.font = '400 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    layout.metaLines.forEach((line, index) => {
        ctx.fillText(line, contentLeft, contentTop + layout.metaOffset + index * layout.metaLineHeight);
    });
    if (layout.statsText) {
        ctx.fillText(layout.statsText, contentLeft, contentTop + layout.statsOffset);
    }
    ctx.textBaseline = 'alphabetic';

    if (movie['见面会'] === '★') {
        const bx = x + w - outerPadX - badgeW;
        const by = y + (h - 44) / 2;
        ctx.fillStyle = '#fbbf24';
        drawRoundRect(ctx, bx, by, badgeW, 44, 22);
        ctx.fill();
        ctx.font = '700 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('见面会', bx + badgeW / 2, by + 24);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
}

function getCardHeight(ctx, movie) {
    const badgeW = movie['见面会'] === '★' ? 100 : 0;
    const contentMaxW = Math.max(160, 750 - 80 - 24 - 154 - 22 - 24 - badgeW - (badgeW ? 16 : 0));
    const layout = measureCardLayout(ctx, movie, contentMaxW);
    const outerPadY = 20;
    const timePillH = 76;
    return Math.ceil(Math.max(timePillH, layout.totalHeight) + outerPadY * 2);
}

function wrapText(ctx, text, maxWidth, font, maxLines = 2) {
    if (!text) return [];

    ctx.save();
    ctx.font = font;

    const chars = Array.from(text);
    const lines = [];
    let current = '';
    let index = 0;

    while (index < chars.length && lines.length < maxLines) {
        const char = chars[index];
        const next = current + char;

        if (ctx.measureText(next).width <= maxWidth || current.length === 0) {
            current = next;
            index += 1;
            continue;
        }

        if (lines.length === maxLines - 1) break;
        lines.push(current);
        current = '';
    }

    if (lines.length < maxLines && current) {
        let lastLine = current + chars.slice(index).join('');
        if (ctx.measureText(lastLine).width <= maxWidth) {
            lines.push(lastLine);
        } else {
            while (lastLine.length > 0 && ctx.measureText(lastLine + '...').width > maxWidth) {
                lastLine = lastLine.slice(0, -1);
            }
            lines.push(lastLine ? lastLine + '...' : '...');
        }
    }

    ctx.restore();
    return lines.slice(0, maxLines);
}

function measureCardLayout(ctx, movie, contentMaxW) {
    const titleLineHeight = 28;
    const cinemaLineHeight = 22;
    const metaLineHeight = 20;
    const statsLineHeight = 20;
    const titleLines = wrapText(ctx, movie['中文片名'] || '', contentMaxW, '700 28px -apple-system, "Helvetica Neue", Arial, sans-serif', 2);
    const cinemaLines = shareConfig.showCinemaInfo
        ? buildCinemaLines(ctx, movie, contentMaxW)
        : [];
    const metaParts = [movie['导演']].filter(Boolean);
    const metaLines = wrapText(ctx, metaParts.join(' | '), contentMaxW, '400 16px -apple-system, "Helvetica Neue", Arial, sans-serif', 2);
    const statsParts = [movie['时长']];
    if (shareConfig.showPriceInfo && movie['票价']) statsParts.push(`${movie['票价']}元`);

    const titleHeight = titleLines.length * titleLineHeight;
    const cinemaHeight = cinemaLines.length * cinemaLineHeight;
    const metaHeight = metaLines.length * metaLineHeight;
    const hasStats = statsParts.filter(Boolean).length > 0;
    const statsText = hasStats ? statsParts.filter(Boolean).join(' | ') : '';

    let cursor = 0;
    const cinemaOffset = titleHeight > 0 && cinemaHeight > 0 ? titleHeight + 8 : titleHeight;
    cursor = titleHeight;
    if (cinemaHeight > 0) cursor += 8 + cinemaHeight;
    const metaOffset = cursor + (metaHeight > 0 && cursor > 0 ? 8 : 0);
    if (metaHeight > 0) cursor = metaOffset + metaHeight;
    const statsOffset = cursor + (statsText && cursor > 0 ? 8 : 0);
    const totalHeight = statsText ? statsOffset + statsLineHeight : cursor;

    return {
        titleLines,
        cinemaLines,
        metaLines,
        statsText,
        titleHeight,
        cinemaHeight,
        metaHeight,
        totalHeight,
        titleLineHeight,
        cinemaLineHeight,
        metaLineHeight,
        cinemaOffset,
        metaOffset,
        statsOffset,
    };
}

function buildCinemaLines(ctx, movie, maxWidth) {
    const cinema = String(movie['影院'] || '').trim();
    const hall = String(movie['影厅'] || '').trim();
    const font = '600 18px -apple-system, "Helvetica Neue", Arial, sans-serif';

    if (!cinema && !hall) return [];
    if (cinema && hall) {
        const combined = `${cinema} · ${hall}`;
        ctx.save();
        ctx.font = font;
        const fitsOneLine = ctx.measureText(combined).width <= maxWidth;
        ctx.restore();
        if (fitsOneLine) return [combined];

        const hallLines = wrapText(ctx, hall, maxWidth, font, 2);
        return [fitSingleLineText(ctx, cinema, maxWidth, font), ...hallLines].slice(0, 3);
    }

    return wrapText(ctx, cinema || hall, maxWidth, font, 3);
}

function fitSingleLineText(ctx, text, maxWidth, font) {
    if (!text) return '';

    ctx.save();
    ctx.font = font;

    if (ctx.measureText(text).width <= maxWidth) {
        ctx.restore();
        return text;
    }

    let result = text;
    while (result.length > 0 && ctx.measureText(result + '...').width > maxWidth) {
        result = result.slice(0, -1);
    }

    ctx.restore();
    return result ? `${result}...` : '';
}

function drawHeaderContent(ctx, { x, y, w, h, title, subtitle, range, stats }) {
    const items = [
        {
            text: fitSingleLineText(ctx, title, w, '700 46px -apple-system, "Helvetica Neue", Arial, sans-serif'),
            font: '700 46px -apple-system, "Helvetica Neue", Arial, sans-serif',
            color: '#fff',
            lineHeight: 54,
            shadow: true,
        },
        {
            text: fitSingleLineText(ctx, subtitle, w, '400 20px -apple-system, "Helvetica Neue", Arial, sans-serif'),
            font: '400 20px -apple-system, "Helvetica Neue", Arial, sans-serif',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 26,
        },
        range ? {
            text: fitSingleLineText(ctx, range, w, '400 20px -apple-system, "Helvetica Neue", Arial, sans-serif'),
            font: '400 20px -apple-system, "Helvetica Neue", Arial, sans-serif',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 26,
        } : null,
        stats ? {
            text: fitSingleLineText(ctx, stats, w, '600 18px -apple-system, "Helvetica Neue", Arial, sans-serif'),
            font: '600 18px -apple-system, "Helvetica Neue", Arial, sans-serif',
            color: 'rgba(255,255,255,0.78)',
            lineHeight: 24,
        } : null,
    ].filter(Boolean);

    const totalHeight = items.reduce((sum, item) => sum + item.lineHeight, 0);
    let cursorY = y + (h - totalHeight) / 2;

    items.forEach((item) => {
        ctx.save();
        ctx.font = item.font;
        ctx.fillStyle = item.color;
        ctx.textBaseline = 'top';
        if (item.shadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 8;
        }
        ctx.fillText(item.text, x, cursorY);
        ctx.restore();
        cursorY += item.lineHeight;
    });
}

function getShareStats() {
    let totalMinutes = 0;
    let totalPrice = 0;

    for (const movie of state.selectedMovies.values()) {
        totalMinutes += Math.round(parseDuration(movie['时长']) / (60 * 1000));
        const numericPrice = parsePrice(movie['票价']);
        if (numericPrice != null) totalPrice += numericPrice;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const durationText = hours > 0 ? `总时长 ${hours}小时${minutes ? `${minutes}分钟` : ''}` : `总时长 ${minutes}分钟`;
    if (!shareConfig.showPriceInfo) return durationText;

    const priceText = totalPrice > 0 ? `总票价 ${totalPrice}元` : '总票价 待定';
    return `${durationText} · ${priceText}`;
}

function parsePrice(value) {
    if (value == null || value === '') return null;
    const match = String(value).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
}

function getShareControlsHTML() {
    return `
        <div class="share-controls">
            <label class="share-toggle">
                <input type="checkbox" id="shareShowCinema" ${shareConfig.showCinemaInfo ? 'checked' : ''}>
                <span>显示影院信息</span>
            </label>
            <label class="share-toggle">
                <input type="checkbox" id="shareShowPrice" ${shareConfig.showPriceInfo ? 'checked' : ''}>
                <span>显示价格信息</span>
            </label>
        </div>
        <div class="canvas-container"><canvas id="shareCanvas"></canvas></div>
    `;
}

function bindShareControls() {
    const showCinema = document.getElementById('shareShowCinema');
    const showPrice = document.getElementById('shareShowPrice');
    if (!showCinema || !showPrice) return;

    showCinema.addEventListener('change', () => {
        shareConfig.showCinemaInfo = showCinema.checked;
        rerenderSharePreview();
    });
    showPrice.addEventListener('change', () => {
        shareConfig.showPriceInfo = showPrice.checked;
        rerenderSharePreview();
    });
}

function rerenderSharePreview() {
    render(shareConfig.userName);
}

export function closeShareModal() {
    document.getElementById('shareModal').classList.remove('show');
}
