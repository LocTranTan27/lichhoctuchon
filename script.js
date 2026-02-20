const STORAGE_KEY = 'STUDY_APP_DATA';

// --- HÀM TIỆN ÍCH ---
const getData = () => JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
const saveData = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

// Hàm chuyển đổi ngày YYYY-MM-DD sang DD/MM/YYYY
const formatDateVN = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const getYouTubeId = (url) => {
    const reg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(reg);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- DOM ELEMENTS ---
const form = document.getElementById('study-form');
const filterDateInput = document.getElementById('filter-date');
const timeline = document.getElementById('schedule-timeline');
const queueList = document.getElementById('upcoming-queue');
const displayDate = document.getElementById('display-selected-date');

// Khởi tạo ngày
const today = new Date().toISOString().split('T')[0];
filterDateInput.value = today;
document.getElementById('input-date').value = today;

// 1. ĐỒNG HỒ & THÔNG BÁO
setInterval(() => {
    const now = new Date();
    document.getElementById('real-time-clock').innerText = now.toLocaleTimeString('vi-VN');
    
    // Kiểm tra thông báo mỗi phút (giây thứ 0)
    if (now.getSeconds() === 0) {
        const dateKey = now.toISOString().split('T')[0];
        const timeKey = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');
        const lessons = getData()[dateKey] || [];
        lessons.forEach(l => {
            if (l.startTime === timeKey) {
                new Notification("Đến giờ học!", { body: `Môn: ${l.subject}` });
            }
        });
    }
}, 1000);

if (Notification.permission !== "granted") Notification.requestPermission();

// 2. RENDER GIAO DIỆN
function refreshUI() {
    const data = getData();
    const selectedDate = filterDateInput.value;
    displayDate.innerText = formatDateVN(selectedDate);

    // Render Timeline chính
    const dayLessons = (data[selectedDate] || []).sort((a,b) => a.startTime.localeCompare(b.startTime));
    timeline.innerHTML = dayLessons.length ? dayLessons.map((l, i) => `
        <div class="lesson-card">
            <div class="time-box">${l.startTime}<br>to<br>${l.endTime}</div>
            <div style="flex:1">
                <strong>${l.subject}</strong>
                <p style="font-size:0.85rem; color:#666">${l.note || ''}</p>
                ${l.videos.map(v => {
                    const id = getYouTubeId(v);
                    return id ? `<div class="video-container"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div>` : '';
                }).join('')}
                <div style="margin-top:10px">
                    <button onclick="editLesson('${selectedDate}', ${i})" style="color:blue; background:none; border:none; cursor:pointer">Sửa</button>
                    <button onclick="deleteLesson('${selectedDate}', ${i})" style="color:red; background:none; border:none; cursor:pointer; margin-left:10px">Xóa</button>
                </div>
            </div>
        </div>
    `).join('') : '<p>Trống lịch.</p>';

    // Render Hàng chờ (Tất cả các ngày tiếp theo)
    const allDates = Object.keys(data).sort();
    let queueHtml = '';
    allDates.forEach(d => {
        data[d].forEach(l => {
            queueHtml += `
                <div class="queue-item">
                    <span class="queue-date">${formatDateVN(d)} | ${l.startTime}</span>
                    <span class="queue-subject">${l.subject}</span>
                </div>
            `;
        });
    });
    queueList.innerHTML = queueHtml || '<p>Chưa có lịch.</p>';
}

// 3. XỬ LÝ DỮ LIỆU
form.onsubmit = (e) => {
    e.preventDefault();
    const date = document.getElementById('input-date').value;
    const editId = document.getElementById('edit-id').value;
    const lesson = {
        subject: document.getElementById('input-subject').value,
        startTime: document.getElementById('input-start').value,
        endTime: document.getElementById('input-end').value,
        note: document.getElementById('input-note').value,
        videos: document.getElementById('input-videos').value.split('\n').filter(v => v.trim())
    };

    let data = getData();
    if (editId) {
        const [oldDate, idx] = editId.split('|');
        data[oldDate].splice(idx, 1);
        if (data[oldDate].length === 0) delete data[oldDate];
    }
    
    if (!data[date]) data[date] = [];
    data[date].push(lesson);
    
    saveData(data);
    resetForm();
    refreshUI();
};

window.editLesson = (date, idx) => {
    const l = getData()[date][idx];
    document.getElementById('input-date').value = date;
    document.getElementById('input-subject').value = l.subject;
    document.getElementById('input-start').value = l.startTime;
    document.getElementById('input-end').value = l.endTime;
    document.getElementById('input-note').value = l.note;
    document.getElementById('input-videos').value = l.videos.join('\n');
    document.getElementById('edit-id').value = `${date}|${idx}`;
    document.getElementById('btn-cancel').style.display = 'block';
    document.getElementById('form-title').innerText = "Cập nhật lịch";
};

window.deleteLesson = (date, idx) => {
    if (confirm("Xóa buổi học này?")) {
        let data = getData();
        data[date].splice(idx, 1);
        if (data[date].length === 0) delete data[date];
        saveData(data);
        refreshUI();
    }
};

function resetForm() {
    form.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('btn-cancel').style.display = 'none';
    document.getElementById('form-title').innerText = "Thêm Buổi Học";
}

filterDateInput.onchange = refreshUI;
document.getElementById('btn-cancel').onclick = resetForm;

// Khởi chạy
refreshUI();