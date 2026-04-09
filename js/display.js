import { state } from './state.js';
import { checkTimeConflict } from './selection.js';
import { getMovieDate, getMovieTime, parseDateTime, parseDuration } from './utils.js';

export function displayMovies() {
    const grid = document.getElementById('movieGrid');
    const countEl = document.getElementById('resultCount');
    const movies = sortMovies(state.filteredData);
    countEl.textContent = movies.length;

    if (movies.length === 0) {
        grid.innerHTML = '<div class="empty-state">没有找到符合条件的放映场次</div>';
        window._app?.refreshDashboard?.();
        return;
    }

    grid.innerHTML = movies.map(movie => {
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
        const unitBadge = movie['单元']
            ? `<span class="badge badge-unit">${movie['单元']}</span>`
            : '';

        return `
            <div class="card ${isSelected ? 'selected' : ''} ${hasConflict && isSelected ? 'conflict' : ''}"
                 data-movie-id="${movie.id}" onclick="window._app.toggleSelection('${movie.id}')">
                <div class="card-top">
                    <div class="card-titles">
                        <h3 class="card-title">${movie['中文片名']}</h3>
                        ${movie['英文片名'] ? `<p class="card-subtitle">${movie['英文片名']}</p>` : ''}
                    </div>
                </div>

                    ${details.length ? `
                <div class="card-details">
                    ${details.map(([label, val]) => `<span class="detail"><em>${label}</em>${val}</span>`).join('')}
                </div>` : ''}

                <div class="card-screening">
                    <div class="card-badges">
                        ${unitBadge}
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

    window._app?.refreshDashboard?.();
}

function sortMovies(movies) {
    const sorted = [...movies];

    sorted.sort((leftMovie, rightMovie) => {
        switch (state.sortOrder) {
        case 'date-desc':
            return compareDate(rightMovie, leftMovie);
        case 'title-asc':
            return compareText(leftMovie['中文片名'], rightMovie['中文片名']) ||
                compareDate(leftMovie, rightMovie);
        case 'cinema-asc':
            return compareText(leftMovie['影院'], rightMovie['影院']) ||
                compareDate(leftMovie, rightMovie);
        case 'duration-desc':
            return parseDuration(rightMovie['时长']) - parseDuration(leftMovie['时长']) ||
                compareDate(leftMovie, rightMovie);
        case 'date-asc':
        default:
            return compareDate(leftMovie, rightMovie);
        }
    });

    return sorted;
}

function compareDate(leftMovie, rightMovie) {
    return parseDateTime(getMovieDate(leftMovie), getMovieTime(leftMovie)) -
        parseDateTime(getMovieDate(rightMovie), getMovieTime(rightMovie));
}

function compareText(leftText, rightText) {
    return String(leftText || '').localeCompare(String(rightText || ''), 'zh-Hans-CN');
}
