let moviesData = [];
let filteredData = [];
let selectedMovies = new Map(); // 使用Map存储选中的电影，key为唯一标识
let selectedDates = new Set(); // 存储选中的日期

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
});

// 当前数据源信息
let dataSource = null; // 'siff' | 'bjiff' | 'generic'

// 设置文件上传
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    // 点击上传
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件选择
    fileInput.addEventListener('change', handleFileSelect);

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const ext = files[0].name.split('.').pop().toLowerCase();
            if (['csv', 'xlsx', 'xls'].includes(ext)) {
                handleFile(files[0]);
            } else {
                showError('请选择 CSV 或 XLSX 格式文件');
            }
        }
    });
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// 处理文件
function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                parseCSV(e.target.result);
                onFileLoaded(file);
            } catch (error) {
                showError('CSV文件解析失败：' + error.message);
            }
        };
        reader.onerror = () => showError('文件读取失败');
        reader.readAsText(file, 'UTF-8');
    } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                parseXLSX(e.target.result);
                onFileLoaded(file);
            } catch (error) {
                showError('XLSX文件解析失败：' + error.message);
            }
        };
        reader.onerror = () => showError('文件读取失败');
        reader.readAsArrayBuffer(file);
    } else {
        showError('不支持的文件格式');
    }
}

function onFileLoaded(file) {
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileInfo').classList.add('show');
    document.getElementById('mainContent').classList.add('show');
    hideError();
}

// 解析 XLSX
function parseXLSX(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    // 取第一个 sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // 找到表头行（跳过标题/提示行）
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let headerRow = -1;
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
        const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
        const val = cellA ? String(cellA.v).trim() : '';
        if (val === '单元') {
            headerRow = r;
            break;
        }
    }
    if (headerRow === -1) {
        throw new Error('未找到表头行（需包含"单元"列）');
    }

    // 读取表头
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
        headers.push(cell ? String(cell.v).trim() : '');
    }

    // 读取数据行
    const rawRows = [];
    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const row = {};
        let hasData = false;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            if (cell != null) {
                row[headers[c]] = cell.v;
                hasData = true;
            } else {
                row[headers[c]] = '';
            }
        }
        if (hasData && row['单元']) {
            rawRows.push(row);
        }
    }

    // 检测数据源并标准化
    moviesData = normalizeData(rawRows, headers);

    initializeFilters();
    filteredData = [...moviesData];
    displayMovies();
}

// 标准化不同来源的数据到统一格式
function normalizeData(rows, headers) {
    // 检测是否为北影节格式（有"影片中文名"列）
    const isBJIFF = headers.includes('影片中文名');

    if (isBJIFF) {
        dataSource = 'bjiff';
        return rows.map((row, i) => {
            // 处理放映时间（datetime对象或字符串）
            let dateStr = '';
            let timeStr = '';
            const rawTime = row['放映时间'];

            if (rawTime instanceof Date) {
                const month = rawTime.getMonth() + 1;
                const day = rawTime.getDate();
                dateStr = `${month}月${day}日`;
                timeStr = `${String(rawTime.getHours()).padStart(2, '0')}:${String(rawTime.getMinutes()).padStart(2, '0')}`;
            } else if (typeof rawTime === 'string') {
                dateStr = rawTime;
                timeStr = '';
            }

            // 处理片长
            const durationRaw = row['片长(分钟)'] || row['片长（分钟）'] || '';
            const durationStr = typeof durationRaw === 'number' ? `${durationRaw}分钟` : String(durationRaw);

            // 处理活动信息 → 见面会
            const activity = String(row['活动信息'] || '').trim();
            const meetStr = activity ? '★' : '';

            return {
                id: `movie_${i}_${Date.now()}`,
                '单元': String(row['单元'] || '').trim(),
                '中文片名': String(row['影片中文名'] || '').trim(),
                '英文片名': String(row['影片英文名'] || '').trim(),
                '导演': '',
                '制片国/地区': '',
                '时长': durationStr,
                '日期': dateStr,
                '放映时间': timeStr,
                '影院': String(row['影院'] || '').trim(),
                '影厅': String(row['影厅'] || '').trim(),
                '影院地址': '',
                '见面会': meetStr,
                '票价': row['票价(元)'] || row['票价（元）'] || '',
                '年份': row['年份'] || '',
                '活动信息': activity,
            };
        });
    }

    // 默认：SIFF CSV 格式，已经是标准格式
    dataSource = 'siff';
    return rows.map((row, i) => {
        row.id = `movie_${i}_${Date.now()}`;
        return row;
    });
}

// 解析CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('CSV文件格式不正确');
    }
    
    // 解析表头
    const headers = parseCSVLine(lines[0]);
    
    // 解析数据
    moviesData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const movie = {};
            headers.forEach((header, index) => {
                movie[header.trim()] = values[index].trim();
            });
            // 添加唯一ID
            movie.id = `movie_${i}_${Date.now()}`;
            moviesData.push(movie);
        }
    }
    
    // 初始化筛选器
    initializeFilters();
    
    // 显示所有数据
    filteredData = [...moviesData];
    displayMovies();
}

// 解析CSV行（处理包含逗号的字段）
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// 初始化筛选器
function initializeFilters() {
    // 获取唯一值
    const units = [...new Set(moviesData.map(m => m['单元']).filter(Boolean))].sort();
    const dates = [...new Set(moviesData.map(m => m['日期']).filter(Boolean))].sort((a, b) => {
        const da = parseDateTime(a, '00:00');
        const db = parseDateTime(b, '00:00');
        return da - db;
    });
    const cinemas = [...new Set(moviesData.map(m => m['影院']).filter(Boolean))].sort();
    const countries = [...new Set(moviesData.flatMap(m => {
        const c = m['制片国/地区'];
        return c ? c.split(',').map(s => s.trim()).filter(Boolean) : [];
    }))].sort();

    // 填充选择框
    populateSelect('unitFilter', units);
    populateDateMultiSelect(dates);
    populateSelect('cinemaFilter', cinemas);
    populateSelect('countryFilter', countries);

    // 隐藏/显示不适用的筛选器
    const directorGroup = document.getElementById('directorFilter').closest('.filter-group');
    const countryGroup = document.getElementById('countryFilter').closest('.filter-group');
    const hasDirector = moviesData.some(m => m['导演']);
    const hasCountry = countries.length > 0;
    directorGroup.style.display = hasDirector ? '' : 'none';
    countryGroup.style.display = hasCountry ? '' : 'none';
}

// 填充选择框
function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    // 保留第一个"全部"选项
    select.innerHTML = select.innerHTML.split('</option>')[0] + '</option>';
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

