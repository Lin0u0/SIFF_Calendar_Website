import { state } from './state.js';
import { parseDateTime, parseDuration } from './utils.js';
import { checkTimeConflict } from './selection.js';

export function generateCalendar() {
    if (state.selectedMovies.size === 0) { alert('请先选择电影'); return; }

    const grid = document.getElementById('calendarGrid');
    const modal = document.getElementById('calendarModal');
    const moviesByDate = new Map();
    const allDates = new Set();
    let minTime = 24, maxTime = 0;

    for (const movie of state.selectedMovies.values()) {
        const date = movie['日期'];
        allDates.add(date);
        if (!moviesByDate.has(date)) moviesByDate.set(date, []);
        moviesByDate.get(date).push(movie);

        const [hours] = movie['放映时间'].split(':').map(Number);
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
                const [mH, mM] = movie['放映时间'].split(':').map(Number);
                const [sH] = slot.split(':').map(Number);
                const dur = parseDuration(movie['时长']);
                const durH = Math.ceil(dur / (60 * 60 * 1000));
                const endH = mH + Math.ceil((mM + dur / (60 * 1000)) / 60);

                if (mH <= sH && sH < endH && mH === sH) {
                    const conflict = checkTimeConflict(movie);
                    html += `<div class="calendar-movie ${conflict ? 'has-conflict' : ''}" style="height:${durH * 60}px;">
                        <div class="calendar-movie-time">${movie['放映时间']}</div>
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
        <title>观影日历</title><style>
        body{font-family:Arial,sans-serif;padding:20px;background:#f5f5f5}
        .calendar-table-container{overflow:auto}
        .calendar-table{border-collapse:collapse;background:#fff}
        .calendar-table th,.calendar-table td{border:1px solid #e0e0e0;padding:10px;text-align:center;vertical-align:top}
        .time-header,.time-cell{background:#f5f5f5;font-weight:bold}
        .date-header{background:#6366f1;color:#fff}
        .calendar-movie{background:#eef2ff;border:2px solid #6366f1;border-radius:8px;padding:10px;margin:5px}
        .calendar-movie.has-conflict{background:#fef2f2;border-color:#ef4444}
        .calendar-movie-time{color:#f59e0b;font-weight:bold}
        .calendar-movie-title{font-weight:bold;margin:5px 0}
        .calendar-movie-cinema{color:#666;font-size:.9em}
        .calendar-movie-meet{background:#ef4444;color:#fff;padding:2px 8px;border-radius:12px;font-size:.75em;display:inline-block;margin-top:5px}
        </style></head><body><h1>观影日历</h1>${content}</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '观影日历.html';
    a.click();
    URL.revokeObjectURL(a.href);
}
