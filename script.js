// --- 1. CẤU HÌNH ---
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRCf-F3dCvJi6pr4elMqwG9YrNtmB-GWds7YCmf09JbTv8AY3gtrwXpcMXc8KTQmpuJhc0al2jSBR4B/pub?gid=1176419369&single=true&output=csv";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwxGySySYeE0wsg-41K5lTQUYgL_beTxmCGagDfwQO1AUxLs_l8K4iGMgz-jKE9sxc/exec";

// --- 2. BIẾN TRẠNG THÁI ---
let allQuestions = [];      
let selectedQuestions = []; 
let studentAnswers = [];    
let currentQuestionIndex = 0; 
let timeLeft = 1200; 
let timerInterval;
let isSubmitted = false;

// --- 3. TẢI DỮ LIỆU (Sửa lỗi đọc cột Giải thích có dấu) ---
function loadQuestionsFromSheets() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        complete: function(results) {
            allQuestions = results.data
                .filter(row => row.CauHoi && row.CauHoi.trim() !== "")
                .map(row => ({
                    question: row.CauHoi,
                    options: [row.A, row.B, row.C, row.D].filter(opt => opt),
                    answer: row.DapAnDung ? row.DapAnDung.trim() : "",
                    // Kiểm tra cả 'Giải thích' và 'GiaiThich' để đảm bảo lấy được dữ liệu
                    explanation: row["Giải thích"] || row["GiaiThich"] || row.GiaiThich || "Chưa có nội dung giải thích cho câu này."
                }));
            console.log("Đã tải thành công " + allQuestions.length + " câu hỏi.");
        }
    });
}
window.onload = loadQuestionsFromSheets;

// --- 4. HÀM BẮT ĐẦU THI ---
function startQuiz() {
    const name = document.getElementById('studentName').value.trim();
    const id = document.getElementById('studentID').value.trim();
    if (!name || !id) { alert("Vui lòng nhập đủ Họ tên và Khóa!"); return; }
    if (allQuestions.length < 30) { alert("Đang tải dữ liệu..."); return; }

    selectedQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 30);
    studentAnswers = []; 
    isSubmitted = false;

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('caee-header').style.display = 'flex';
    document.getElementById('quiz-screen').style.display = 'grid';
    document.getElementById('header-student-info').innerText = `Học viên: ${name}`;

    generateNavigationGrid();
    showQuestion(0);
    startTimer();
}

// --- 5. HIỂN THỊ CÂU HỎI (Bổ sung hiện Giải thích) ---
function showQuestion(index) {
    currentQuestionIndex = index;
    const q = selectedQuestions[index];
    const content = document.getElementById('quiz-content');
    const storedAnswer = studentAnswers.find(item => item.qIndex === index);
    const mode = localStorage.getItem('examMode') || 'exam';

    let optionsHtml = "";
    q.options.forEach((opt) => {
        let extraClass = "";
        if (storedAnswer) {
            if (mode === 'practice') {
                if (opt === q.answer) extraClass = "correct";
                else if (opt === storedAnswer.selectedAnswer) extraClass = "wrong";
            } else if (storedAnswer.selectedAnswer === opt) {
                extraClass = "selected";
            }
        }

        optionsHtml += `
            <div class="option-item ${extraClass}" onclick="selectAnswer(this, ${index}, '${opt}')">
                <label class="option-label">${opt}</label>
            </div>`;
    });

    content.innerHTML = `
        <div class="question-header"><span class="q-count">Câu ${index + 1}/30</span></div>
        <div class="question-text">${q.question}</div>
        <div class="options-group">${optionsHtml}</div>
        
        <div id="explanation-box" class="explanation-box" style="display: ${storedAnswer && mode === 'practice' ? 'block' : 'none'};">
            <strong style="color: #0056b3;">💡 Giải thích:</strong> 
            <span>${q.explanation || "Đang cập nhật nội dung giải thích..."}</span>
        </div>

        <div class="navigation-btns">
            <button class="btn-nav btn-prev" onclick="prevQuestion()" ${index === 0 ? 'style="visibility:hidden;"' : ''}>‹ TRƯỚC</button>
            <button class="btn-nav btn-next" onclick="${index === selectedQuestions.length - 1 ? 'submitQuiz()' : 'nextQuestion()'}">
                ${index === selectedQuestions.length - 1 ? 'NỘP BÀI ›' : 'TIẾP ›'}
            </button>
        </div>
    `;
    updateGridStatus(index);
}

