// --- 1. CẤU HÌNH ---
// Thầy kiểm tra lại GID này có đúng là của tab "câu hỏi xe nâng hàng" không nhé
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

// --- 3. TẢI DỮ LIỆU (Đã sửa để khớp với file Excel của thầy) ---
function loadQuestionsFromSheets() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        complete: function(results) {
            // Lọc bỏ dòng trống và ánh xạ dữ liệu
            allQuestions = results.data
                .filter(row => (row.CauHoi || row.Câu hỏi) && (row.CauHoi || row.Câu hỏi).trim() !== "")
                .map(row => ({
                    question: row.CauHoi || row["Câu hỏi"],
                    options: [row.A, row.B, row.C, row.D].filter(opt => opt),
                    answer: row.DapAnDung ? row.DapAnDung.trim() : "",
                    // Khớp chính xác cột "Giaithich" (viết liền, t thường) hoặc "Giải thích"
                    explanation: row["Giaithich"] || row["Giải thích"] || "Chưa có nội dung giải thích."
                }));
            console.log("Đã tải thành công " + allQuestions.length + " câu hỏi.");
        },
        error: function(err) {
            console.error("Lỗi khi tải Google Sheets:", err);
        }
    });
}
window.onload = loadQuestionsFromSheets;

// --- 4. HÀM BẮT ĐẦU THI ---
function startQuiz() {
    const name = document.getElementById('studentName').value.trim();
    const id = document.getElementById('studentID').value.trim();
    
    if (!name || !id) { 
        alert("Vui lòng nhập đủ Họ tên và Khóa!"); 
        return; 
    }

    // Nếu dữ liệu chưa tải xong hoặc lỗi link CSV
    if (allQuestions.length === 0) { 
        alert("Hệ thống đang tải dữ liệu từ Google Sheets, vui lòng đợi vài giây hoặc kiểm tra lại kết nối mạng!"); 
        return; 
    }

    // Lấy ngẫu nhiên 30 câu (hoặc tất cả nếu ít hơn 30)
    const numToSelect = Math.min(allQuestions.length, 30);
    selectedQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, numToSelect);
    
    studentAnswers = []; 
    isSubmitted = false;
    currentQuestionIndex = 0;
    timeLeft = 1200;

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('caee-header').style.display = 'flex';
    document.getElementById('quiz-screen').style.display = 'grid';
    document.getElementById('header-student-info').innerText = `Học viên: ${name} - Khóa: ${id}`;

    generateNavigationGrid();
    showQuestion(0);
    startTimer();
}

// --- 5. HIỂN THỊ CÂU HỎI (Cập nhật màu sắc & giải thích) ---
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
                // Màu chuẩn theo yêu cầu: Đúng xanh lá, Sai đỏ đô
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
        <div class="question-header"><span class="q-count">Câu ${index + 1}/${selectedQuestions.length}</span></div>
        <div class="question-text">${q.question}</div>
        <div class="options-group">${optionsHtml}</div>
        
        <div id="explanation-box" class="explanation-box" style="display: ${storedAnswer && mode === 'practice' ? 'block' : 'none'}; border-left: 5px solid #28a745; background: #f9f9f9; padding: 10px; margin-top: 10px;">
            <strong style="color: #28a745;">Giải thích:</strong> ${q.explanation}
        </div>

        <div class="navigation-btns" style="display: flex; justify-content: space-between; margin-top: 20px;">
            <button class="btn-nav" style="background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px;" onclick="prevQuestion()" ${index === 0 ? 'style="visibility:hidden;"' : ''}>TRƯỚC</button>
            <button class="btn-nav" style="background-color: #007bff; color: white; border: none; padding: 10px
