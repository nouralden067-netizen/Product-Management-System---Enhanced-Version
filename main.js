const LS_KEY = 'pm_final_v1';
let data = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
let mode = 'create', editIndex = null;
const perPage = 100;
let currentPage = 1;
let undoStack = null;

const titleEl = document.getElementById('title');
const categoryEl = document.getElementById('category');
const countEl = document.getElementById('count');
const priceEl = document.getElementById('price');
const taxesEl = document.getElementById('taxes');
const adsEl = document.getElementById('ads');
const discountEl = document.getElementById('discount');
const calcTotalEl = document.getElementById('calcTotal');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEdit');
const productsTbody = document.querySelector('#productsTable tbody');
const statsEl = document.getElementById('stats');
const toastsEl = document.getElementById('toasts');
const searchInput = document.getElementById('searchInput');
const minPriceEl = document.getElementById('minPrice');
const maxPriceEl = document.getElementById('maxPrice');
const clearFiltersBtn = document.getElementById('clearFilters');
const paginationEl = document.getElementById('pagination');
const toggleThemeBtn = document.getElementById('toggleTheme');
const exportJsonBtn = document.getElementById('exportJson');
const exportCsvBtn = document.getElementById('exportCsv');
const exportXlsxBtn = document.getElementById('exportXlsx');
const clearAllBtn = document.getElementById('clearAll');
const sortByEl = document.getElementById('sortBy');

function toast(msg, ms = 3000) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    toastsEl.appendChild(el);
    setTimeout(() => el.remove(), ms);
}

function computeTotalObj(o) {
    return (Number(o.price || 0) + Number(o.taxes || 0) + Number(o.ads || 0) - Number(o.discount || 0));
}
function updateCalcPreview() {
    calcTotalEl.textContent = computeTotalObj({
        price: priceEl.value, taxes: taxesEl.value, ads: adsEl.value, discount: discountEl.value
    }).toFixed(2) + ' LE';
}

[priceEl, taxesEl, adsEl, discountEl].forEach(i => i.addEventListener('input', updateCalcPreview));
updateCalcPreview();

function loadTheme() {
    const t = localStorage.getItem('pm_theme') || 'dark';
    document.body.classList.toggle('light', t === 'light');
}
toggleThemeBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('pm_theme', isLight ? 'light' : 'dark');
});
loadTheme();

function saveData() {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    render();
}
function clearForm() {
    titleEl.value = '';
    categoryEl.value = '';
    countEl.value = 1;
    priceEl.value = '';
    taxesEl.value = '';
    adsEl.value = '';
    discountEl.value = '';
    updateCalcPreview();
}

document.getElementById('productForm').addEventListener('submit', e => {
    e.preventDefault();
    const prod = {
        title: titleEl.value.trim(),
        category: categoryEl.value.trim(),
        count: Number(countEl.value) || 1,
        price: Number(priceEl.value) || 0,
        taxes: Number(taxesEl.value) || 0,
        ads: Number(adsEl.value) || 0,
        discount: Number(discountEl.value) || 0,
        date: new Date().toLocaleString()
    };
    if (!prod.title) return toast('ادخل العنوان');
    if (!prod.category) return toast('ادخل الفئة');
    if (prod.price < 0) return toast('السعر لازم يكون غير سالب');
    if (prod.count < 1) return toast('العدد لازم >=1');

    prod.total = computeTotalObj(prod).toFixed(2) + ' LE';

    if (mode === 'create') {
        for (let i = 0; i < prod.count; i++) data.unshift({ ...prod, count: 1 });
        toast('تمت إضافة المنتج/المنتجات');
    } else if (mode === 'update') {
        if (editIndex === null) return;
        data[editIndex] = { ...prod, count: 1 };
        toast('تم التحديث');
        mode = 'create';
        editIndex = null;
        submitBtn.textContent = 'إنشاء';
        cancelEditBtn.style.display = 'none';
    }
    clearForm(); saveData(); currentPage = 1;
});

function setEdit(i) {
    const p = data[i]; if (!p) return;
    titleEl.value = p.title;
    categoryEl.value = p.category;
    countEl.value = 1;
    priceEl.value = p.price;
    taxesEl.value = p.taxes;
    adsEl.value = p.ads;
    discountEl.value = p.discount;

    updateCalcPreview();

    mode = 'update';
    editIndex = i;
    submitBtn.textContent = 'تحديث';
    cancelEditBtn.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
cancelEditBtn.addEventListener('click', () => {
    mode = 'create';
    editIndex = null;
    submitBtn.textContent = 'إنشاء';
    cancelEditBtn.style.display = 'none';
    clearForm();
});

function delItem(i) {
    const removed = data.splice(i, 1)[0]; saveData();
    if (undoStack && undoStack.timeout) clearTimeout(undoStack.timeout);
    undoStack = { item: removed, index: i, timeout: setTimeout(() => { undoStack = null; }, 5000) };
    toast('تم الحذف — لديك 5 ثواني للتراجع');

    const undoEl = document.createElement('div');
    undoEl.className = 'toast';
    undoEl.innerHTML = `حذف "${removed.title}" <button id="undoBtn" style="margin-inline-start:8px">تراجع</button>`;
    toastsEl.appendChild(undoEl);
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (!undoStack) return;
        data.splice(undoStack.index, 0, undoStack.item);
        saveData(); render();
        clearTimeout(undoStack.timeout); undoStack = null; toast('تم استعادة العنصر');
        undoEl.remove();
    });
    setTimeout(() => undoEl.remove(), 5000);
}

