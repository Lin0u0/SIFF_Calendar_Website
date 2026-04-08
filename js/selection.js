import { state } from './state.js';
import { parseDateTime, parseDuration } from './utils.js';
import { displayMovies } from './display.js';

export function toggleSelection(movieId) {
    const movie = state.moviesData.find(m => m.id === movieId);
    if (!movie) return;

    if (state.selectedMovies.has(movieId)) {
        state.selectedMovies.delete(movieId);
    } else {
        state.selectedMovies.set(movieId, movie);
    }

    updateSelectionPanel();
    displayMovies();
}

export function checkTimeConflict(movie) {
    if (state.selectedMovies.size <= 1) return false;

    const movieStart = parseDateTime(movie['日期'], movie['放映时间']);
    const movieEnd = new Date(movieStart.getTime() + parseDuration(movie['时长']));
    const buffer = 30 * 60 * 1000;

    for (const [id, sel] of state.selectedMovies) {
        if (id === movie.id) continue;
        if (movie['日期'] !== sel['日期']) continue;

        const selStart = parseDateTime(sel['日期'], sel['放映时间']);
        const selEnd = new Date(selStart.getTime() + parseDuration(sel['时长']));

        if (!(movieEnd.getTime() + buffer <= selStart.getTime() ||
              selEnd.getTime() + buffer <= movieStart.getTime())) {
            return true;
        }
    }
    return false;
}

export function getConflictingMovies(movie) {
    const conflicts = [];
    const movieStart = parseDateTime(movie['日期'], movie['放映时间']);
    const movieEnd = new Date(movieStart.getTime() + parseDuration(movie['时长']));
    const buffer = 30 * 60 * 1000;

    for (const [id, sel] of state.selectedMovies) {
        if (id === movie.id) continue;
        if (movie['日期'] !== sel['日期']) continue;

        const selStart = parseDateTime(sel['日期'], sel['放映时间']);
        const selEnd = new Date(selStart.getTime() + parseDuration(sel['时长']));

        if (!(movieEnd.getTime() + buffer <= selStart.getTime() ||
              selEnd.getTime() + buffer <= movieStart.getTime())) {
            conflicts.push(sel['中文片名']);
        }
    }
    return conflicts;
}

export function updateSelectionPanel() {
    const container = document.getElementById('selectedMovies');
    const count = document.getElementById('selectionCount');
    count.textContent = state.selectedMovies.size;

    if (state.selectedMovies.size === 0) {
        container.innerHTML = '<div class="empty-state">暂未选择任何电影</div>';
        return;
    }

    const sorted = Array.from(state.selectedMovies.values()).sort((a, b) => {
        return parseDateTime(a['日期'], a['放映时间']) - parseDateTime(b['日期'], b['放映时间']);
    });

    container.innerHTML = sorted.map(movie => {
        const hasConflict = checkTimeConflict(movie);
        const conflictMovies = hasConflict ? getConflictingMovies(movie) : [];
        return `
            <div class="sel-item ${hasConflict ? 'conflict' : ''}">
                <button class="sel-remove" onclick="window._app.toggleSelection('${movie.id}')">&times;</button>
                <div class="sel-title">${movie['中文片名']}</div>
                <div class="sel-meta">${movie['日期']} ${movie['放映时间']} &middot; ${movie['影院']}</div>
                ${hasConflict ? `<div class="sel-conflict">与 ${conflictMovies.join('、')} 时间冲突</div>` : ''}
            </div>
        `;
    }).join('');
}

export function clearSelection() {
    if (state.selectedMovies.size === 0) return;
    if (!confirm('确定要清空所有选择吗？')) return;
    state.selectedMovies.clear();
    updateSelectionPanel();
    displayMovies();
}