// 填充日期多选下拉框
function populateDateMultiSelect(dates) {
    const dateOptions = document.getElementById('dateOptions');
    
    // 保留全选选项，添加日期选项
    const optionsHTML = dates.map(date => `
        <label class="multi-select-option" data-value="${date}">
            <input type="checkbox" value="${date}" onchange="updateDateSelection()">
            <span>${date}</span>
        </label>
    `).join('');
    
    // 在全选选项后添加日期选项
    dateOptions.innerHTML = dateOptions.querySelector('.multi-select-option').outerHTML + optionsHTML;
}

// 切换日期下拉框
function toggleDateDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    
    const dropdown = document.getElementById('dateDropdown');
    const trigger = document.querySelector('.multi-select-trigger');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        trigger.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        trigger.classList.add('active');
        
        // 关闭其他下拉框
        document.addEventListener('click', closeDateDropdownOnClickOutside);
    }
}

// 点击外部关闭下拉框
function closeDateDropdownOnClickOutside(event) {
    const container = document.querySelector('.multi-select-container');
    if (!container.contains(event.target)) {
        const dropdown = document.getElementById('dateDropdown');
        const trigger = document.querySelector('.multi-select-trigger');
        dropdown.classList.remove('show');
        trigger.classList.remove('active');
        document.removeEventListener('click', closeDateDropdownOnClickOutside);
    }
}

// 搜索日期选项
function filterDateOptions(searchTerm) {
    const options = document.querySelectorAll('#dateOptions .multi-select-option[data-value]');
    const term = searchTerm.toLowerCase();
    
    options.forEach(option => {
        const value = option.getAttribute('data-value').toLowerCase();
        if (value.includes(term)) {
            option.classList.remove('hidden');
        } else {
            option.classList.add('hidden');
        }
    });
}

// 全选/取消全选
function toggleAllDates(checkbox) {
    const allCheckboxes = document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])');
    
    allCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    
    updateDateSelection();
}

// 选择周末
function selectWeekend() {
    const checkboxes = document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])');
    
    checkboxes.forEach(cb => {
        const dateStr = cb.value;
        const date = parseDateTime(dateStr, '00:00');
        const dayOfWeek = date.getDay();
        
        // 0是周日，6是周六
        cb.checked = (dayOfWeek === 0 || dayOfWeek === 6);
    });
    
    updateDateSelection();
}

// 选择工作日
function selectWeekdays() {
    const checkboxes = document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])');
    
    checkboxes.forEach(cb => {
        const dateStr = cb.value;
        const date = parseDateTime(dateStr, '00:00');
        const dayOfWeek = date.getDay();
        
        // 1-5是周一到周五
        cb.checked = (dayOfWeek >= 1 && dayOfWeek <= 5);
    });
    
    updateDateSelection();
}

// 更新日期选择
function updateDateSelection() {
    const checkboxes = document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"]):checked');
    const allCheckbox = document.querySelector('#dateOptions input[value="all"]');
    const totalCheckboxes = document.querySelectorAll('#dateOptions input[type="checkbox"][value]:not([value="all"])');
    
    // 更新selectedDates
    selectedDates.clear();
    checkboxes.forEach(cb => {
        selectedDates.add(cb.value);
    });
    
    // 更新全选框状态
    if (checkboxes.length === totalCheckboxes.length) {
        allCheckbox.checked = true;
        allCheckbox.indeterminate = false;
    } else if (checkboxes.length > 0) {
        allCheckbox.checked = false;
        allCheckbox.indeterminate = true;
    } else {
        allCheckbox.checked = false;
        allCheckbox.indeterminate = false;
    }
    
    // 更新显示文本
    updateDateFilterText();
}

// 更新日期筛选器显示文本
function updateDateFilterText() {
    const dateFilterText = document.getElementById('dateFilterText');
    
    if (selectedDates.size === 0) {
        dateFilterText.textContent = '全部日期';
    } else if (selectedDates.size === 1) {
        dateFilterText.textContent = Array.from(selectedDates)[0];
    } else {
        dateFilterText.textContent = `已选择 ${selectedDates.size} 个日期`;
    }
}

// 应用日期筛选
function applyDateFilter() {
    toggleDateDropdown();
    applyFilters();
}

