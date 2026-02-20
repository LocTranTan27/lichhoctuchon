// Quản lý dữ liệu LocalStorage
const STORAGE_KEY = 'STUDY_SCHEDULE_DATA';

function getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Xử lý YouTube URL
function getYouTubeEmbedUrl(url) {
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

// DOM Elements
const form = document.getElementById('study-form');
const filterDate = document.getElementById('filter-date');
const timeline = document.getElementById('schedule-timeline');
const clockDisplay = document.getElementById('real-time-clock');

// Khởi tạo ngày hiện tại cho input
const today = new Date().toISOString().split('T')[0];
filterDate.value = today;
document.getElementById('input-date').value = today;

// 1. Đồng hồ thời gian thực
setInterval(() => {
    const now = new Date();
    clockDisplay.innerText = now.toLocaleTimeString('vi-VN');
}, 1000);

// 2. Hệ thống Thông báo
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

setInterval(() => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');
    
    const data = getData();
    const todayLessons = data[currentDate] || [];
    
    todayLessons.forEach(lesson => {
        if (lesson.startTime === currentTime && now.getSeconds() === 0) {
            new Notification("Đến giờ học!", {
                body: `Môn: ${lesson.subject}`,
                icon: "https://cdn-icons-png.flaticon.com/512/2997/2997495.png"
            });
        }
    });
}, 1000);

// 3. Render Lịch trình
function renderSchedule() {
    const data = getData();
    const selectedDate = filterDate.value;
    const lessons = data[selectedDate] || [];

    // Sắp xếp theo giờ bắt đầu
    lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (lessons.length === 0) {
        timeline.innerHTML = '<p style="text-align:center; padding:20px;">Không có lịch học cho ngày này.</p>';
        return;
    }

    timeline.innerHTML = lessons.map((lesson, index) => {
        const videoHtml = lesson.videos
            .map(link => {
                const embed = getYouTubeEmbedUrl(link);
                return embed ? `<div class="video-container"><iframe src="${embed}" frameborder="0" allowfullscreen></iframe></div>` : '';
            }).join('');

        return `
            <div class="lesson-card">
                <div class="time-slot">${lesson.startTime} - ${lesson.endTime}</div>
                <div class="content-slot">
                    <div class="lesson-title">${lesson.subject}</div>
                    ${lesson.note ? `<div class="lesson-note">${lesson.note}</div>` : ''}
                    ${videoHtml}
                    <div class="actions">
                        <button class="btn-edit" onclick="editLesson('${selectedDate}', ${index})">Sửa</button>
                        <button class="btn-delete" onclick="deleteLesson('${selectedDate}', ${index})">Xóa</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 4. Xử lý Form (Thêm/Sửa)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('input-date').value;
    const subject = document.getElementById('input-subject').value;
    const startTime = document.getElementById('input-start').value;
    const endTime = document.getElementById('input-end').value;
    const note = document.getElementById('input-note').value;
    const videoText = document.getElementById('input-videos').value;
    const editId = document.getElementById('edit-id').value;

    const videoArray = videoText.split('\n').filter(line => line.trim() !== '');

    const newLesson = { subject, startTime, endTime, note, videos: videoArray };
    let data = getData();

    if (editId !== "") {
        // Chế độ sửa
        const [oldDate, index] = editId.split('|');
        // Nếu đổi ngày, xóa ở ngày cũ thêm vào ngày mới
        data[oldDate].splice(index, 1);
        if (data[oldDate].length === 0) delete data[oldDate];
        
        if (!data[date]) data[date] = [];
        data[date].push(newLesson);
    } else {
        // Chế độ thêm mới
        if (!data[date]) data[date] = [];
        data[date].push(newLesson);
    }

    saveData(data);
    resetForm();
    renderSchedule();
    alert("Đã lưu lịch học!");
});

window.editLesson = function(date, index) {
    const data = getData();
    const lesson = data[date][index];
    
    document.getElementById('form-title').innerText = "Sửa Buổi Học";
    document.getElementById('input-date').value = date;
    document.getElementById('input-subject').value = lesson.subject;
    document.getElementById('input-start').value = lesson.startTime;
    document.getElementById('input-end').value = lesson.endTime;
    document.getElementById('input-note').value = lesson.note;
    document.getElementById('input-videos').value = lesson.videos.join('\n');
    document.getElementById('edit-id').value = `${date}|${index}`;
    
    document.getElementById('btn-cancel').style.display = "block";
    document.getElementById('study-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteLesson = function(date, index) {
    if (confirm("Bạn có chắc muốn xóa buổi học này?")) {
        let data = getData();
        data[date].splice(index, 1);
        if (data[date].length === 0) delete data[date];
        saveData(data);
        renderSchedule();
    }
};

function resetForm() {
    form.reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('form-title').innerText = "Thêm Buổi Học Mới";
    document.getElementById('btn-cancel').style.display = "none";
    document.getElementById('input-date').value = filterDate.value;
}

document.getElementById('btn-cancel').onclick = resetForm;
filterDate.onchange = renderSchedule;

// Chạy lần đầu
renderSchedule();