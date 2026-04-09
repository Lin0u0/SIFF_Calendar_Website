import { state } from './state.js';
import { parseDateTime, parseDuration, calculateEndTime, drawRoundRect, getMovieDate, getMovieTime } from './utils.js';

const shareConfig = {
    userName: '影迷',
    showCinemaInfo: true,
    showPriceInfo: true,
};

const shareTheme = {
    bg: '#f5f5f5',
    surface: '#ffffff',
    surfaceRaised: '#f0f0f0',
    ink: '#000000',
    text: '#1a1a1a',
    secondary: '#666666',
    muted: '#999999',
    border: '#e8e8e8',
    borderStrong: '#cccccc',
    accent: '#d71921',
    warning: '#d4a843',
};

function groupMoviesByDate() {
    const byDate = new Map();
    for (const movie of state.selectedMovies.values()) {
        const date = getMovieDate(movie);
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date).push(movie);
    }

    const sorted = new Map();
    Array.from(byDate.keys())
        .sort((leftDate, rightDate) => parseDateTime(leftDate, '00:00') - parseDateTime(rightDate, '00:00'))
        .forEach((date) => {
            const movies = byDate.get(date).sort((leftMovie, rightMovie) =>
                getMovieTime(leftMovie).localeCompare(getMovieTime(rightMovie))
            );
            sorted.set(date, movies);
        });

    return sorted;
}

export function generateShareImage() {
    if (state.selectedMovies.size === 0) {
        alert('请先选择电影');
        return;
    }

    const userName = prompt('请输入您的昵称：', shareConfig.userName || '影迷');
    if (userName === null) return;

    shareConfig.userName = userName.trim() || '影迷';

    const modal = document.getElementById('shareModal');
    const body = document.querySelector('.share-modal-body');
    modal.classList.add('show');
    body.innerHTML = getShareControlsHTML();
    bindShareControls();
    renderSharePreview();
}

function renderSharePreview() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const width = 1080;
    const pagePadding = 56;
    const sectionGap = 26;
    const cardGap = 18;
    const headerHeight = 268;
    const footerHeight = 84;
    const dateHeaderHeight = 56;
    const moviesByDate = groupMoviesByDate();

    let height = pagePadding + headerHeight + sectionGap + footerHeight;
    for (const [, movies] of moviesByDate) {
        height += dateHeaderHeight + 18;
        movies.forEach((movie) => {
            height += getCardHeight(context, movie, width - pagePadding * 2) + cardGap;
        });
        height += sectionGap;
    }

    canvas.width = width;
    canvas.height = height;

    context.fillStyle = shareTheme.bg;
    context.fillRect(0, 0, width, height);
    drawDotGrid(context, width, height);

    const headerY = pagePadding;
    drawHeader(context, pagePadding, headerY, width - pagePadding * 2, headerHeight);

    let cursorY = headerY + headerHeight + sectionGap;
    for (const [date, movies] of moviesByDate) {
        drawDateHeader(context, pagePadding, cursorY, width - pagePadding * 2, dateHeaderHeight, date);
        cursorY += dateHeaderHeight + 18;

        movies.forEach((movie) => {
            const cardHeight = getCardHeight(context, movie, width - pagePadding * 2);
            drawMovieCard(context, pagePadding, cursorY, width - pagePadding * 2, cardHeight, movie);
            cursorY += cardHeight + cardGap;
        });

        cursorY += sectionGap;
    }

    drawFooter(context, pagePadding, height - footerHeight, width - pagePadding * 2, footerHeight);

    const container = document.querySelector('.share-modal-body .canvas-container');
    if (!container) return;

    container.innerHTML = '<canvas id="shareCanvas"></canvas>';
    const display = document.getElementById('shareCanvas');
    display.width = canvas.width;
    display.height = canvas.height;
    display.getContext('2d').drawImage(canvas, 0, 0);
}

