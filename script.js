// Quản lý dữ liệu bằng LocalStorage
let studySessions = JSON.parse(localStorage.getItem('studySessions')) || [];
let currentViewDate = new Date(); // Ngày đang hiển thị trên lịch

// --- 1. XỬ LÝ NGÀY THÁNG (CHUẨN VN: dd/mm/yyyy) ---
function formatDateVN(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function toISODate(date) {
    return date.toISOString().split('T')[0];
}

// Cập nhật đồng hồ thời gian thực
setInterval(() => {
    const now = new Date();
    document.getElementById('current-time').innerText = 
        now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    checkNotifications(now);
}, 1000);

// --- 2. CHỨC NĂNG CHÍNH ---
const form = document.getElementById('study-form');
const timeline = document.getElementById('timeline');
const queueList = document.getElementById('queue-list');
const viewingDateHeader = document.getElementById('viewing-date');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const session = {
        id: id || Date.now().toString(),
        date: document.getElementById('study-date').value, // yyyy-mm-dd từ input
        subject: document.getElementById('subject-name').value,
        start: document.getElementById('start-time').value,
        end: document.getElementById('end-time').value,
        notes: document.getElementById('notes').value,
        videos: document.getElementById('youtube-links').value.split(',').map(link => link.trim()).filter(l => l)
    };

    if (id) {
        studySessions = studySessions.map(s => s.id === id ? session : s);
    } else {
        studySessions.push(session);
    }

    localStorage.setItem('studySessions', JSON.stringify(studySessions));
    form.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('btn-cancel').classList.add('hidden');
    render();
});

function render() {
    renderTimeline();
    renderQueue();
}

function renderTimeline() {
    const dateStr = toISODate(currentViewDate);
    viewingDateHeader.innerText = formatDateVN(currentViewDate);
    
    const todaysSessions = studySessions
        .filter(s => s.date === dateStr)
        .sort((a, b) => a.start.localeCompare(b.start));

    if (todaysSessions.length === 0) {
        timeline.innerHTML = "<p style='text-align:center; padding:20px;'>Không có lịch học cho ngày này.</p>";
        return;
    }

    timeline.innerHTML = todaysSessions.map(s => `
        <div class="timeline-item">
            <div class="time-col">${s.start} – ${s.end}</div>
            <div class="content-col">
                <h4>${s.subject}</h4>
                <p><strong>Ghi chú:</strong> ${s.notes || 'Không có'}</p>
                <div class="video-container">
                    ${s.videos.map(link => {
                        const videoId = extractVideoID(link);
                        return videoId ? `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>` : '';
                    }).join('')}
                </div>
                <div style="margin-top:10px;">
                    <button onclick="editSession('${s.id}')" style="background:#fbbc04; color:#000; padding:5px 10px; font-size:12px;">Sửa</button>
                    <button onclick="deleteSession('${s.id}')" style="background:#ea4335; padding:5px 10px; font-size:12px;">Xóa</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderQueue() {
    const now = new Date();
    now.setHours(0,0,0,0);

    const upcoming = studySessions
        .filter(s => new Date(s.date) >= now)
        .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
        .slice(0, 10);

    queueList.innerHTML = upcoming.map(s => `
        <div class="queue-item" onclick="jumpToDate('${s.date}')">
            <div class="queue-date">${formatDateVN(new Date(s.date))} - ${s.start}</div>
            <div class="queue-subject">${s.subject}</div>
        </div>
    `).join('');
}

function extractVideoID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// --- 3. ĐIỀU HƯỚNG & QUẢN LÝ ---
window.jumpToDate = (dateStr) => {
    currentViewDate = new Date(dateStr);
    render();
};

window.deleteSession = (id) => {
    if(confirm('Xóa buổi học này?')) {
        studySessions = studySessions.filter(s => s.id !== id);
        localStorage.setItem('studySessions', JSON.stringify(studySessions));
        render();
    }
};

window.editSession = (id) => {
    const s = studySessions.find(sess => sess.id === id);
    document.getElementById('edit-id').value = s.id;
    document.getElementById('study-date').value = s.date;
    document.getElementById('subject-name').value = s.subject;
    document.getElementById('start-time').value = s.start;
    document.getElementById('end-time').value = s.end;
    document.getElementById('notes').value = s.notes;
    document.getElementById('youtube-links').value = s.videos.join(', ');
    document.getElementById('btn-cancel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('prev-day').onclick = () => {
    currentViewDate.setDate(currentViewDate.getDate() - 1);
    render();
};

document.getElementById('next-day').onclick = () => {
    currentViewDate.setDate(currentViewDate.getDate() + 1);
    render();
};

// --- 4. THÔNG BÁO ---
if ("Notification" in window) {
    Notification.requestPermission();
}

let notifiedIds = new Set();
function checkNotifications(now) {
    const dateStr = toISODate(now);
    const timeStr = now.toTimeString().substring(0, 5); // HH:MM

    studySessions.forEach(s => {
        if (s.date === dateStr && s.start === timeStr && !notifiedIds.has(s.id + timeStr)) {
            new Notification("Đến giờ học!", { body: s.subject });
            notifiedIds.add(s.id + timeStr);
        }
    });
}

// Khởi chạy lần đầu
render();