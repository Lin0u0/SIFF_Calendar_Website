import { state } from './state.js';
import { checkTimeConflict } from './selection.js';
import { getMovieDate, getMovieTime } from './utils.js';

export function displayMovies() {
    const grid = document.getElementById('movieGrid');
    const countEl = document.getElementById('resultCount');
    countEl.textContent = state.filteredData.length;

    if (state.filteredData.length === 0) {
        grid.innerHTML = '<div class="empty-state">没有找到符合条件的放映场次</div>';
        return;
    }

    grid.innerHTML = state.filteredData.map(movie => {
        const isSelected = state.selectedMovies.has(movie.id);
        const hasConflict = checkTimeConflict(movie);
        const displayDate = getMovieDate(movie);
        const displayTime = getMovieTime(movie);

        const details = [];
        if (movie['导演']) details.push(['导演', movie['导演']]);
        if (movie['制片国/地区']) details.push(['国家/地区', movie['制片国/地区']]);
        if (movie['时长']) details.push(['时长', movie['时长']]);
        if (movie['票价']) details.push(['票价', movie['票价'] + '元']);
        if (movie['年份']) details.push(['年份', movie['年份']]);

        const meetBadge = movie['见面会'] === '★'
            ? `<span class="badge badge-meet">${movie['活动信息'] || '见面会'}</span>`
            : '';

        return `
            <div class="card ${isSelected ? 'selected' : ''} ${hasConflict && isSelected ? 'conflict' : ''}"
                 data-movie-id="${movie.id}" onclick="window._app.toggleSelection('${movie.id}')">
                <div class="card-top">
                    <div class="card-titles">
                        <h3 class="card-title">${movie['中文片名']}</h3>
                        ${movie['英文片名'] ? `<p class="card-subtitle">${movie['英文片名']}</p>` : ''}
                    </div>
                    <span class="badge badge-unit">${movie['单元']}</span>
                </div>

                    ${details.length ? `
                <div class="card-details">
                    ${details.map(([label, val]) => `<span class="detail"><em>${label}</em>${val}</span>`).join('')}
                </div>` : ''}

                <div class="card-screening">
                    <div class="card-badges">
                        <span class="badge badge-date">${displayDate}</span>
                        <span class="badge badge-time">${displayTime}</span>
                        ${meetBadge}
                        ${hasConflict && isSelected ? '<span class="badge badge-conflict">时间冲突</span>' : ''}
                    </div>
                    <div class="card-cinema">
                        <strong>${movie['影院']}</strong>
                        ${movie['影厅'] ? `<span>${movie['影厅']}</span>` : ''}
                        ${movie['影院地址'] ? `<small>${movie['影院地址']}</small>` : ''}
                    </div>
                </div>

                <div class="card-check ${isSelected ? 'checked' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            </div>
        `;
    }).join('');
}