function drawDotGrid(context, width, height) {
    context.save();
    context.fillStyle = '#dddddd';

    for (let x = 16; x < width; x += 16) {
        for (let y = 16; y < height; y += 16) {
            context.globalAlpha = (x + y) % 64 === 0 ? 0.32 : 0.14;
            context.beginPath();
            context.arc(x, y, 1, 0, Math.PI * 2);
            context.fill();
        }
    }

    context.restore();
}

function drawHeader(context, x, y, width, height) {
    drawRoundRect(context, x, y, width, height, 20);
    context.fillStyle = shareTheme.surface;
    context.fill();
    context.strokeStyle = shareTheme.borderStrong;
    context.lineWidth = 1;
    context.stroke();

    const titleWidth = width - 330;
    drawTinyLabel(context, x + 28, y + 28, '[ BIFF CALENDAR / NOTHING SHARE ]', shareTheme.secondary);
    drawSignal(context, x + width - 40, y + 36);

    context.fillStyle = shareTheme.ink;
    context.font = '700 92px "Doto", "Space Mono", monospace';
    context.textBaseline = 'top';
    context.fillText('BIFF', x + 24, y + 60);

    context.font = '500 44px "Space Grotesk", sans-serif';
    context.fillText('CALENDAR', x + 24, y + 150);

    context.fillStyle = shareTheme.text;
    context.font = '500 28px "Space Grotesk", sans-serif';
    context.fillText(`${shareConfig.userName} / 2026 WATCHLIST`, x + 28, y + 204);

    context.fillStyle = shareTheme.secondary;
    context.font = '400 18px "Space Grotesk", sans-serif';
    context.fillText(fitText(context, getDateRangeText(), titleWidth, '400 18px "Space Grotesk", sans-serif'), x + 28, y + 234);

    const statsX = x + width - 276;
    const statsY = y + 28;
    const statsWidth = 220;
    const statsHeight = 56;
    const stats = getStats();

    drawStatBox(context, statsX, statsY, statsWidth, statsHeight, 'FILMS', String(state.selectedMovies.size).padStart(2, '0'));
    drawStatBox(context, statsX, statsY + 68, statsWidth, statsHeight, 'TIME', stats.duration);
    drawStatBox(context, statsX, statsY + 136, statsWidth, statsHeight, 'COST', stats.price);
}

function drawStatBox(context, x, y, width, height, label, value) {
    drawRoundRect(context, x, y, width, height, 14);
    context.fillStyle = shareTheme.surfaceRaised;
    context.fill();
    context.strokeStyle = shareTheme.border;
    context.lineWidth = 1;
    context.stroke();

    drawTinyLabel(context, x + 16, y + 14, label, shareTheme.secondary);
    context.fillStyle = shareTheme.ink;
    context.font = '700 22px "Space Mono", monospace';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x + 16, y + 42);
}

function drawDateHeader(context, x, y, width, height, date) {
    drawRoundRect(context, x, y, width, height, 14);
    context.fillStyle = shareTheme.ink;
    context.fill();

    context.fillStyle = shareTheme.bg;
    context.font = '700 22px "Space Mono", monospace';
    context.textBaseline = 'middle';
    context.fillText(date, x + 20, y + height / 2);
}

