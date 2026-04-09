import { state, persistState } from './state.js';
import { parseDateTime, getMovieDate } from './utils.js';
import { displayMovies } from './display.js';

const customSelectIds = ['sortOrder', 'unitFilter', 'cinemaFilter', 'meetFilter', 'countryFilter'];

export function initializeFilters() {
    const units = [...new Set(state.moviesData.map(m => m['单元']).filter(Boolean))].sort();
    const dates = [...new Set(state.moviesData.map(m => getMovieDate(m)).filter(Boolean))].sort((a, b) => {
        return parseDateTime(a, '00:00') - parseDateTime(b, '00:00');
    });
    const cinemas = [...new Set(state.moviesData.map(m => m['影院']).filter(Boolean))].sort();
    const countries = [...new Set(state.moviesData.flatMap(m => {
        const c = m['制片国/地区'];
        return c ? c.split(',').map(s => s.trim()).filter(Boolean) : [];
    }))].sort();

    populateSelect('unitFilter', units);
    populateDateMultiSelect(dates);
    populateSelect('cinemaFilter', cinemas);
    populateSelect('countryFilter', countries);

    // Hide inapplicable filters
    const hasDirector = state.moviesData.some(m => m['导演']);
    const hasCountry = countries.length > 0;
    const directorGroup = document.getElementById('directorFilter').closest('.filter-group');
    const countryGroup = document.getElementById('countryFilter').closest('.filter-group');
    const secondaryRow = document.querySelector('.filter-row-secondary');

    directorGroup.style.display = hasDirector ? '' : 'none';
    countryGroup.style.display = hasCountry ? '' : 'none';
    if (secondaryRow) secondaryRow.style.display = hasDirector || hasCountry ? '' : 'none';

    initializeCustomSelects();
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    select.innerHTML = select.innerHTML.split('</option>')[0] + '</option>';
    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        select.appendChild(el);
    });

    syncCustomSelect(select);
}

function populateDateMultiSelect(dates) {
    const dateOptions = document.getElementById('dateOptions');
    const allOption = dateOptions.querySelector('.multi-select-option');
    const optionsHTML = dates.map(date => `
        <label class="multi-select-option" data-value="${date}">
            <input type="checkbox" value="${date}" onchange="window._app.updateDateSelection()">
            <span class="multi-select-check" aria-hidden="true"></span>
            <span class="multi-select-label">${date}</span>
        </label>
    `).join('');
    dateOptions.innerHTML = allOption.outerHTML + optionsHTML;
}

export function toggleDateDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('dateDropdown');
    const trigger = document.querySelector('.multi-select-trigger');
    const shell = document.querySelector('.multi-select-container');

    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        trigger.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
        shell?.classList.remove('is-active');
        document.removeEventListener('click', closeDateDropdownOnClickOutside);
    } else {
        dropdown.classList.add('show');
        trigger.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
        shell?.classList.add('is-active');
        document.addEventListener('click', closeDateDropdownOnClickOutside);
    }
}

export function initializeCustomSelects() {
    customSelectIds.forEach((id) => {
        const select = document.getElementById(id);
        if (!select) return;
        buildCustomSelect(select);
        syncCustomSelect(select);
    });
}

export function syncCustomSelect(selectOrId) {
    const select = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
    if (!select) return;

    const shell = select.closest('.control-shell');
    if (!shell) return;

    const triggerLabel = shell.querySelector('.custom-select-value');
    const options = shell.querySelectorAll('.custom-select-option');
    const currentOption = Array.from(select.options).find((option) => option.value === select.value) || select.options[select.selectedIndex];

    if (triggerLabel) {
        triggerLabel.textContent = currentOption?.textContent || '';
    }

    options.forEach((optionButton) => {
        const isSelected = optionButton.dataset.value === select.value;
        optionButton.classList.toggle('selected', isSelected);
        optionButton.setAttribute('aria-selected', String(isSelected));
    });
}

function buildCustomSelect(select) {
    const shell = select.closest('.control-shell');
    if (!shell) return;

    shell.classList.add('custom-select-shell');
    select.classList.add('native-select-hidden');

    const existingTrigger = shell.querySelector('.custom-select-trigger');
    const existingDropdown = shell.querySelector('.custom-select-dropdown');
    if (existingTrigger) existingTrigger.remove();
    if (existingDropdown) existingDropdown.remove();

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `<span class="custom-select-value"></span>`;

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';
    dropdown.setAttribute('role', 'listbox');

    Array.from(select.options).forEach((option) => {
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.className = 'custom-select-option';
        optionButton.dataset.value = option.value;
        optionButton.setAttribute('role', 'option');
        optionButton.innerHTML = `
            <span class="custom-select-check" aria-hidden="true"></span>
            <span class="custom-select-label">${option.textContent}</span>
        `;
        optionButton.addEventListener('click', (event) => {
            event.stopPropagation();
            if (select.value !== option.value) {
                select.value = option.value;
                syncCustomSelect(select);
                select.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                syncCustomSelect(select);
            }
            closeCustomSelect(shell);
        });
        dropdown.appendChild(optionButton);
    });

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = shell.classList.contains('is-active');
        closeAllCustomSelects();
        if (!isOpen) openCustomSelect(shell);
    });

    shell.appendChild(trigger);
    shell.appendChild(dropdown);
}

function openCustomSelect(shell) {
    const trigger = shell.querySelector('.custom-select-trigger');
    shell.classList.add('is-active');
    shell.querySelector('.custom-select-dropdown')?.classList.add('show');
    trigger?.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', handleGlobalCustomSelectClose);
    document.addEventListener('keydown', handleCustomSelectEscape);
}

