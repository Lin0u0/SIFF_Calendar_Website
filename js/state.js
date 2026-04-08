import { normalizeDateTimeParts } from './utils.js';

// Global application state
export const state = {
    moviesData: [],
    filteredData: [],
    selectedMovies: new Map(),
    selectedDates: new Set(),
    dataSource: null, // 'siff' | 'bjiff' | 'generic'
    sourceFileName: '',
};

const STORAGE_KEY = 'filmfest_app_state_v1';

export function persistState() {
    try {
        const payload = {
            moviesData: state.moviesData,
            selectedMovieIds: Array.from(state.selectedMovies.keys()),
            selectedDates: Array.from(state.selectedDates),
            dataSource: state.dataSource,
            sourceFileName: state.sourceFileName || '',
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('Failed to persist state:', error);
    }
}

export function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;

        const saved = JSON.parse(raw);
        state.moviesData = Array.isArray(saved.moviesData) ? saved.moviesData : [];
        state.filteredData = [...state.moviesData];
        state.selectedDates = new Set(
            (Array.isArray(saved.selectedDates) ? saved.selectedDates : [])
                .map((date) => normalizeDateTimeParts(date).date || String(date || '').trim())
                .filter(Boolean)
        );
        state.selectedMovies = new Map();
        state.dataSource = saved.dataSource || null;
        state.sourceFileName = saved.sourceFileName || '';

        const selectedIds = new Set(Array.isArray(saved.selectedMovieIds) ? saved.selectedMovieIds : []);
        state.moviesData.forEach((movie) => {
            if (selectedIds.has(movie.id)) state.selectedMovies.set(movie.id, movie);
        });

        return state.moviesData.length > 0;
    } catch (error) {
        console.warn('Failed to restore state:', error);
        clearPersistedState();
        return false;
    }
}

export function clearPersistedState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to clear persisted state:', error);
    }
}
