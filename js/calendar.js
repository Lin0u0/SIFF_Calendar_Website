import { state } from './state.js';
import { parseDateTime, parseDuration, getMovieDate, getMovieTime } from './utils.js';
import { checkTimeConflict } from './selection.js';

export function generateCalendar() {
    if (state.selectedMovies.size === 0) { alert('请先选择电影'); return; }

    const grid = document.getElementById('calendarGrid');
    const modal = document.getElementById('calendarModal');
    const moviesByDate = new Map();
    const allDates = new Set();
    let minTime = 24, maxTime = 0;

    for (const movie of state.selectedMovies.values()) {
        const date = getMovieDate(movie);
        const time = getMovieTime(movie);
        allDates.add(date);
        if (!moviesByDate.has(date)) moviesByDate.set(date, []);
        moviesByDate.get(date).push(movie);

        const [hours] = (time || '00:00').split(':').map(Number);
        minTime = Math.min(minTime, hours);
        const duration = parseDuration(movie['时长']);
        maxTime = Math.max(maxTime, hours + Math.ceil(duration / (60 * 60 * 1000)));
    }

    minTime = Math.floor(minTime);
    maxTime = Math.ceil(maxTime) + 1;

    const sortedDates = Array.from(allDates).sort((a, b) =>
        parseDateTime(a, '00:00') - parseDateTime(b, '00:00')
    );

    const timeSlots = [];
    for (let h = minTime; h <= maxTime; h++) timeSlots.push(`${String(h).padStart(2, '0')}:00`);

    let html = `<div class="calendar-table-container"><table class="calendar-table"><thead><tr>
        <th class="time-header">时间</th>
        ${sortedDates.map(d => `<th class="date-header">${d}</th>`).join('')}
    </tr></thead><tbody>`;

    timeSlots.forEach(slot => {
        html += `<tr><td class="time-cell">${slot}</td>`;
        sortedDates.forEach(date => {
            html += `<td class="calendar-cell" data-date="${date}" data-time="${slot}">`;
            const movies = moviesByDate.get(date) || [];
            movies.forEach(movie => {
                const movieTime = getMovieTime(movie) || '00:00';
                const [mH, mM] = movieTime.split(':').map(Number);
                const [sH] = slot.split(':').map(Number);
                const dur = parseDuration(movie['时长']);
                const durH = Math.ceil(dur / (60 * 60 * 1000));
                const endH = mH + Math.ceil((mM + dur / (60 * 1000)) / 60);

                if (mH <= sH && sH < endH && mH === sH) {
                    const conflict = checkTimeConflict(movie);
                    html += `<div class="calendar-movie ${conflict ? 'has-conflict' : ''}" style="height:${durH * 60}px;">
                        <div class="calendar-movie-time">${movieTime}</div>
                        <div class="calendar-movie-title">${movie['中文片名']}</div>
                        <div class="calendar-movie-cinema">${movie['影院']}</div>
                        ${movie['见面会'] === '★' ? '<div class="calendar-movie-meet">见面会</div>' : ''}
                    </div>`;
                }
            });
            html += '</td>';
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    grid.innerHTML = html;
    modal.classList.add('show');
}

export function closeCalendar() {
    document.getElementById('calendarModal').classList.remove('show');
}

export function exportCalendar() {
    const content = document.getElementById('calendarGrid').innerHTML;
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
        <title>观影日历</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Doto:wght@400..900&family=Space+Grotesk:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
        :root{--bg:#f5f5f5;--surface:#fff;--surface-raised:#f0f0f0;--border:#e8e8e8;--border-visible:#ccc;--text:#1a1a1a;--text-secondary:#666;--accent:#d71921;--warning:#d4a843}
        *{box-sizing:border-box}
        body{margin:0;padding:32px;background:var(--bg);color:var(--text);font-family:"Space Grotesk","DM Sans",system-ui,sans-serif}
        h1{margin:0 0 24px;font-size:48px;line-height:1;font-weight:500;letter-spacing:-.04em}
        h1 span{font-family:"Doto","Space Mono",monospace}
        .calendar-table-container{overflow:auto;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
        .calendar-table{width:100%;border-collapse:collapse;min-width:720px}
        .calendar-table th,.calendar-table td{border:1px solid var(--border);padding:12px;text-align:left;vertical-align:top}
        .time-header,.time-cell,.date-header{background:var(--surface-raised);color:var(--text-secondary);font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
        .time-header,.time-cell{min-width:92px}
        .calendar-cell{position:relative;height:72px}
        .calendar-movie{background:var(--surface);border:1px solid var(--border-visible);border-radius:12px;padding:10px}
        .calendar-movie.has-conflict{border-color:var(--accent)}
        .calendar-movie-time,.calendar-movie-cinema{font-family:"Space Mono",monospace;font-size:12px;color:var(--text-secondary)}
        .calendar-movie-title{margin:4px 0;font-size:14px;font-weight:500;color:#000}
        .calendar-movie-meet{display:inline-flex;align-items:center;min-height:24px;margin-top:6px;padding:0 8px;border:1px solid var(--warning);border-radius:999px;color:var(--warning);font-family:"Space Mono",monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
        </style></head><body><h1><span>BIFF</span> CALENDAR</h1>${content}</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '观影日历.html';
    a.click();
    URL.revokeObjectURL(a.href);
}
