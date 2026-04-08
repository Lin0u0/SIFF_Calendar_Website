import { state, persistState, restoreState, clearPersistedState } from './state.js';
import { parseCSV, parseXLSX } from './parser.js';
import { initializeFilters, toggleDateDropdown, filterDateOptions, toggleAllDates, selectWeekend, selectWeekdays, updateDateSelection, applyDateFilter, clearDateFilter, applyFilters, resetFilters } from './filters.js';
import { displayMovies } from './display.js';
import { toggleSelection, updateSelectionPanel, clearSelection } from './selection.js';
import { generateCalendar, closeCalendar, exportCalendar } from './calendar.js';
import { exportSelection, closeExportModal, copyToClipboard, downloadAsText, exportSelectionAsJSON, exportToICS, showImportOptions, importSelection, importSelectionFromJSON } from './export.js';
import { generateShareImage, closeShareModal } from './share.js';

// Expose functions for inline event handlers
window._app = {
    toggleDateDropdown, filterDateOptions, toggleAllDates, selectWeekend, selectWeekdays,
    updateDateSelection, applyDateFilter, clearDateFilter, applyFilters, resetFilters,
    toggleSelection, clearSelection,
    generateCalendar, closeCalendar, exportCalendar,
    exportSelection, closeExportModal, copyToClipboard, downloadAsText, exportSelectionAsJSON, exportToICS,
    showImportOptions, importSelection, importSelectionFromJSON,
    generateShareImage, closeShareModal,
    loadNewFile,
};

document.addEventListener('DOMContentLoaded', () => {
    setupFileUpload();
    setupModalClose('calendarModal', closeCalendar);
    setupModalClose('exportModal', closeExportModal);
    setupModalClose('shareModal', closeShareModal);
    restorePersistedUI();
});

function setupFileUpload() {
    const area = document.getElementById('uploadArea');
    const input = document.getElementById('fileInput');

    area.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (['csv', 'xlsx', 'xls'].includes(ext)) handleFile(file);
        else showError('请选择 CSV 或 XLSX 格式文件');
    });
}

function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
            try { parseCSV(e.target.result); onFileLoaded(file); }
            catch (err) { showError('CSV解析失败：' + err.message); }
        };
        reader.onerror = () => showError('文件读取失败');
        reader.readAsText(file, 'UTF-8');
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            try { parseXLSX(e.target.result); onFileLoaded(file); }
            catch (err) { showError('XLSX解析失败：' + err.message); }
        };
        reader.onerror = () => showError('文件读取失败');
        reader.readAsArrayBuffer(file);
    }
}

function onFileLoaded(file) {
    state.sourceFileName = file.name;
    showLoadedState();
    hideError();

    initializeFilters();
    state.filteredData = [...state.moviesData];
    syncSelectedDatesUI();
    updateSelectionPanel();
    displayMovies();
    persistState();
}

function loadNewFile() {
    if (state.selectedMovies.size > 0 && !confirm('重新加载将清空当前选择，是否继续？')) return;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('mainContent').classList.remove('show');
    state.moviesData = [];
    state.filteredData = [];
    state.selectedMovies.clear();
    state.selectedDates.clear();
    state.dataSource = null;
    state.sourceFileName = '';
    clearPersistedState();
}

function setupModalClose(id, closeFn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => { if (e.target === el) closeFn(); });
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = msg;
    el.classList.add('show');
}

function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
}

function restorePersistedUI() {
    if (!restoreState()) return;

    showLoadedState();
    initializeFilters();
    syncSelectedDatesUI();
    updateSelectionPanel();
    applyFilters();
}

function showLoadedState() {
    document.getElementById('fileName').textContent = state.sourceFileName || '已恢复本地缓存';
    document.getElementById('fileInfo').classList.add('show');
    document.getElementById('mainContent').classList.add('show');
}

function syncSelectedDatesUI() {
    document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])').forEach((cb) => {
        cb.checked = state.selectedDates.has(cb.value);
    });
    updateDateSelection();
}
