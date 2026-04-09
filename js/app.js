import { state, persistState, restoreState, clearPersistedState } from './state.js';
import { parseCSV, parseXLSX } from './parser.js';
import { initializeFilters, initializeCustomSelects, syncCustomSelect, toggleDateDropdown, filterDateOptions, toggleAllDates, selectWeekend, selectWeekdays, updateDateSelection, applyDateFilter, clearAndApplyDateFilter, clearDateFilter, applyFilters, resetFilters } from './filters.js';
import { displayMovies } from './display.js';
import { toggleSelection, updateSelectionPanel, clearSelection } from './selection.js';
import { generateCalendar, closeCalendar, exportCalendar } from './calendar.js';
import { exportSelection, closeExportModal, copyPlanText, copyToClipboard, downloadAsText, exportSelectionAsJSON, exportToICS, showPlanTransferHub, showImportOptions, importSelection, importSelectionFromJSON } from './export.js';
import { generateShareImage, closeShareModal } from './share.js';

// Expose functions for inline event handlers
window._app = {
    toggleDateDropdown, filterDateOptions, toggleAllDates, selectWeekend, selectWeekdays,
    updateDateSelection, applyDateFilter, clearAndApplyDateFilter, clearDateFilter, applyFilters, resetFilters,
    toggleSelection, clearSelection,
    generateCalendar, closeCalendar, exportCalendar,
    exportSelection, closeExportModal, copyPlanText, copyToClipboard, downloadAsText, exportSelectionAsJSON, exportToICS,
    showPlanTransferHub,
    showImportOptions, importSelection, importSelectionFromJSON,
    generateShareImage, closeShareModal,
    loadNewFile,
    refreshDashboard,
    setSortOrder,
    toggleMobileSelectionSheet,
    closeMobileSelectionSheet,
};

document.addEventListener('DOMContentLoaded', () => {
    setupThemeToggle();
    setupFileUpload();
    setupLiveFilters();
    setupResponsiveSelectionSheet();
    setupSelectionSheetEscape();
    setupSelectionSheetDrag();
    setupModalClose('calendarModal', closeCalendar);
    setupModalClose('exportModal', closeExportModal);
    setupModalClose('shareModal', closeShareModal);
    restorePersistedUI();
    refreshDashboard();
    closeMobileSelectionSheet();
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
    closeMobileSelectionSheet();
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('mainContent').classList.remove('show');
    document.getElementById('uploadSection').classList.remove('loaded');
    state.moviesData = [];
    state.filteredData = [];
    state.selectedMovies.clear();
    state.selectedDates.clear();
    state.dataSource = null;
    state.sourceFileName = '';
    state.sortOrder = 'date-asc';
    clearPersistedState();
    hideError();
    syncSortUI();
    refreshDashboard();
}

function setupModalClose(id, closeFn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => { if (e.target === el) closeFn(); });
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = `[ERROR] ${msg}`;
    el.classList.add('show');
    refreshDashboard();
}

function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
    refreshDashboard();
}

function restorePersistedUI() {
    if (!restoreState()) return;

    showLoadedState();
    initializeFilters();
    syncSortUI();
    syncSelectedDatesUI();
    updateSelectionPanel();
    applyFilters();
}

function showLoadedState() {
    document.getElementById('fileName').textContent = state.sourceFileName || '已恢复本地缓存';
    document.getElementById('fileInfo').classList.add('show');
    document.getElementById('uploadSection').classList.add('loaded');
    document.getElementById('mainContent').classList.add('show');
    refreshDashboard();
}

function syncSelectedDatesUI() {
    document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])').forEach((cb) => {
        cb.checked = state.selectedDates.has(cb.value);
    });
    updateDateSelection();
}

function setupLiveFilters() {
    const movieNameFilter = document.getElementById('movieNameFilter');
    const directorFilter = document.getElementById('directorFilter');
    const instantFilterIds = ['unitFilter', 'cinemaFilter', 'meetFilter', 'countryFilter'];
    const sortSelect = document.getElementById('sortOrder');

    if (movieNameFilter) {
        movieNameFilter.addEventListener('input', () => applyFilters());
    }

    if (directorFilter) {
        directorFilter.addEventListener('input', () => applyFilters());
    }

    instantFilterIds.forEach((id) => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('change', (event) => {
                syncCustomSelect(event.target);
                applyFilters();
            });
        }
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', (event) => setSortOrder(event.target.value));
    }

    initializeCustomSelects();
}

