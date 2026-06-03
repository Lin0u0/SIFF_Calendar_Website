import assert from 'node:assert/strict';
import { parseCSV, parseXLSX } from '../js/parser.js';
import { state } from '../js/state.js';

const fixedNow = 1780000000000;
Date.now = () => fixedNow;

function resetState() {
    state.moviesData = [];
    state.filteredData = [];
    state.selectedMovies.clear();
    state.selectedDates.clear();
    state.dataSource = null;
    state.sourceFileName = '';
    state.sortOrder = 'date-asc';
}

function installFakeXLSX(rows) {
    const sheet = buildSheet(rows);
    globalThis.XLSX = {
        read() {
            return { SheetNames: ['Export'], Sheets: { Export: sheet } };
        },
        utils: {
            encode_cell: encodeCell,
            decode_range: decodeRange,
        },
    };
}

function buildSheet(rows) {
    const maxCols = Math.max(...rows.map(row => row.length));
    const sheet = { '!ref': `A1:${encodeCell({ r: rows.length - 1, c: maxCols - 1 })}` };

    rows.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value == null || value === '') return;
            const cell = { v: value };
            if (!(value instanceof Date)) cell.w = String(value);
            sheet[encodeCell({ r, c })] = cell;
        });
    });

    return sheet;
}

function encodeCell({ r, c }) {
    return `${encodeColumn(c)}${r + 1}`;
}

function encodeColumn(index) {
    let n = index + 1;
    let name = '';
    while (n > 0) {
        const rem = (n - 1) % 26;
        name = String.fromCharCode(65 + rem) + name;
        n = Math.floor((n - 1) / 26);
    }
    return name;
}

function decodeRange(ref) {
    const [start, end] = ref.split(':');
    return { s: decodeCell(start), e: decodeCell(end) };
}

function decodeCell(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    assert.ok(match, `Invalid cell ref: ${ref}`);

    const [, letters, row] = match;
    let col = 0;
    for (const letter of letters) {
        col = col * 26 + letter.charCodeAt(0) - 64;
    }

    return { r: Number(row) - 1, c: col - 1 };
}

resetState();
installFakeXLSX([
    ['第28届上海国际电影节排片表'],
    ['单元', '中文片名', '英文片名', '导演', '制片国/地区', '时长', '日期', '放映时间', '影院', '影厅', '影院地址', '见面会'],
    ['向大师致敬', '双重赔偿 (4K)', 'DOUBLE INDEMNITY (4K)', '比利·怀尔德', '美国', '108分钟', '6月13日', '18:30', '上海影城SHO', '1号厅杜比剧场', '长宁区新华路160号', ''],
    ['SIFF短片', '短片精选集3', 'SHORT FILM COLLECTION 3', '安德烈埃·泽莱诺娃', '美国,匈牙利', 98, '6月21日', '18:30', 'CGV影城', '6号厅', '松江区广富林路1788弄\n印象城4层', ''],
]);
parseXLSX(new ArrayBuffer(0));

assert.equal(state.dataSource, 'siff');
assert.equal(state.moviesData.length, 2);
assert.equal(state.moviesData[0]['中文片名'], '双重赔偿 (4K)');
assert.equal(state.moviesData[0]['日期'], '6月13日');
assert.equal(state.moviesData[0]['放映时间'], '18:30');
assert.equal(state.moviesData[1]['时长'], '98分钟');
assert.equal(state.moviesData[1]['影院地址'], '松江区广富林路1788弄 印象城4层');

resetState();
installFakeXLSX([
    ['排片表'],
    ['', '单元', '中文片名', '日期', '放映时间', '影院'],
    ['', '世界万象', '测试影片', '6月14日', '9:5', '测试影院'],
]);
parseXLSX(new ArrayBuffer(0));

assert.equal(state.moviesData.length, 1);
assert.equal(state.moviesData[0]['中文片名'], '测试影片');
assert.equal(state.moviesData[0]['放映时间'], '09:05');

resetState();
parseCSV('\uFEFF单元,中文片名,英文片名,导演,制片国/地区,时长,日期,放映时间,影院,影厅,影院地址,见面会\n世界万象,CSV影片,CSV TITLE,导演,中国,90分钟,6月12日,13:00,影院,1号厅,地址,\n');

assert.equal(state.moviesData.length, 1);
assert.equal(state.moviesData[0]['单元'], '世界万象');
assert.equal(state.moviesData[0]['中文片名'], 'CSV影片');
