let moviesData = [];
let filteredData = [];
let selectedMovies = new Map(); // 使用Map存储选中的电影，key为唯一标识
let selectedDates = new Set(); // 存储选中的日期

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
});

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
        if (files.length > 0 && files[0].type === 'text/csv') {
            handleFile(files[0]);
        } else {
            showError('请选择CSV格式文件');
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
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            parseCSV(csvText);
            
            // 显示文件信息
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileInfo').classList.add('show');
            document.getElementById('mainContent').classList.add('show');
            
            hideError();
        } catch (error) {
            showError('CSV文件解析失败：' + error.message);
        }
    };
    
    reader.onerror = function() {
        showError('文件读取失败');
    };
    
    reader.readAsText(file, 'UTF-8');
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
    const units = [...new Set(moviesData.map(m => m['单元']))].sort();
    const dates = [...new Set(moviesData.map(m => m['日期']))].sort();
    const cinemas = [...new Set(moviesData.map(m => m['影院']))].sort();
    const countries = [...new Set(moviesData.flatMap(m => m['制片国/地区'].split(',').map(c => c.trim())))].sort();
    
    // 填充选择框
    populateSelect('unitFilter', units);
    populateDateMultiSelect(dates); // 使用新的函数填充日期多选
    populateSelect('cinemaFilter', cinemas);
    populateSelect('countryFilter', countries);
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
            !movie['中文片名'].toLowerCase().includes(filters.movieName) && 
            !movie['英文片名'].toLowerCase().includes(filters.movieName)) return false;
        if (filters.director && !movie['导演'].toLowerCase().includes(filters.director)) return false;
        if (filters.country && !movie['制片国/地区'].includes(filters.country)) return false;
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
        
        return `
            <div class="movie-card ${isSelected ? 'selected' : ''} ${hasConflict && isSelected ? 'conflict' : ''}" data-movie-id="${movie.id}">
                <input type="checkbox" class="movie-checkbox" ${isSelected ? 'checked' : ''} 
                        onchange="toggleSelection('${movie.id}')" id="checkbox_${movie.id}">
                
                <div class="movie-header">
                    <div>
                        <div class="movie-title">${movie['中文片名']}</div>
                        <div class="movie-subtitle">${movie['英文片名']}</div>
                    </div>
                    <div class="movie-unit">${movie['单元']}</div>
                </div>
                
                <div class="movie-details">
                    <div class="detail-item">
                        <span class="detail-label">导演</span>
                        <span class="detail-value">${movie['导演']}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">制片国/地区</span>
                        <span class="detail-value">${movie['制片国/地区']}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">时长</span>
                        <span class="detail-value">${movie['时长']}</span>
                    </div>
                </div>
                
                <div class="screening-info">
                    <div class="screening-header">
                        <span class="date-badge">${movie['日期']}</span>
                        <span class="time-badge">${movie['放映时间']}</span>
                        ${movie['见面会'] === '★' ? '<span class="meet-badge">见面会</span>' : ''}
                        ${hasConflict && isSelected ? '<span class="conflict-badge">时间冲突</span>' : ''}
                    </div>
                    <div class="cinema-info">
                        <div class="cinema-name">${movie['影院']}</div>
                        <div class="cinema-hall">${movie['影厅']}</div>
                        <div class="cinema-address">${movie['影院地址']}</div>
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
    // 支持 "120分钟"、"2小时"、"1小时30分钟" 等格式
    let totalMinutes = 0;
    
    // 匹配小时
    const hourMatch = duration.match(/(\d+)\s*小时/);
    if (hourMatch) {
        totalMinutes += parseInt(hourMatch[1]) * 60;
    }
    
    // 匹配分钟
    const minuteMatch = duration.match(/(\d+)\s*分钟/);
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
        text += `   影院：${movie['影院']} - ${movie['影厅']}\n`;
        text += `   地址：${movie['影院地址']}\n`;
        text += `   导演：${movie['导演']}\n`;
        text += `   时长：${movie['时长']}\n`;
        if (movie['见面会'] === '★') {
            text += `   ★ 有见面会\n`;
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
        
        // 创建描述
        const description = [
            `英文片名：${movie['英文片名']}`,
            `导演：${movie['导演']}`,
            `制片国/地区：${movie['制片国/地区']}`,
            `时长：${movie['时长']}`,
            `单元：${movie['单元']}`,
            `影厅：${movie['影厅']}`,
            movie['见面会'] === '★' ? '★ 有见面会' : ''
        ].filter(line => line).join('\\n');
        
        // 创建事件
        const event = [
            '',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTART;TZID=Asia/Shanghai:${startStr}`,
            `DTEND;TZID=Asia/Shanghai:${endStr}`,
            `SUMMARY:${escapeICSText(movie['中文片名'])}`,
            `DESCRIPTION:${escapeICSText(description)}`,
            `LOCATION:${escapeICSText(movie['影院'] + ' - ' + movie['影院地址'])}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
        ].join('\r\n');
        
        icsContent += event;
    }
    
    // ICS 文件尾
    icsContent += '\r\nEND:VCALENDAR';
    
    return icsContent;
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

// 转义 ICS 文本中的特殊字符
function escapeICSText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
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