function drawMovieCard(context, x, y, width, height, movie) {
    drawRoundRect(context, x, y, width, height, 18);
    context.fillStyle = shareTheme.surface;
    context.fill();
    context.strokeStyle = movie['见面会'] === '★' ? shareTheme.warning : shareTheme.borderStrong;
    context.lineWidth = 1;
    context.stroke();

    const timeBlockWidth = 178;
    const contentX = x + timeBlockWidth + 34;
    const contentWidth = width - timeBlockWidth - 58;
    const time = getMovieTime(movie) || '00:00';
    const duration = parseDuration(movie['时长']);
    const [startHour, startMinute] = time.split(':').map(Number);
    const endTime = calculateEndTime(startHour, startMinute, duration);

    drawRoundRect(context, x + 20, y + 20, timeBlockWidth - 12, height - 40, 14);
    context.fillStyle = shareTheme.ink;
    context.fill();

    drawTinyLabel(context, x + 40, y + 36, 'START', '#999999');
    context.fillStyle = shareTheme.bg;
    context.font = '700 34px "Space Mono", monospace';
    context.textBaseline = 'alphabetic';
    context.fillText(time, x + 40, y + 86);
    drawTinyLabel(context, x + 40, y + 110, 'END', '#999999');
    context.fillStyle = shareTheme.bg;
    context.font = '500 24px "Space Mono", monospace';
    context.fillText(endTime, x + 40, y + 146);

    const titleLines = wrapText(context, movie['中文片名'] || '', contentWidth, '700 34px "Space Grotesk", sans-serif', 2);
    context.fillStyle = shareTheme.ink;
    context.font = '700 34px "Space Grotesk", sans-serif';
    context.textBaseline = 'top';
    titleLines.forEach((line, index) => {
        context.fillText(line, contentX, y + 24 + index * 38);
    });

    const subtitle = movie['英文片名'] || '';
    if (subtitle) {
        drawTinyLabel(
            context,
            contentX,
            y + 24 + titleLines.length * 38 + 6,
            fitText(context, subtitle, contentWidth, '400 14px "Space Mono", monospace'),
            shareTheme.secondary
        );
    }

    const metaStartY = y + 24 + Math.max(84, titleLines.length * 38 + (subtitle ? 28 : 0));
    const metaRows = buildMetaRows(movie);
    metaRows.forEach((row, index) => {
        const rowY = metaStartY + index * 24;
        drawTinyLabel(context, contentX, rowY, row.label, shareTheme.secondary);
        context.fillStyle = row.color || shareTheme.text;
        context.font = row.font || '400 16px "Space Grotesk", sans-serif';
        context.textBaseline = 'top';
        context.fillText(fitText(context, row.value, contentWidth - 86, row.font || '400 16px "Space Grotesk", sans-serif'), contentX + 88, rowY - 2);
    });

    if (movie['见面会'] === '★') {
        const badgeWidth = 112;
        drawRoundRect(context, x + width - badgeWidth - 20, y + 20, badgeWidth, 34, 17);
        context.fillStyle = shareTheme.warning;
        context.fill();
        context.fillStyle = shareTheme.ink;
        context.font = '700 13px "Space Mono", monospace';
        context.textBaseline = 'middle';
        context.textAlign = 'center';
        context.fillText('SPECIAL TALK', x + width - badgeWidth / 2 - 20, y + 37);
        context.textAlign = 'left';
    }
}

function buildMetaRows(movie) {
    const rows = [
        {
            label: 'VENUE',
            value: [movie['影院'], shareConfig.showCinemaInfo ? movie['影厅'] : ''].filter(Boolean).join(' / '),
        },
        {
            label: 'INFO',
            value: buildInfoLine(movie),
            font: '400 15px "Space Mono", monospace',
            color: shareTheme.secondary,
        },
    ];

    if (movie['导演']) {
        rows.splice(1, 0, {
            label: 'DIRECTOR',
            value: movie['导演'],
        });
    }

    if (shareConfig.showCinemaInfo && movie['影院地址']) {
        rows.push({
            label: 'ADDR',
            value: movie['影院地址'],
            font: '400 14px "Space Grotesk", sans-serif',
            color: shareTheme.secondary,
        });
    }

    return rows;
}

function buildInfoLine(movie) {
    const parts = [];
    if (movie['时长']) parts.push(movie['时长']);
    if (movie['票价'] && shareConfig.showPriceInfo) parts.push(`${movie['票价']}元`);
    if (movie['单元']) parts.push(movie['单元']);
    return parts.join(' / ') || 'N/A';
}