function closeCustomSelect(shell) {
    const trigger = shell.querySelector('.custom-select-trigger');
    shell.classList.remove('is-active');
    shell.querySelector('.custom-select-dropdown')?.classList.remove('show');
    trigger?.setAttribute('aria-expanded', 'false');

    if (!document.querySelector('.custom-select-shell.is-active')) {
        document.removeEventListener('click', handleGlobalCustomSelectClose);
        document.removeEventListener('keydown', handleCustomSelectEscape);
    }
}

function closeAllCustomSelects() {
    document.querySelectorAll('.custom-select-shell.is-active').forEach((shell) => closeCustomSelect(shell));
}

function handleGlobalCustomSelectClose(event) {
    if (!event.target.closest('.custom-select-shell')) {
        closeAllCustomSelects();
    }
}

function handleCustomSelectEscape(event) {
    if (event.key === 'Escape') closeAllCustomSelects();
}

function closeDateDropdownOnClickOutside(event) {
    const container = document.querySelector('.multi-select-container');
    if (!container.contains(event.target)) {
        document.getElementById('dateDropdown').classList.remove('show');
        const trigger = document.querySelector('.multi-select-trigger');
        trigger.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
        container.classList.remove('is-active');
        document.removeEventListener('click', closeDateDropdownOnClickOutside);
    }
}

export function filterDateOptions(searchTerm) {
    const options = document.querySelectorAll('#dateOptions .multi-select-option[data-value]');
    const term = searchTerm.toLowerCase();
    options.forEach(opt => {
        opt.classList.toggle('hidden', !opt.getAttribute('data-value').toLowerCase().includes(term));
    });
}

export function toggleAllDates(checkbox) {
    document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])')
        .forEach(cb => { cb.checked = checkbox.checked; });
    updateDateSelection();
}

export function selectWeekend() {
    document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])').forEach(cb => {
        const day = parseDateTime(cb.value, '00:00').getDay();
        cb.checked = (day === 0 || day === 6);
    });
    updateDateSelection();
}

export function selectWeekdays() {
    document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])').forEach(cb => {
        const day = parseDateTime(cb.value, '00:00').getDay();
        cb.checked = (day >= 1 && day <= 5);
    });
    updateDateSelection();
}

export function updateDateSelection() {
    const checked = document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"]):checked');
    const allCb = document.querySelector('#dateOptions input[value="all"]');
    const total = document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])');

    state.selectedDates.clear();
    checked.forEach(cb => state.selectedDates.add(cb.value));

    allCb.checked = checked.length === total.length;
    allCb.indeterminate = checked.length > 0 && checked.length < total.length;

    const text = document.getElementById('dateFilterText');
    if (state.selectedDates.size === 0) text.textContent = '全部日期';
    else if (state.selectedDates.size === 1) text.textContent = Array.from(state.selectedDates)[0];
    else text.textContent = `已选择 ${state.selectedDates.size} 个日期`;
    persistState();
}

export function applyDateFilter() {
    toggleDateDropdown();
    applyFilters();
}

export function clearAndApplyDateFilter() {
    clearDateFilter();
    toggleDateDropdown();
    applyFilters();
}

export function clearDateFilter() {
    state.selectedDates.clear();
    document.querySelectorAll('#dateOptions input[type="checkbox"]').forEach(cb => cb.checked = false);
    const text = document.getElementById('dateFilterText');
    text.textContent = '全部日期';
    persistState();
}

export function applyFilters() {
    const filters = {
        unit: document.getElementById('unitFilter').value,
        dates: state.selectedDates,
        cinema: document.getElementById('cinemaFilter').value,
        movieName: document.getElementById('movieNameFilter').value.toLowerCase(),
        director: document.getElementById('directorFilter').value.toLowerCase(),
        country: document.getElementById('countryFilter').value,
        meet: document.getElementById('meetFilter').value,
    };

    state.filteredData = state.moviesData.filter(movie => {
        if (filters.unit && movie['单元'] !== filters.unit) return false;
        if (filters.dates.size > 0 && !filters.dates.has(getMovieDate(movie))) return false;
        if (filters.cinema && movie['影院'] !== filters.cinema) return false;
        if (filters.movieName &&
            !(movie['中文片名'] || '').toLowerCase().includes(filters.movieName) &&
            !(movie['英文片名'] || '').toLowerCase().includes(filters.movieName)) return false;
        if (filters.director && !(movie['导演'] || '').toLowerCase().includes(filters.director)) return false;
        if (filters.country && !(movie['制片国/地区'] || '').includes(filters.country)) return false;
        if (filters.meet === 'yes' && movie['见面会'] !== '★') return false;
        if (filters.meet === 'no' && movie['见面会'] === '★') return false;
        return true;
    });

    displayMovies();
}

export function resetFilters() {
    document.getElementById('unitFilter').value = '';
    clearDateFilter();
    document.getElementById('cinemaFilter').value = '';
    document.getElementById('movieNameFilter').value = '';
    document.getElementById('directorFilter').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('meetFilter').value = '';
    document.getElementById('sortOrder').value = 'date-asc';
    state.sortOrder = 'date-asc';
    ['unitFilter', 'cinemaFilter', 'meetFilter', 'countryFilter', 'sortOrder'].forEach((id) => syncCustomSelect(id));
    persistState();

    state.filteredData = [...state.moviesData];
    displayMovies();
}