function syncSortUI() {
    const sortSelect = document.getElementById('sortOrder');
    if (sortSelect) {
        sortSelect.value = state.sortOrder || 'date-asc';
        syncCustomSelect(sortSelect);
    }
}

function setupThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('siff-theme');
    applyTheme(storedTheme || (prefersDark ? 'dark' : 'light'));

    toggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
    });
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const label = document.getElementById('themeToggleText');
    if (label) label.textContent = theme.toUpperCase();
    localStorage.setItem('siff-theme', theme);
}

function refreshDashboard() {
    const selectedCount = state.selectedMovies.size;
    setText('mobileSelectionCount', String(selectedCount));
}

function setSortOrder(value) {
    state.sortOrder = value || 'date-asc';
    syncCustomSelect('sortOrder');
    persistState();
    displayMovies();
}

function setupResponsiveSelectionSheet() {
    const media = window.matchMedia('(max-width: 820px)');
    const syncSelectionSheet = () => {
        if (!media.matches) closeMobileSelectionSheet();
        syncMobileSelectionState();
    };

    if (media.addEventListener) media.addEventListener('change', syncSelectionSheet);
    else if (media.addListener) media.addListener(syncSelectionSheet);

    syncMobileSelectionState();
}

function setupSelectionSheetEscape() {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMobileSelectionSheet();
    });
}

function setupSelectionSheetDrag() {
    const handle = document.querySelector('.mobile-sheet-handle');
    const sheet = document.getElementById('selectionSheet');
    if (!handle || !sheet) return;

    let startY = 0;
    let currentY = 0;
    let dragging = false;

    const isMobile = () => window.matchMedia('(max-width: 820px)').matches;

    const getClientY = (event) => {
        if (event.touches?.length) return event.touches[0].clientY;
        if (event.changedTouches?.length) return event.changedTouches[0].clientY;
        return event.clientY;
    };

    const resetSheet = () => {
        sheet.style.transform = '';
        sheet.style.transition = '';
    };

    const onMove = (event) => {
        if (!dragging) return;
        currentY = Math.max(0, getClientY(event) - startY);
        sheet.style.transform = `translateY(${currentY}px)`;
        if (event.cancelable) event.preventDefault();
    };

    const onEnd = () => {
        if (!dragging) return;
        dragging = false;
        if (currentY > 90) {
            resetSheet();
            closeMobileSelectionSheet();
            return;
        }
        sheet.style.transition = 'transform var(--transition)';
        sheet.style.transform = 'translateY(0)';
        window.setTimeout(resetSheet, 220);
    };

    const onStart = (event) => {
        if (!isMobile() || !document.body.classList.contains('mobile-selection-open')) return;
        dragging = true;
        startY = getClientY(event);
        currentY = 0;
        sheet.style.transition = 'none';
    };

    handle.addEventListener('pointerdown', onStart);
    handle.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
}

function toggleMobileSelectionSheet() {
    document.body.classList.toggle('mobile-selection-open');
    syncMobileSelectionState();
}

function closeMobileSelectionSheet() {
    document.body.classList.remove('mobile-selection-open');
    syncMobileSelectionState();
}

function syncMobileSelectionState() {
    const isMobile = window.matchMedia('(max-width: 820px)').matches;
    const toggle = document.getElementById('mobileSelectionToggle');
    const isOpen = isMobile && document.body.classList.contains('mobile-selection-open');
    const sheet = document.getElementById('selectionSheet');
    const backdrop = document.getElementById('mobileSelectionBackdrop');

    if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (sheet) sheet.setAttribute('aria-hidden', isMobile && !isOpen ? 'true' : 'false');
    if (backdrop) backdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCount(value, width) {
    return String(value).padStart(width, '0');
}