clearAllBtn.addEventListener('click', () => {
    if (!confirm('هل تريد حذف كل المنتجات؟')) return;
    data = [];
    saveData();
    toast('تم حذف كل المنتجات');
});

exportJsonBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('تم تصدير JSON');
});
exportCsvBtn.addEventListener('click', () => {
    if (!data.length) return toast('لا توجد بيانات');
    const rows = [['title', 'category', 'price', 'taxes', 'ads', 'discount', 'total', 'date']];
    data.forEach(r => rows.push([escapeCsv(r.title), r.category, r.price, r.taxes, r.ads, r.discount, r.total, r.date]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('تم تصدير CSV');
});
exportXlsxBtn.addEventListener('click', () => {
    if (!data.length) return toast('لا توجد بيانات');
    const ws_data = data.map(p => ({
        العنوان: p.title, الفئة: p.category, السعر: p.price, الضريبة: p.taxes,
        الإعلانات: p.ads, الخصم: p.discount, المجموع: p.total, التاريخ: p.date
    }));
    const ws = XLSX.utils.json_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
    XLSX.writeFile(wb, "products.xlsx");
    toast('تم تصدير Excel بصيغة XLSX');
});

function escapeCsv(v) { if (typeof v === 'string' && v.includes(',')) return '"' + v.replace(/"/g, '""') + '"'; return v; }

function applyFiltersSort(list) {
    const q = searchInput.value.trim().toLowerCase();
    const mn = Number(minPriceEl.value || -Infinity);
    const mx = Number(maxPriceEl.value || Infinity);
    if (q) list = list.filter(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    list = list.filter(p => Number(p.price) >= mn && Number(p.price) <= mx);
    const sortVal = sortByEl.value;
    if (sortVal) {
        if (sortVal === 'price-asc') list.sort((a, b) => a.price - b.price);
        else if (sortVal === 'price-desc') list.sort((a, b) => b.price - a.price);
        else if (sortVal === 'title-asc') list.sort((a, b) => a.title.localeCompare(b.title));
        else if (sortVal === 'title-desc') list.sort((a, b) => b.title.localeCompare(a.title));
    }
    return list;
}

function render() {
    let filtered = applyFiltersSort([...data]);
    const totalPages = Math.ceil(filtered.length / perPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    productsTbody.innerHTML = '';
    paginated.forEach((p, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${start + i + 1}</td>
            <td>${p.title}</td>
            <td>${p.price}</td>
            <td>${p.taxes}</td>
            <td>${p.ads}</td>
            <td>${p.discount}</td>
            <td>${p.total}</td>
            <td>${p.category}</td>
            <td>${p.date}</td>
            <td>
                <button class="ghost" onclick="setEdit(${data.indexOf(p)})">تعديل</button>
                <button class="danger" onclick="delItem(${data.indexOf(p)})">حذف</button>
            </td>
        `;
        productsTbody.appendChild(tr);
    });

    renderPagination(totalPages); // <--- هنا مرة واحدة فقط

    // Stats
    statsEl.innerHTML = '';
    const totalProducts = data.length;
    const totalValue = data.reduce((sum, p) => sum + Number(p.price), 0).toFixed(2);
    const totalDiscount = data.reduce((sum, p) => sum + Number(p.discount), 0).toFixed(2);
    ['المنتجات', 'إجمالي السعر', 'إجمالي الخصم'].forEach((label, idx) => {
        const stat = document.createElement('div');
        stat.className = 'stat';
        if (idx === 0) stat.innerHTML = `${label}<b>${totalProducts}</b>`;
        else if (idx === 1) stat.innerHTML = `${label}<b>${totalValue} LE</b>`;
        else if (idx === 2) stat.innerHTML = `${label}<b>${totalDiscount} LE</b>`;
        statsEl.appendChild(stat);
    });
}


function renderPagination(totalPages) {
    paginationEl.innerHTML = '';

    const maxVisible = 7; // عدد الصفحات الظاهرة بدون سحب الأسهم
    let startPage = 1;
    let endPage = totalPages;

    if (totalPages > maxVisible) {
        startPage = currentPage - Math.floor(maxVisible / 2);
        endPage = currentPage + Math.floor(maxVisible / 2);

        if (startPage < 1) {
            endPage += 1 - startPage;
            startPage = 1;
        }
        if (endPage > totalPages) {
            startPage -= endPage - totalPages;
            endPage = totalPages;
        }
    }

    if (startPage > 1) {
        const leftArrow = document.createElement('button');
        leftArrow.textContent = '⏪';
        leftArrow.classList.add('arrow');
        leftArrow.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); render(); });
        paginationEl.appendChild(leftArrow);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => { currentPage = i; render(); });
        paginationEl.appendChild(btn);
    }

    if (endPage < totalPages) {
        const rightArrow = document.createElement('button');
        rightArrow.textContent = '⏩';
        rightArrow.classList.add('arrow');
        rightArrow.addEventListener('click', () => { currentPage = Math.min(totalPages, currentPage + 1); render(); });
        paginationEl.appendChild(rightArrow);
    }
}


searchInput.addEventListener('input', () => { currentPage = 1; render(); });
minPriceEl.addEventListener('input', () => { currentPage = 1; render(); });
maxPriceEl.addEventListener('input', () => { currentPage = 1; render(); });
clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    minPriceEl.value = '';
    maxPriceEl.value = '';
    sortByEl.value = '';
    currentPage = 1;

    render();

});

sortByEl.addEventListener('change', () => { currentPage = 1; render(); });

render();