// 清空日期筛选
function clearDateFilter() {
    selectedDates.clear();
    const checkboxes = document.querySelectorAll('#dateOptions input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    updateDateFilterText();
}

// 应用筛选
function applyFilters() {
    const filters = {
        unit: document.getElementById('unitFilter').value,
        dates: selectedDates, // 使用选中的日期集合
        cinema: document.getElementById('cinemaFilter').value,
        movieName: document.getElementById('movieNameFilter').value.toLowerCase(),
        director: document.getElementById('directorFilter').value.toLowerCase(),
        country: document.getElementById('countryFilter').value,
        meet: document.getElementById('meetFilter').value
    };
    
    filteredData = moviesData.filter(movie => {
        if (filters.unit && movie['单元'] !== filters.unit) return false;

        // 日期多选筛选
        if (filters.dates.size > 0 && !filters.dates.has(movie['日期'])) return false;

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

// 重置筛选
function resetFilters() {
    document.getElementById('unitFilter').value = '';
    clearDateFilter(); // 清空日期多选
    document.getElementById('cinemaFilter').value = '';
    document.getElementById('movieNameFilter').value = '';
    document.getElementById('directorFilter').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('meetFilter').value = '';
    
    filteredData = [...moviesData];
    displayMovies();
}

// 显示电影
function displayMovies() {
    const movieGrid = document.getElementById('movieGrid');
    const resultCount = document.getElementById('resultCount');
    
    resultCount.textContent = filteredData.length;
    
    if (filteredData.length === 0) {
        movieGrid.innerHTML = '<div class="no-results">没有找到符合条件的放映场次</div>';
        return;
    }
    
    movieGrid.innerHTML = filteredData.map(movie => {
        const isSelected = selectedMovies.has(movie.id);
        const hasConflict = checkTimeConflict(movie);

        // 构建详情行（只显示有数据的字段）
        let detailsHTML = '';
        if (movie['导演']) {
            detailsHTML += `<div class="detail-item"><span class="detail-label">导演</span><span class="detail-value">${movie['导演']}</span></div>`;
        }
        if (movie['制片国/地区']) {
            detailsHTML += `<div class="detail-item"><span class="detail-label">制片国/地区</span><span class="detail-value">${movie['制片国/地区']}</span></div>`;
        }
        if (movie['时长']) {
            detailsHTML += `<div class="detail-item"><span class="detail-label">时长</span><span class="detail-value">${movie['时长']}</span></div>`;
        }
        if (movie['票价']) {
            detailsHTML += `<div class="detail-item"><span class="detail-label">票价</span><span class="detail-value">${movie['票价']}元</span></div>`;
        }
        if (movie['年份']) {
            detailsHTML += `<div class="detail-item"><span class="detail-label">年份</span><span class="detail-value">${movie['年份']}</span></div>`;
        }

        // 活动信息badge
        const meetBadge = movie['见面会'] === '★'
            ? `<span class="meet-badge">${movie['活动信息'] || '见面会'}</span>`
            : '';

        return `
            <div class="movie-card ${isSelected ? 'selected' : ''} ${hasConflict && isSelected ? 'conflict' : ''}" data-movie-id="${movie.id}">
                <input type="checkbox" class="movie-checkbox" ${isSelected ? 'checked' : ''}
                        onchange="toggleSelection('${movie.id}')" id="checkbox_${movie.id}">

                <div class="movie-header">
                    <div>
                        <div class="movie-title">${movie['中文片名']}</div>
                        <div class="movie-subtitle">${movie['英文片名'] || ''}</div>
                    </div>
                    <div class="movie-unit">${movie['单元']}</div>
                </div>

                <div class="movie-details">
                    ${detailsHTML}
                </div>

                <div class="screening-info">
                    <div class="screening-header">
                        <span class="date-badge">${movie['日期']}</span>
                        <span class="time-badge">${movie['放映时间']}</span>
                        ${meetBadge}
                        ${hasConflict && isSelected ? '<span class="conflict-badge">时间冲突</span>' : ''}
                    </div>
                    <div class="cinema-info">
                        <div class="cinema-name">${movie['影院']}</div>
                        <div class="cinema-hall">${movie['影厅'] || ''}</div>
                        ${movie['影院地址'] ? `<div class="cinema-address">${movie['影院地址']}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 切换选择状态
function toggleSelection(movieId) {
    const movie = moviesData.find(m => m.id === movieId);
    if (!movie) return;
    
    if (selectedMovies.has(movieId)) {
        selectedMovies.delete(movieId);
    } else {
        selectedMovies.set(movieId, movie);
    }
    
    updateSelectionPanel();
    displayMovies(); // 重新显示以更新冲突状态
}

// 检查时间冲突
function checkTimeConflict(movie) {
    if (selectedMovies.size <= 1) return false;
    
    const movieStart = parseDateTime(movie['日期'], movie['放映时间']);
    const movieDuration = parseDuration(movie['时长']);
    const movieEnd = new Date(movieStart.getTime() + movieDuration);
    
    for (const [id, selectedMovie] of selectedMovies) {
        if (id === movie.id) continue;
        
        const selectedStart = parseDateTime(selectedMovie['日期'], selectedMovie['放映时间']);
        const selectedDuration = parseDuration(selectedMovie['时长']);
        const selectedEnd = new Date(selectedStart.getTime() + selectedDuration);
        
        // 检查时间是否重叠（考虑30分钟的通勤时间）
        const buffer = 30 * 60 * 1000; // 30分钟缓冲时间
        
        // 如果是同一天的电影
        if (movie['日期'] === selectedMovie['日期']) {
            // 检查时间段是否重叠
            if (!(movieEnd.getTime() + buffer <= selectedStart.getTime() || 
                    selectedEnd.getTime() + buffer <= movieStart.getTime())) {
                return true;
            }
        }
    }
    
    return false;
}

// 解析日期时间
function parseDateTime(date, time) {
    // 假设日期格式为 "6月13日"，时间格式为 "13:00"
    const year = new Date().getFullYear();
    const monthMatch = date.match(/(\d+)月/);
    const dayMatch = date.match(/(\d+)日/);
    const [hours, minutes] = time.split(':').map(Number);
    
    if (monthMatch && dayMatch) {
        return new Date(year, parseInt(monthMatch[1]) - 1, parseInt(dayMatch[1]), hours, minutes);
    }
    
    return new Date();
}

// 解析时长
function parseDuration(duration) {
    // 纯数字（来自 XLSX 的分钟数）
    if (typeof duration === 'number') {
        return duration * 60 * 1000;
    }

    const str = String(duration);

    // 纯数字字符串
    if (/^\d+$/.test(str.trim())) {
        return parseInt(str.trim()) * 60 * 1000;
    }

    // 支持 "120分钟"、"2小时"、"1小时30分钟" 等格式
    let totalMinutes = 0;

    const hourMatch = str.match(/(\d+)\s*小时/);
    if (hourMatch) {
        totalMinutes += parseInt(hourMatch[1]) * 60;
    }

    const minuteMatch = str.match(/(\d+)\s*分钟/);
    if (minuteMatch) {
        totalMinutes += parseInt(minuteMatch[1]);
    }

    // 如果没有匹配到任何格式，默认120分钟
    if (totalMinutes === 0) {
        totalMinutes = 120;
    }

    return totalMinutes * 60 * 1000; // 返回毫秒
}

// 更新选择面板
function updateSelectionPanel() {
    const selectedMoviesDiv = document.getElementById('selectedMovies');
    const selectionCount = document.getElementById('selectionCount');
    
    selectionCount.textContent = selectedMovies.size;
    
    if (selectedMovies.size === 0) {
        selectedMoviesDiv.innerHTML = '<div class="no-selection">暂未选择任何电影</div>';
        return;
    }
    
    // 按时间排序
    const sortedMovies = Array.from(selectedMovies.values()).sort((a, b) => {
        const dateA = parseDateTime(a['日期'], a['放映时间']);
        const dateB = parseDateTime(b['日期'], b['放映时间']);
        return dateA - dateB;
    });
    
    selectedMoviesDiv.innerHTML = sortedMovies.map(movie => {
        const hasConflict = checkTimeConflict(movie);
        const conflictMovies = hasConflict ? getConflictingMovies(movie) : [];
        
        return `
            <div class="selected-movie-item ${hasConflict ? 'conflict' : ''}">
                <button class="remove-button" onclick="toggleSelection('${movie.id}')">×</button>
                <div class="selected-movie-title">${movie['中文片名']}</div>
                <div class="selected-movie-time">
                    ${movie['日期']} ${movie['放映时间']} | ${movie['影院']}
                </div>
                ${hasConflict ? `
                    <div class="conflict-info">
                        ⚠️ 与以下电影时间冲突：${conflictMovies.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// 获取冲突的电影名称
function getConflictingMovies(movie) {
    const conflicts = [];
    
    for (const [id, selectedMovie] of selectedMovies) {
        if (id === movie.id) continue;
        
        const movieStart = parseDateTime(movie['日期'], movie['放映时间']);
        const movieDuration = parseDuration(movie['时长']);
        const movieEnd = new Date(movieStart.getTime() + movieDuration);
        
        const selectedStart = parseDateTime(selectedMovie['日期'], selectedMovie['放映时间']);
        const selectedDuration = parseDuration(selectedMovie['时长']);
        const selectedEnd = new Date(selectedStart.getTime() + selectedDuration);
        
        const buffer = 30 * 60 * 1000;
        if (movie['日期'] === selectedMovie['日期'] &&
            !(movieEnd.getTime() + buffer <= selectedStart.getTime() || 
                selectedEnd.getTime() + buffer <= movieStart.getTime())) {
            conflicts.push(selectedMovie['中文片名']);
        }
    }
    
    return conflicts;
}

// 生成日历视图
function generateCalendar() {
    if (selectedMovies.size === 0) {
        alert('请先选择电影');
        return;
    }
    
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarModal = document.getElementById('calendarModal');
    
    // 按日期分组
    const moviesByDate = new Map();
    const allDates = new Set();
    let minTime = 24, maxTime = 0;
    
    // 收集数据并找出时间范围
    for (const movie of selectedMovies.values()) {
        const date = movie['日期'];
        allDates.add(date);
        
        if (!moviesByDate.has(date)) {
            moviesByDate.set(date, []);
        }
        moviesByDate.get(date).push(movie);
        
        // 计算时间范围
        const [hours] = movie['放映时间'].split(':').map(Number);
        minTime = Math.min(minTime, hours);
        
        // 计算结束时间
        const duration = parseDuration(movie['时长']);
        const endHours = hours + Math.ceil(duration / (60 * 60 * 1000));
        maxTime = Math.max(maxTime, endHours);
    }
    
    // 确保时间范围合理
    minTime = Math.floor(minTime);
    maxTime = Math.ceil(maxTime) + 1; // 多加1小时以确保显示完整
    
    // 按日期排序
    const sortedDates = Array.from(allDates).sort((a, b) => {
        const dateA = parseDateTime(a, '00:00');
        const dateB = parseDateTime(b, '00:00');
        return dateA - dateB;
    });
    
    // 生成时间刻度
    const timeSlots = [];
    for (let hour = minTime; hour <= maxTime; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    // 创建日历表格HTML
    let calendarHTML = `
        <div class="calendar-table-container">
            <table class="calendar-table">
                <thead>
                    <tr>
                        <th class="time-header">时间</th>
                        ${sortedDates.map(date => `<th class="date-header">${date}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // 为每个时间段创建一行
    timeSlots.forEach(timeSlot => {
        calendarHTML += `<tr><td class="time-cell">${timeSlot}</td>`;
        
        sortedDates.forEach(date => {
            calendarHTML += `<td class="calendar-cell" data-date="${date}" data-time="${timeSlot}">`;
            
            // 查找在这个时间段的电影
            const moviesOnDate = moviesByDate.get(date) || [];
            moviesOnDate.forEach(movie => {
                const movieStart = movie['放映时间'];
                const [movieHour, movieMinute] = movieStart.split(':').map(Number);
                const [slotHour] = timeSlot.split(':').map(Number);
                
                // 计算电影持续时间和跨度
                const duration = parseDuration(movie['时长']);
                const durationHours = Math.ceil(duration / (60 * 60 * 1000));
                const movieEndHour = movieHour + Math.ceil((movieMinute + duration / (60 * 1000)) / 60);
                
                // 检查电影是否在当前时间段
                if (movieHour <= slotHour && slotHour < movieEndHour) {
                    const isStart = movieHour === slotHour;
                    const hasConflict = checkTimeConflict(movie);
                    
                    if (isStart) {
                        calendarHTML += `
                            <div class="calendar-movie ${hasConflict ? 'has-conflict' : ''}" 
                                    data-duration="${durationHours}"
                                    style="height: ${durationHours * 60}px;">
                                <div class="calendar-movie-time">${movie['放映时间']}</div>
                                <div class="calendar-movie-title">${movie['中文片名']}</div>
                                <div class="calendar-movie-cinema">${movie['影院']}</div>
                                ${movie['见面会'] === '★' ? '<div class="calendar-movie-meet">见面会</div>' : ''}
                            </div>
                        `;
                    }
                }
            });
            
            calendarHTML += `</td>`;
        });
        
        calendarHTML += `</tr>`;
    });
    
    calendarHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    // 设置日历内容
    calendarGrid.innerHTML = calendarHTML;
    
    // 显示模态框
    calendarModal.classList.add('show');
}

// 关闭日历
function closeCalendar() {
    document.getElementById('calendarModal').classList.remove('show');
}

// 导出选择
function exportSelection() {
    if (selectedMovies.size === 0) {
        alert('请先选择电影');
        return;
    }
    
    // 按时间排序
    const sortedMovies = Array.from(selectedMovies.values()).sort((a, b) => {
        const dateA = parseDateTime(a['日期'], a['放映时间']);
        const dateB = parseDateTime(b['日期'], b['放映时间']);
        return dateA - dateB;
    });
    
    // 生成文本
    let text = '=== 我的SIFF观影计划 ===\n\n';
    text += `共选择 ${selectedMovies.size} 场电影\n\n`;
    
    let currentDate = '';
    sortedMovies.forEach((movie, index) => {
        if (movie['日期'] !== currentDate) {
            currentDate = movie['日期'];
            text += `\n【${currentDate}】\n`;
        }
        
        text += `\n${index + 1}. ${movie['中文片名']}\n`;
        text += `   时间：${movie['放映时间']}\n`;
        text += `   影院：${movie['影院']}${movie['影厅'] ? ' - ' + movie['影厅'] : ''}\n`;
        if (movie['影院地址']) text += `   地址：${movie['影院地址']}\n`;
        if (movie['导演']) text += `   导演：${movie['导演']}\n`;
        if (movie['时长']) text += `   时长：${movie['时长']}\n`;
        if (movie['票价']) text += `   票价：${movie['票价']}元\n`;
        if (movie['见面会'] === '★') {
            text += `   ★ ${movie['活动信息'] || '有见面会'}\n`;
        }
    });
    
    // 创建导出内容
    const exportContent = `
        <div class="export-content">
            <h3>导出预览</h3>
            <textarea class="export-textarea" readonly>${text}</textarea>
            <div class="export-actions">
                <h4>选择导出格式：</h4>
                <div class="button-group">
                    <button class="btn-primary" onclick="copyToClipboard()">复制到剪贴板</button>
                    <button class="btn-info" onclick="downloadAsText()">下载文本文件(.txt)</button>
                    <button class="btn-success" onclick="exportSelectionAsJSON()">下载JSON文件(.json)</button>
                    <button class="btn-warning" onclick="exportToICS()">下载日历文件(.ics)</button>
                </div>
            </div>
        </div>
    `;
    
    // 显示在导出模态框中
    const exportModalBody = document.getElementById('exportModalBody');
    exportModalBody.innerHTML = exportContent;
    document.getElementById('exportModal').classList.add('show');
    
    // 保存导出文本供后续使用
    window.exportedText = text;
}

// 关闭导出模态框
function closeExportModal() {
    document.getElementById('exportModal').classList.remove('show');
}

// 点击模态框外部关闭
document.getElementById('exportModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeExportModal();
    }
});


// 导出日历
function exportCalendar() {
    const calendarContent = document.getElementById('calendarGrid').innerHTML;
    const calendarHTML = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>我的SIFF观影日历</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                .calendar-table-container { overflow: auto; }
                .calendar-table { border-collapse: collapse; background: white; }
                .calendar-table th, .calendar-table td { border: 1px solid #e0e0e0; padding: 10px; text-align: center; vertical-align: top; }
                .time-header, .time-cell { background: #f5f5f5; font-weight: bold; }
                .date-header { background: #4CAF50; color: white; }
                .calendar-movie { background: #e8f5e9; border: 2px solid #4CAF50; border-radius: 8px; padding: 10px; margin: 5px; }
                .calendar-movie.has-conflict { background: #ffebee; border-color: #f44336; }
                .calendar-movie-time { color: #ff9800; font-weight: bold; }
                .calendar-movie-title { font-weight: bold; margin: 5px 0; }
                .calendar-movie-cinema { color: #666; font-size: 0.9em; }
                .calendar-movie-meet { background: #f44336; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; display: inline-block; margin-top: 5px; }
            </style>
        </head>
        <body>
            <h1>我的SIFF观影日历</h1>
            ${calendarContent}
        </body>
        </html>
    `;
    
    const blob = new Blob([calendarHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SIFF观影日历.html';
    a.click();
    URL.revokeObjectURL(url);
}

// 复制到剪贴板
function copyToClipboard() {
    const textarea = document.querySelector('.export-textarea');
    textarea.select();
    document.execCommand('copy');
    alert('已复制到剪贴板！');
}

// 下载为文本文件
function downloadAsText() {
    const blob = new Blob([window.exportedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SIFF观影计划.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// 清空选择
function clearSelection() {
    if (confirm('确定要清空所有选择吗？')) {
        selectedMovies.clear();
        updateSelectionPanel();
        displayMovies();
    }
}

// 重新加载文件
function loadNewFile() {
    if (selectedMovies.size > 0 && !confirm('重新加载文件将清空当前选择，是否继续？')) {
        return;
    }
    
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('mainContent').classList.remove('show');
    moviesData = [];
    filteredData = [];
    selectedMovies.clear();
    selectedDates.clear();
}

// 显示错误信息
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

// 隐藏错误信息
function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
}

// 点击模态框外部关闭
document.getElementById('calendarModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCalendar();
    }
});

// 生成 ICS 文件内容
// 生成 ICS 文件内容
function generateICSContent() {
    if (selectedMovies.size === 0) {
        return null;
    }
    
    // ICS 文件头
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SIFF//电影节排片系统//CN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:SIFF电影节观影计划',
        'X-WR-TIMEZONE:Asia/Shanghai',
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Shanghai',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:+0800',
        'TZOFFSETTO:+0800',
        'END:STANDARD',
        'END:VTIMEZONE'
    ].join('\r\n');
    
    // 添加每个电影事件
    for (const [id, movie] of selectedMovies) {
        // 解析开始时间
        const startDate = parseDateTime(movie['日期'], movie['放映时间']);
        
        // 计算结束时间
        const duration = parseDuration(movie['时长']);
        const endDate = new Date(startDate.getTime() + duration);
        
        // 格式化为 ICS 时间格式（本地时间）
        const startStr = formatDateToICS(startDate);
        const endStr = formatDateToICS(endDate);
        
        // 生成唯一ID
        const uid = `siff-${id}-${Date.now()}@siff.com`;
        
        // 创建描述 - 修复换行问题
        const descriptionLines = [
            movie['英文片名'] ? `英文片名：${movie['英文片名']}` : '',
            movie['导演'] ? `导演：${movie['导演']}` : '',
            movie['制片国/地区'] ? `制片国/地区：${movie['制片国/地区']}` : '',
            movie['时长'] ? `时长：${movie['时长']}` : '',
            `单元：${movie['单元']}`,
            movie['影厅'] ? `影厅：${movie['影厅']}` : '',
            movie['票价'] ? `票价：${movie['票价']}元` : '',
            movie['见面会'] === '★' ? `★ ${movie['活动信息'] || '有见面会'}` : ''
        ].filter(line => line);
        
        // 使用 HTML 格式的描述（大多数日历应用支持）
        const description = escapeICSText(descriptionLines.join(' | '));
        
        // 或者使用多行格式（需要正确的折行）
        const descriptionFormatted = formatICSDescription(descriptionLines);
        
        // 创建事件
        const event = [
            '',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTART;TZID=Asia/Shanghai:${startStr}`,
            `DTEND;TZID=Asia/Shanghai:${endStr}`,
            `SUMMARY:${escapeICSText(movie['中文片名'])}`,
            descriptionFormatted,
            `LOCATION:${escapeICSText(movie['影院'] + (movie['影院地址'] ? ' - ' + movie['影院地址'] : ''))}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
        ].join('\r\n');
        
        icsContent += event;
    }
    
    // ICS 文件尾
    icsContent += '\r\nEND:VCALENDAR';
    
    return icsContent;
}

// 格式化 ICS 描述字段（支持多行）
function formatICSDescription(lines) {
    // 方法1：使用单行格式，用分隔符
    const singleLine = lines.join(' | ');
    return `DESCRIPTION:${escapeICSText(singleLine)}`;
    
    // 方法2：使用 X-ALT-DESC 提供 HTML 格式（某些日历应用支持）
    // const htmlDesc = lines.join('<br>');
    // return `DESCRIPTION:${escapeICSText(lines.join(', '))}\r\nX-ALT-DESC;FMTTYPE=text/html:<html><body>${htmlDesc}</body></html>`;
}

// 修改转义函数，移除 \n 的处理
function escapeICSText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, ' '); // 将实际的换行替换为空格
}


// 格式化日期为 ICS 格式
function formatDateToICS(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = '00';
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

// 导出为 ICS 文件
function exportToICS() {
    const icsContent = generateICSContent();
    if (!icsContent) {
        alert('请先选择电影');
        return;
    }
    
    // 创建 Blob 并下载
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIFF观影计划_${formatDateForFilename(new Date())}.ics`;
    a.click();
    URL.revokeObjectURL(url);
}

// 格式化日期用于文件名
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 显示关于信息
function showAbout() {
    alert(`SIFF 电影节快速排片系统 v1.0
    
本系统旨在帮助影迷更方便地规划 SIFF 观影行程。
    
主要功能：
- CSV 数据导入与解析
- 多维度筛选（单元、日期、影院等）
- 智能时间冲突检测
- 日历视图生成
- 多格式导出（文本、网页、ICS）
    
开发时间：2025年6月
联系方式：lin0u0@outlook.com`);
}

// 显示使用帮助
function showHelp() {
    alert(`使用帮助：
    
1. 准备数据：从 GitHub 下载排片表并转换为 CSV 格式
2. 导入文件：点击上传区域或拖拽 CSV 文件
3. 筛选电影：使用筛选器缩小范围
4. 选择场次：勾选想看的电影（系统会自动检测时间冲突）
5. 查看日程：生成日历视图查看整体安排
6. 导出结果：可导出为文本、网页或日历文件
    
提示：
- 红色标记表示时间冲突
- 考虑了30分钟通勤时间
- 支持多日期筛选
- 可导入手机日历`);
}

// 导入选择
function importSelection() {
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const content = event.target.result;
                parseAndImportSelection(content);
            } catch (error) {
                alert('导入失败：' + error.message);
            }
        };
        reader.readAsText(file, 'UTF-8');
    };
    
    fileInput.click();
}

// 解析并导入选择
function parseAndImportSelection(content) {
    if (!moviesData || moviesData.length === 0) {
        alert('请先加载电影数据（CSV文件）');
        return;
    }
    
    // 清空当前选择
    selectedMovies.clear();
    
    // 解析导入的内容
    const lines = content.split('\n');
    let importedCount = 0;
    let notFoundMovies = [];
    
    // 定义用于匹配的正则表达式
    const patterns = {
        chineseTitle: /^\d+\.\s*(.+)$/,
        time: /时间：(\d+:\d+)/,
        date: /【(.+?)】/,
        cinema: /影院：(.+?)\s*-\s*(.+)/
    };
    
    let currentDate = '';
    let currentMovie = null;
    
    for (const line of lines) {
        // 匹配日期
        const dateMatch = line.match(patterns.date);
        if (dateMatch) {
            currentDate = dateMatch[1];
            continue;
        }
        
        // 匹配电影标题
        const titleMatch = line.match(patterns.chineseTitle);
        if (titleMatch) {
            // 如果之前有电影信息，先处理它
            if (currentMovie) {
                const found = findAndSelectMovie(currentMovie);
                if (found) {
                    importedCount++;
                } else {
                    notFoundMovies.push(currentMovie.title);
                }
            }
            
            // 开始新的电影
            currentMovie = {
                title: titleMatch[1].trim(),
                date: currentDate
            };
            continue;
        }
        
        // 匹配时间
        if (currentMovie) {
            const timeMatch = line.match(patterns.time);
            if (timeMatch) {
                currentMovie.time = timeMatch[1];
            }
            
            // 匹配影院
            const cinemaMatch = line.match(patterns.cinema);
            if (cinemaMatch) {
                currentMovie.cinema = cinemaMatch[1].trim();
            }
        }
    }
    
    // 处理最后一部电影
    if (currentMovie) {
        const found = findAndSelectMovie(currentMovie);
        if (found) {
            importedCount++;
        } else {
            notFoundMovies.push(currentMovie.title);
        }
    }
    
    // 更新UI
    updateSelectionPanel();
    displayMovies();
    
    // 显示导入结果
    let message = `成功导入 ${importedCount} 部电影`;
    if (notFoundMovies.length > 0) {
        message += `\n\n未找到以下电影：\n${notFoundMovies.join('\n')}`;
        message += '\n\n请确保已加载包含这些电影的CSV文件';
    }
    alert(message);
}

// 查找并选择电影
function findAndSelectMovie(movieInfo) {
    // 首先尝试精确匹配（片名+日期+时间）
    for (const movie of moviesData) {
        if (movie['中文片名'] === movieInfo.title &&
            movie['日期'] === movieInfo.date &&
            movie['放映时间'] === movieInfo.time) {
            selectedMovies.set(movie.id, movie);
            return true;
        }
    }
    
    // 如果精确匹配失败，尝试片名+日期匹配
    for (const movie of moviesData) {
        if (movie['中文片名'] === movieInfo.title &&
            movie['日期'] === movieInfo.date) {
            selectedMovies.set(movie.id, movie);
            return true;
        }
    }
    
    // 如果还是失败，尝试只匹配片名（可能日期格式不同）
    for (const movie of moviesData) {
        if (movie['中文片名'] === movieInfo.title) {
            selectedMovies.set(movie.id, movie);
            return true;
        }
    }
    
    return false;
}

// 导入 JSON 格式的选择（更精确的导入方式）
function exportSelectionAsJSON() {
    if (selectedMovies.size === 0) {
        alert('请先选择电影');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        movieCount: selectedMovies.size,
        movies: Array.from(selectedMovies.values()).map(movie => ({
            title: movie['中文片名'],
            englishTitle: movie['英文片名'],
            date: movie['日期'],
            time: movie['放映时间'],
            cinema: movie['影院'],
            hall: movie['影厅'],
            director: movie['导演'],
            duration: movie['时长'],
            unit: movie['单元']
        }))
    };
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIFF观影计划_${formatDateForFilename(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 导入 JSON 格式的选择
function importSelectionFromJSON() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                importFromJSON(data);
            } catch (error) {
                alert('导入失败：JSON 文件格式错误');
            }
        };
        reader.readAsText(file, 'UTF-8');
    };
    
    fileInput.click();
}

// 从 JSON 数据导入
function importFromJSON(data) {
    if (!moviesData || moviesData.length === 0) {
        alert('请先加载电影数据（CSV文件）');
        return;
    }
    
    selectedMovies.clear();
    let importedCount = 0;
    let notFoundMovies = [];
    
    for (const movieInfo of data.movies) {
        let found = false;
        
        // 尝试多个字段组合匹配
        for (const movie of moviesData) {
            if (movie['中文片名'] === movieInfo.title &&
                movie['日期'] === movieInfo.date &&
                movie['放映时间'] === movieInfo.time &&
                movie['影院'] === movieInfo.cinema) {
                selectedMovies.set(movie.id, movie);
                found = true;
                importedCount++;
                break;
            }
        }
        
        if (!found) {
            notFoundMovies.push(`${movieInfo.title} - ${movieInfo.date} ${movieInfo.time}`);
        }
    }
    
    updateSelectionPanel();
    displayMovies();
    
    let message = `成功导入 ${importedCount}/${data.movies.length} 部电影`;
    if (notFoundMovies.length > 0) {
        message += `\n\n未找到以下场次：\n${notFoundMovies.slice(0, 5).join('\n')}`;
        if (notFoundMovies.length > 5) {
            message += `\n... 还有 ${notFoundMovies.length - 5} 个`;
        }
    }
    alert(message);
}

// 显示导入选项
function showImportOptions() {
    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            <div class="import-modal-header">
                <h3>导入观影计划</h3>
                <button class="close-button" onclick="closeImportModal()">×</button>
            </div>
            <div class="import-modal-body">
                <p>请选择导入方式：</p>
                <div class="import-options">
                    <div class="import-option" onclick="importSelection(); closeImportModal();">
                        <div class="import-icon">📄</div>
                        <h4>导入文本文件</h4>
                        <p>导入之前导出的 .txt 文件</p>
                    </div>
                    <div class="import-option" onclick="importSelectionFromJSON(); closeImportModal();">
                        <div class="import-icon">📊</div>
                        <h4>导入 JSON 文件</h4>
                        <p>导入之前导出的 .json 文件（更精确）</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 关闭导入弹窗
function closeImportModal() {
    const modal = document.querySelector('.import-modal');
    if (modal) {
        modal.remove();
    }
}

// 复制到剪贴板
function copyToClipboard() {
    const textarea = document.querySelector('.export-modal.show .export-textarea');
    if (textarea) {
        textarea.select();
        document.execCommand('copy');
        
        // 显示复制成功提示
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✓ 已复制！';
        button.style.background = '#4CAF50';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }
}

// 生成分享图片入口函数
function generateShareImage() {
    if (selectedMovies.size === 0) {
        alert('请先选择电影');
        return;
    }
    
    // 询问用户昵称
    const userName = prompt('请输入您的昵称（用于显示在分享图片上）：', '影迷');
    if (userName === null) return;
    
    // 显示加载提示
    const modal = document.getElementById('shareModal');
    const modalBody = document.querySelector('.share-modal-body');
    modalBody.innerHTML = '<p style="padding: 40px; text-align: center;">正在生成图片，请稍候...</p>';
    modal.classList.add('show');
    
    // 加载 SIFF logo
    const siffLogo = new Image();
    siffLogo.onload = function() {
        generateModernShareImage(userName, siffLogo);
    };
    siffLogo.onerror = function() {
        console.warn('SIFF logo 加载失败，将不显示 logo');
        generateModernShareImage(userName, null);
    };
    siffLogo.src = 'siff-logo.jpg'; // 请确保文件路径正确
}

// 按日期分组电影数据
function groupMoviesByDate() {
    const moviesByDate = new Map();
    
    for (const movie of selectedMovies.values()) {
        const date = movie['日期'];
        if (!moviesByDate.has(date)) {
            moviesByDate.set(date, []);
        }
        moviesByDate.get(date).push(movie);
    }
    
    // 排序日期
    const sortedMap = new Map();
    const sortedDates = Array.from(moviesByDate.keys()).sort((a, b) => {
        const dateA = parseDateTime(a, '00:00');
        const dateB = parseDateTime(b, '00:00');
        return dateA - dateB;
    });
    
    sortedDates.forEach(date => {
        const movies = moviesByDate.get(date).sort((a, b) => 
            a['放映时间'].localeCompare(b['放映时间'])
        );
        sortedMap.set(date, movies);
    });
    
    return sortedMap;
}

// 生成现代风格的分享图片
function generateModernShareImage(userName, siffLogo) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置画布参数
    const width = 750;
    const padding = 40;
    const cardHeight = 140;
    const cardSpacing = 20;
    const headerHeight = 300;
    
    // 计算所需高度
    const moviesByDate = groupMoviesByDate();
    let totalHeight = headerHeight;
    
    for (const [date, movies] of moviesByDate) {
        totalHeight += 80; // 日期标题高度
        totalHeight += movies.length * (cardHeight + cardSpacing);
        totalHeight += 40; // 日期组间距
    }
    totalHeight += -50; // 底部边距
    
    // 设置画布尺寸
    canvas.width = width;
    canvas.height = totalHeight;
    
    // 启用字体平滑
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 绘制背景
    drawModernBackground(ctx, width, totalHeight);
    
    // 绘制头部
    drawModernHeader(ctx, width, userName, siffLogo);
    
    // 绘制电影卡片
    drawModernMovieCards(ctx, width, moviesByDate, headerHeight);
    
    // 添加装饰元素
    drawDecorativeElements(ctx, width, totalHeight);
    
    // 显示画布
    displayCanvas(canvas);
}

// 绘制现代背景
function drawModernBackground(ctx, width, height) {
    // 主背景 - 柔和的渐变
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#ff6b35');
    bgGradient.addColorStop(0.5, '#f7931e');
    bgGradient.addColorStop(1, '#ee4c2c');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // 添加噪点纹理
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < width; i += 2) {
        for (let j = 0; j < height; j += 2) {
            if (Math.random() > 0.5) {
                ctx.fillStyle = '#000';
                ctx.fillRect(i, j, 1, 1);
            }
        }
    }
    ctx.globalAlpha = 1;
    
    // 添加光影效果 - 模拟窗户投影
    ctx.globalAlpha = 0.1;
    const lightGradient = ctx.createLinearGradient(0, 0, width, height);
    lightGradient.addColorStop(0, 'transparent');
    lightGradient.addColorStop(0.5, '#fff');
    lightGradient.addColorStop(1, 'transparent');
    
    // 绘制斜向光束
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(width * 0.3 + i * 100, 0);
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = lightGradient;
        ctx.fillRect(-50, 0, 100, height * 1.5);
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

// 绘制现代头部
function drawModernHeader(ctx, width, userName, siffLogo) {
    // 顶部装饰线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(width - 40, 40);
    ctx.stroke();
    
    // 标题背景卡片
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    drawRoundRect(ctx, 40, 60, width - 80, 160, 20);
    ctx.fill();
    
    // 主标题
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    
    ctx.font = '700 48px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(userName, 60, 120);
    
    const userNameWidth = ctx.measureText(userName + ' ').width;
    ctx.font = '700 48px -apple-system, "Helvetica Neue", Arial, sans-serif';
    const festivalTitle = dataSource === 'bjiff' ? '的 BJIFF 2026' : '的 SIFF 2025';
    ctx.fillText(festivalTitle, 60 + userNameWidth, 120);
    ctx.restore();
    
    // 副标题信息
    ctx.font = '400 20px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const movieCount = selectedMovies.size;
    ctx.fillText(`与 ${movieCount} 场电影相遇`, 60, 160);
    
    // 日期范围
    const dates = Array.from(groupMoviesByDate().keys());
    if (dates.length > 0) {
        const dateRange = dates.length === 1 ? dates[0] : `${dates[0]} - ${dates[dates.length - 1]}`;
        ctx.fillText(dateRange, 60, 190);
    }
    
    // SIFF Logo 和装饰
    if (siffLogo) {
        const logoSize = 100;
        const logoX = width - logoSize - 60;
        const logoY = 90;

        ctx.drawImage(siffLogo, logoX, logoY, logoSize, logoSize);
    }
    
    // 电影元素装饰
    // drawFilmDecoration(ctx, width - 200, 200);
}

// 绘制电影装饰元素
function drawFilmDecoration(ctx, x, y) {
    // 电影胶片效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x, y, 120, 40);
    
    // 胶片孔
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 5 + i * 25, y + 5, 15, 10);
        ctx.fillRect(x + 5 + i * 25, y + 25, 15, 10);
    }
}

// 绘制现代电影卡片
function drawModernMovieCards(ctx, width, moviesByDate, startY) {
    let yOffset = startY;
    const padding = 40;
    const cardHeight = 140;
    const cardSpacing = 20;
    
    for (const [date, movies] of moviesByDate) {
        // 日期分组标题
        ctx.save();
        
        // 日期背景
        const dateWidth = 180;
        const dateHeight = 50;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundRect(ctx, padding, yOffset, dateWidth, dateHeight, 25);
        ctx.fill();
        
        // 日期文字
        ctx.font = '700 24px -apple-system, "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(date, padding + dateWidth/2, yOffset + dateHeight/2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        ctx.restore();
        
        yOffset += dateHeight + 30;
        
        // 绘制该日期的电影卡片
        movies.forEach((movie, index) => {
            drawMovieCard(ctx, movie, padding, yOffset, width - 2 * padding, cardHeight);
            yOffset += cardHeight + cardSpacing;
        });
        
        yOffset += 20; // 日期组间距
    }
}

// 绘制单个电影卡片
function drawMovieCard(ctx, movie, x, y, width, height) {
    // 卡片背景
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    drawRoundRect(ctx, x, y, width, height - 20, 20);
    ctx.fill();
    
    // 卡片边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 时间标签
    const timeTagWidth = 140;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    drawRoundRect(ctx, x + 20, y + 30, timeTagWidth, 60, 25);
    ctx.fill();
    
    // 时间文字
    ctx.font = '700 20px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(movie['放映时间'], x + 20 + timeTagWidth/2, y + 55);
    
    // 计算结束时间
    const duration = parseDuration(movie['时长']);
    const [startHour, startMin] = movie['放映时间'].split(':').map(Number);
    const endTime = calculateEndTime(startHour, startMin, duration);
    
    ctx.font = '400 18px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${endTime}`, x + 20 + timeTagWidth/2, y + 80);
    ctx.textAlign = 'left';
    
    // 电影标题
    ctx.font = '700 28px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    let movieTitle = movie['中文片名'];
    const maxTitleWidth = width - timeTagWidth - 80;
    if (ctx.measureText(movieTitle).width > maxTitleWidth) {
        while (ctx.measureText(movieTitle + '...').width > maxTitleWidth && movieTitle.length > 0) {
            movieTitle = movieTitle.substring(0, movieTitle.length - 1);
        }
        movieTitle += '...';
    }
    ctx.fillText(movieTitle, x + timeTagWidth + 40, y + 45);
    
    // 影院信息
    ctx.font = '400 18px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(`${movie['影院']} · ${movie['影厅']}`, x + timeTagWidth + 40, y + 75);
    
    // 额外信息（导演、时长、票价等）
    ctx.font = '400 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const extraParts = [movie['导演'], movie['时长'], movie['票价'] ? movie['票价'] + '元' : ''].filter(Boolean);
    const extraInfo = extraParts.join(' | ');
    ctx.fillText(extraInfo, x + timeTagWidth + 40, y + 100);
    
    // 特殊标记
    if (movie['见面会'] === '★') {
        const meetBadgeX = x + width - 100;
        const meetBadgeY = y + (height-20)/2 - 20;
        
        ctx.fillStyle = '#ffc107';
        drawRoundRect(ctx, meetBadgeX, meetBadgeY, 80, 40, 20);
        ctx.fill();
        
        ctx.font = '700 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText('见面会', meetBadgeX + 40, meetBadgeY + 25);
        ctx.textAlign = 'left';
    }
    
    ctx.restore();
}

// 绘制装饰元素
function drawDecorativeElements(ctx, width, height) {
    // 底部装饰
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, height - 60);
    ctx.lineTo(width - 40, height - 60);
    ctx.stroke();
    
    // 底部文字
    ctx.font = '400 16px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('Powered by lin0u0', width/2, height - 30);
    ctx.textAlign = 'left';
}

// 绘制圆角矩形的辅助函数
function drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// 计算结束时间
function calculateEndTime(startHour, startMin, durationMs) {
    const totalMinutes = startHour * 60 + startMin + Math.ceil(durationMs / (60 * 1000));
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMin = totalMinutes % 60;
    return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
}

// 显示画布
function displayCanvas(canvas) {
    const modalBody = document.querySelector('.share-modal-body');
    modalBody.innerHTML = `
        <div class="canvas-container">
            <canvas id="shareCanvas"></canvas>
        </div>
    `;
    
    // 将生成的画布复制到显示区域
    const displayCanvas = document.getElementById('shareCanvas');
    displayCanvas.width = canvas.width;
    displayCanvas.height = canvas.height;
    const displayCtx = displayCanvas.getContext('2d');
    displayCtx.drawImage(canvas, 0, 0);
}

// 关闭分享模态框
function closeShareModal() {
    const modal = document.getElementById('shareModal');
    modal.classList.remove('show');
}

// 格式化日期用于文件名
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}`;
}

// 点击模态框外部关闭
document.addEventListener('DOMContentLoaded', function() {
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
        shareModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeShareModal();
            }
        });
    }
});
