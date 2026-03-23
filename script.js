// --- 1. CẤU HÌNH ---
// THẦY DÁN LINK CSV CÔNG BỐ TỪ GOOGLE SHEETS VÀO ĐÂY
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRCf-F3dCvJi6pr4elMqwG9YrNtmB-GWds7YCmf09JbTv8AY3gtrwXpcMXc8KTQmpuJhc0al2jSBR4B/pub?gid=1176419369&single=true&output=csv";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwxGySySYeE0wsg-41K5lTQUYgL_beTxmCGagDfwQO1AUxLs_l8K4iGMgz-jKE9sxc/exec";

// --- 2. BIẾN TRẠNG THÁI ---
let allQuestions = [];      // Toàn bộ ngân hàng câu hỏi từ Sheets
let selectedQuestions = []; // 30 câu ngẫu nhiên cho lượt thi này
let studentAnswers = [];    
let currentQuestionIndex = 0; 
let timeLeft = 1200; 
let timerInterval;
let isSubmitted = false;

// --- 3. TẢI DỮ LIỆU TỪ GOOGLE SHEETS (THAY THẾ DATA.JS) ---
function loadQuestionsFromSheets() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        complete: function(results) {
            // Chuyển đổi dữ liệu từ cột Excel sang định dạng mảng options của thầy
            allQuestions = results.data
                .filter(row => row.CauHoi && row.CauHoi.trim() !== "")
                .map(row => ({
                    question: row.CauHoi,
                    options: [row.A, row.B, row.C, row.D].filter(opt => opt), // Gom A,B,C,D vào mảng
                    answer: row.DapAnDung ? row.DapAnDung.trim() : "",
                    explanation: row.GiaiThich || "Không có giải thích."
                }));
            console.log("Đã tải thành công " + allQuestions.length + " câu hỏi từ Sheets.");
        },
        error: function(err) {
            console.error("Lỗi tải dữ liệu Sheets:", err);
            alert("Không thể tải dữ liệu đề thi. Vui lòng kiểm tra link Google Sheets!");
        }
    });
}

// Chạy tải dữ liệu ngay khi load trang
window.onload = loadQuestionsFromSheets;

// --- 4. HÀM BẮT ĐẦU THI ---
function startQuiz() {
    const name = document.getElementById('studentName').value.trim();
    const id = document.getElementById('studentID').value.trim();

    if (!name || !id) {
        alert("Vui lòng nhập đủ Họ tên và Khóa!");
        return;
    }

    if (allQuestions.length < 30) {
        alert("Dữ liệu đang tải hoặc chưa đủ 30 câu. Vui lòng đợi trong giây lát!");
        return;
    }

    // Chọn 30 câu ngẫu nhiên từ ngân hàng câu hỏi vừa tải về
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

// --- 5. HIỂN THỊ CÂU HỎI ---
function showQuestion(index) {
    currentQuestionIndex = index;
    const q = selectedQuestions[index];
    const content = document.getElementById('quiz-content');
    const storedAnswer = studentAnswers.find(item => item.qIndex === index);

    let optionsHtml = "";
    q.options.forEach((opt) => {
        const isSelected = storedAnswer && storedAnswer.selectedAnswer === opt;
        optionsHtml += `
            <div class="option-item ${isSelected ? 'selected' : ''}" onclick="selectAnswer(this, ${index}, '${opt}')">
                <label class="option-label">${opt}</label>
            </div>`;
    });

    content.innerHTML = `
        <div class="question-header"> 
            <span class="q-count">Câu ${index + 1}/30</span>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-group">${optionsHtml}</div>
        <div class="navigation-btns">
            <button class="btn-nav" onclick="prevQuestion()" ${index === 0 ? 'style="visibility:hidden;"' : ''}>‹ TRƯỚC</button>
            <button class="btn-nav" onclick="${index === selectedQuestions.length - 1 ? 'submitQuiz()' : 'nextQuestion()'}">
                ${index === selectedQuestions.length - 1 ? 'NỘP BÀI ›' : 'TIẾP ›'}
            </button>
        </div>
    `;
    updateGridStatus(index);
}

// --- 6. XỬ LÝ CHỌN ĐÁP ÁN ---
function selectAnswer(element, qIndex, answer) {
    if (isSubmitted) return;

    const existingIndex = studentAnswers.findIndex(item => item.qIndex === qIndex);
    if (existingIndex !== -1) {
        studentAnswers[existingIndex].selectedAnswer = answer;
    } else {
        studentAnswers.push({ qIndex: qIndex, selectedAnswer: answer });
    }

    const options = element.parentElement.querySelectorAll('.option-item');
    options.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');

    updateGridStatus(qIndex);
}

// --- 7. ĐIỀU HƯỚNG ---
function nextQuestion() {
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

// --- 8. SƠ ĐỒ CÂU HỎI (GRID) ---
function generateNavigationGrid() {
    const grid = document.getElementById('nav-grid');
    grid.innerHTML = "";
    selectedQuestions.forEach((q, i) => {
        const item = document.createElement('div');
        item.classList.add('grid-item');
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
        const isAnswered = studentAnswers.some(ans => ans.qIndex === i);
        if (isAnswered) item.classList.add('answered');
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
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Hết giờ làm bài!");
            submitQuiz(true);
        }
    }, 1000);
}

// --- 10. NỘP BÀI VÀ GỬI KẾT QUẢ ---
async function submitQuiz(force = false) {
    if (isSubmitted) return;
    if (!force && !confirm("Bạn có chắc chắn muốn nộp bài?")) return;

    isSubmitted = true;
    clearInterval(timerInterval);

    let score = 0;
    studentAnswers.forEach(ans => {
        const originalQuestion = selectedQuestions[ans.qIndex];
        // So sánh đáp án chọn với đáp án đúng (từ cột DapAnDung trong Sheets)
        if (ans.selectedAnswer === originalQuestion.answer) {
            score++;
        }
    });

    const status = score >= 25 ? "ĐẠT" : "KHÔNG ĐẠT";
    const studentName = document.getElementById('studentName').value;
    const studentID = document.getElementById('studentID').value;

    alert(`Kết quả của bạn: ${score}/30 câu - Trạng thái: ${status}`);

    const payload = {
        name: studentName,
        id: studentID,
        score: score + "/30",
        status: status,
        sheetName: "Ketquananghang"
    };

    try {
        // Chờ gửi dữ liệu xong
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("Gửi kết quả thành công.");
    } catch (error) {
        console.error('Lỗi gửi Sheets:', error);
    }

    // Đợi 1 giây rồi tải lại trang để học sinh tiếp theo thi
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// --- 11. XỬ LÝ CHẾ ĐỘ THI/ÔN TẬP ---
const modeToggle = document.getElementById('modeToggle');
const modeText = document.getElementById('modeText');

const savedMode = localStorage.getItem('examMode');
if (savedMode === 'practice' && modeToggle) {
    modeToggle.checked = true;
    if(modeText) {
        modeText.innerText = "Ôn tập (Có giải thích)";
        modeText.style.color = "#007bff";
    }
}

if (modeToggle) {
    modeToggle.addEventListener('change', function() {
        if (this.checked) {
            modeText.innerText = "Ôn tập (Có giải thích)";
            modeText.style.color = "#007bff";
            localStorage.setItem('examMode', 'practice');
        } else {
            modeText.innerText = "Thi sát hạch";
            modeText.style.color = "#ff6600";
            localStorage.setItem('examMode', 'exam');
        }
    });
}