// --- 6. XỬ LÝ CHỌN ĐÁP ÁN ---
function selectAnswer(element, qIndex, answer) {
    if (isSubmitted) return; 
    const mode = localStorage.getItem('examMode') || 'exam';
    const q = selectedQuestions[qIndex];

    const existingIndex = studentAnswers.findIndex(item => item.qIndex === qIndex);
    if (existingIndex !== -1) {
        studentAnswers[existingIndex].selectedAnswer = answer;
    } else {
        studentAnswers.push({ qIndex: qIndex, selectedAnswer: answer });
    }

    const options = element.parentElement.querySelectorAll('.option-item');
    
    if (mode === 'practice') {
        // Chế độ Ôn tập: Hiện màu Xanh lá/Đỏ đô ngay lập tức
        options.forEach(opt => {
            const txt = opt.querySelector('.option-label').innerText;
            opt.classList.remove('selected', 'correct', 'wrong');
            if (txt === q.answer) opt.classList.add('correct');
            if (txt === answer && answer !== q.answer) opt.classList.add('wrong');
        });
        // Hiện khung giải thích
        document.getElementById('explanation-box').style.display = 'block';
    } else {
        // Chế độ Thi: Chỉ đánh dấu ô đã chọn
        options.forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
    }

    updateGridStatus(qIndex);
}

// --- 7. ĐIỀU HƯỚNG ---
function nextQuestion() { if (currentQuestionIndex < selectedQuestions.length - 1) showQuestion(currentQuestionIndex + 1); }
function prevQuestion() { if (currentQuestionIndex > 0) showQuestion(currentQuestionIndex - 1); }

// --- 8. GRID GIAO DIỆN ---
function generateNavigationGrid() {
    const grid = document.getElementById('nav-grid');
    grid.innerHTML = "";
    selectedQuestions.forEach((q, i) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.id = `grid-item-${i}`;
        item.innerText = i + 1;
        item.onclick = () => showQuestion(i);
        grid.appendChild(item);
    });
}

function updateGridStatus(currentIndex) {
    for (let i = 0; i < selectedQuestions.length; i++) {
        const item = document.getElementById(`grid-item-${i}`);
        if (!item) continue;
        item.classList.remove('active', 'answered');
        if (studentAnswers.some(ans => ans.qIndex === i)) item.classList.add('answered');
        if (i === currentIndex) item.classList.add('active');
    }
}

// --- 9. ĐỒNG HỒ ---
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60);
        let sec = timeLeft % 60;
        document.getElementById('timer').innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        if (timeLeft <= 0) { clearInterval(timerInterval); submitQuiz(true); }
    }, 1000);
}

// --- 10. NỘP BÀI ---
async function submitQuiz(force = false) {
    if (isSubmitted) return;
    if (!force && !confirm("Bạn có chắc chắn muốn nộp bài?")) return;

    isSubmitted = true;
    clearInterval(timerInterval);

    let score = 0;
    studentAnswers.forEach(ans => {
        const q = selectedQuestions[ans.qIndex];
        if (ans.selectedAnswer === q.answer) score++;
    });

    const status = score >= 25 ? "ĐẠT" : "KHÔNG ĐẠT";
    const name = document.getElementById('studentName').value;
    const id = document.getElementById('studentID').value;

    alert(`Kết quả của bạn: ${score}/30 câu - Trạng thái: ${status}`);

    const payload = {
        name: name,
        id: id,
        score: score + "/30",
        status: status,
        sheetName: "Ketquananghang"
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    } catch (e) { console.error("Lỗi gửi dữ liệu:", e); }

    setTimeout(() => { location.reload(); }, 1000);
}

// --- 11. CHẾ ĐỘ ---
const modeToggle = document.getElementById('modeToggle');
const modeText = document.getElementById('modeText');
if (localStorage.getItem('examMode') === 'practice') {
    modeToggle.checked = true;
    modeText.innerText = "Ôn tập (Có giải thích)";
}
modeToggle.addEventListener('change', function() {
    const isPractice = this.checked;
    modeText.innerText = isPractice ? "Ôn tập (Có giải thích)" : "Thi sát hạch";
    modeText.style.color = isPractice ? "#007bff" : "#ff6600";
    localStorage.setItem('examMode', isPractice ? 'practice' : 'exam');
});