function getCardHeight(context, movie, width) {
    const contentWidth = width - 178 - 58;
    const titleLines = wrapText(context, movie['中文片名'] || '', contentWidth, '700 34px "Space Grotesk", sans-serif', 2);
    const subtitleHeight = movie['英文片名'] ? 28 : 0;
    const baseMetaRows = 3 + (shareConfig.showCinemaInfo && movie['影院地址'] ? 1 : 0);
    const contentHeight = 24 + titleLines.length * 38 + subtitleHeight + 14 + baseMetaRows * 24 + 24;
    return Math.max(188, contentHeight);
}

function getDateRangeText() {
    const dates = Array.from(groupMoviesByDate().keys());
    if (dates.length === 0) return 'NO DATE';
    return dates.length === 1 ? dates[0] : `${dates[0]} - ${dates[dates.length - 1]}`;
}

function getStats() {
    let totalMinutes = 0;
    let totalPrice = 0;

    for (const movie of state.selectedMovies.values()) {
        totalMinutes += Math.round(parseDuration(movie['时长']) / 60000);
        const numericPrice = parsePrice(movie['票价']);
        if (numericPrice != null) totalPrice += numericPrice;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
        duration: hours > 0 ? `${hours}H ${String(minutes).padStart(2, '0')}M` : `${minutes}M`,
        price: shareConfig.showPriceInfo ? (totalPrice > 0 ? `${totalPrice} CNY` : 'TBD') : 'HIDDEN',
    };
}

function parsePrice(value) {
    if (value == null || value === '') return null;
    const match = String(value).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
}

function drawFooter(context, x, y, width, height) {
    context.strokeStyle = shareTheme.borderStrong;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y + 12);
    context.lineTo(x + width, y + 12);
    context.stroke();

    drawTinyLabel(context, x, y + 28, 'BIFF CALENDAR / GENERATED BY LIN0U0', shareTheme.secondary);
    context.fillStyle = shareTheme.secondary;
    context.font = '400 16px "Space Grotesk", sans-serif';
    context.textBaseline = 'top';
    context.fillText('Personal scheduling reference. Official program always prevails.', x, y + 48);
}

function drawTinyLabel(context, x, y, text, color) {
    context.fillStyle = color;
    context.font = '700 12px "Space Mono", monospace';
    context.textBaseline = 'top';
    context.fillText(text, x, y);
}

function drawSignal(context, x, y) {
    context.save();
    context.fillStyle = shareTheme.accent;
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function wrapText(context, text, maxWidth, font, maxLines) {
    if (!text) return [];

    context.save();
    context.font = font;

    const chars = Array.from(String(text));
    const lines = [];
    let current = '';
    let index = 0;

    while (index < chars.length && lines.length < maxLines) {
        const char = chars[index];
        const nextLine = current + char;
        if (context.measureText(nextLine).width <= maxWidth || current.length === 0) {
            current = nextLine;
            index += 1;
            continue;
        }

        lines.push(current);
        current = char;
        index += 1;
    }

    if (current && lines.length < maxLines) {
        const remainder = current + chars.slice(index).join('');
        lines.push(fitText(context, remainder, maxWidth, font));
    }

    context.restore();
    return lines.slice(0, maxLines);
}

function fitText(context, text, maxWidth, font) {
    context.save();
    context.font = font;

    if (context.measureText(text).width <= maxWidth) {
        context.restore();
        return text;
    }

    let result = String(text || '');
    while (result.length > 0 && context.measureText(`${result}...`).width > maxWidth) {
        result = result.slice(0, -1);
    }

    context.restore();
    return result ? `${result}...` : '...';
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
        renderSharePreview();
    });

    showPrice.addEventListener('change', () => {
        shareConfig.showPriceInfo = showPrice.checked;
        renderSharePreview();
    });
}

export function closeShareModal() {
    document.getElementById('shareModal').classList.remove('show');
}
