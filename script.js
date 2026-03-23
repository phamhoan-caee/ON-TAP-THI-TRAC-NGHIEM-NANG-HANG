// --- 1. CẤU HÌNH WEB APP URL ---
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwxGySySYeE0wsg-41K5lTQUYgL_beTxmCGagDfwQO1AUxLs_l8K4iGMgz-jKE9sxc/exec";

// --- 2. BIẾN TRẠNG THÁI ---
let selectedQuestions = []; // 30 câu ngẫu nhiên
let studentAnswers = [];    /* Mảng lưu đáp án: [{qIndex:0, selectedAnswer:"A"}, ...] */
let currentQuestionIndex = 0; // Câu hỏi đang hiển thị
let timeLeft = 1200; // 20 phút (1200 giây)
let timerInterval;

// --- 3. HÀM BẮT ĐẦU THI ---
function startQuiz() {
    const name = document.getElementById('studentName').value.trim();
    const id = document.getElementById('studentID').value.trim();

    if (!name || !id) {
        alert("Vui lòng nhập đủ Họ tên và Khóa!");
        return;
    }

    // Kiểm tra dữ liệu
    if (typeof questionBank === 'undefined' || questionBank.length < 30) {
        alert("Lỗi: Không tìm thấy file data.js hoặc ngân hàng câu hỏi quá ít!");
        return;
    }

    // Chọn 30 câu ngẫu nhiên từ data.js
    selectedQuestions = [...questionBank].sort(() => 0.5 - Math.random()).slice(0, 30);
    studentAnswers = []; // Xóa đáp án cũ

    // Hiển thị giao diện làm bài
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('caee-header').style.display = 'flex';
    document.getElementById('quiz-screen').style.display = 'grid';

    // Cập nhật thông tin học viên trên Header
    document.getElementById('header-student-info').innerText = `Học viên: ${name}`;

    // Tạo sơ đồ câu hỏi (bên phải)
    generateNavigationGrid();
    
    // Hiển thị câu đầu tiên
    showQuestion(0);
    
    // Chạy đồng hồ
    startTimer();
}

// --- 4. HÀM HIỂN THỊ CÂU HỎI TỪNG CÂU ---
function showQuestion(index) {
    currentQuestionIndex = index;
    const q = selectedQuestions[index];
    const content = document.getElementById('quiz-content');
    
    // Tìm đáp án học viên đã chọn trước đó (nếu có)
    const storedAnswer = studentAnswers.find(item => item.qIndex === index);

    let optionsHtml = "";
    // Ánh xạ options thành giao diện
    const optionLabels = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, idx) => {
        const isSelected = storedAnswer && storedAnswer.selectedAnswer === opt;
        optionsHtml += `
            <div class="option-item ${isSelected ? 'selected' : ''}" onclick="selectAnswer(this, ${index}, '${opt}')">
                <input type="radio" name="opt" ${isSelected ? 'checked' : ''} style="display:none;">
                <label class="option-label">${opt}</label>
            </div>`;
    });

    // Tạo nội dung HTML
    content.innerHTML = `
        <div class="question-header"> 
            <span class="q-count">Câu ${index + 1}/30</span>
        </div>
        <div class="question-text">${q.question}</div>
        
        <div class="options-group">
            ${optionsHtml}
        </div>
        
       <div class="navigation-btns">
    <button class="btn-nav btn-next" onclick="prevQuestion()" 
        ${index === 0 ? 'style="visibility:hidden;"' : ''}>‹ TRƯỚC</button>
    
    <button class="btn-nav btn-next" onclick="nextQuestion()">
        ${index === selectedQuestions.length - 1 ? 'NỘP BÀI ›' : 'TIẾP ›'}
    </button>
</div>
    `;

    // Cập nhật trạng thái lưới câu hỏi (Màu Cam khi đang chọn)
    updateGridStatus(index);
}

// --- 5. HÀM XỬ LÝ CHỌN ĐÁP ÁN ---
function selectAnswer(element, qIndex, answer) {
    // Lưu đáp án vào mảng
    const existingIndex = studentAnswers.findIndex(item => item.qIndex === qIndex);
    if (existingIndex !== -1) {
        studentAnswers[existingIndex].selectedAnswer = answer;
    } else {
        studentAnswers.push({ qIndex: qIndex, selectedAnswer: answer });
    }

    // Cập nhật giao diện (màu xanh cho đáp án được chọn)
    const options = element.parentElement.querySelectorAll('.option-item');
    options.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');

    // Cập nhật sơ đồ câu hỏi (Màu Xanh khi đã trả lời)
    updateGridStatus(qIndex);
}

// --- 6. HÀM ĐIỀU HƯỚNG ---
function nextQuestion() {
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    } else {
        alert("Bạn đã ở câu hỏi cuối cùng. Nhấn NỘP BÀI.");
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

// --- 7. TẠO SƠ ĐỒ CÂU HỎI (GRID) ---
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

// --- 8. CẬP NHẬT TRẠNG THÁI MÀU GRID ---
function updateGridStatus(currentIndex) {
    for (let i = 0; i < 30; i++) {
        const item = document.getElementById(`grid-item-${i}`);
        if (!item) continue;

        // Reset trạng thái
        item.classList.remove('active', 'answered');

        // Màu xanh cho câu đã trả lời
        const isAnswered = studentAnswers.some(ans => ans.qIndex === i);
        if (isAnswered) {
            item.classList.add('answered');
        }

        // Màu cam cho câu đang chọn
        if (i === currentIndex) {
            item.classList.add('active');
        }
    }
}

// --- 9. ĐỒNG HỒ ĐẾM NGƯỢC ---
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60);
        let sec = timeLeft % 60;
        document.getElementById('timer').innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Hết giờ làm bài!");
            submitQuiz();
        }
    }, 1000);
}

// --- 10. NỘP BÀI ---
async function submitQuiz(force = false) {
    // 1. Kiểm tra nếu đã nộp rồi thì không chạy lại lệnh này
    if (isSubmitted) return;

    // Xác nhận nộp bài (trừ trường hợp hết giờ tự nộp)
    if (!force && !confirm("Bạn có chắc chắn muốn nộp bài?")) return;

    // 2. KHÓA BÀI THI: Ngăn chọn đáp án và dừng đồng hồ
    isSubmitted = true;
    clearInterval(timerInterval);

    let score = 0;
    // Chấm điểm dựa trên dữ liệu studentAnswers
    studentAnswers.forEach(ans => {
        const originalQuestion = selectedQuestions[ans.qIndex];
        if (ans.selectedAnswer === originalQuestion.answer) {
            score++;
        }
    });

    const status = score >= 25 ? "ĐẠT" : "KHÔNG ĐẠT";
    const studentName = document.getElementById('studentName').value;
    const studentID = document.getElementById('studentID').value;

    // 3. Thông báo kết quả cho học viên (Hình 12)
    alert(`Chúc mừng! Kết quả của bạn: ${score}/30 câu - Trạng thái: ${status}`);

    // 4. GỬI DỮ LIỆU VỀ GOOGLE SHEETS
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzlaJtdDwuQaEuIo68KDuoTeYi6gejHW4TdWTdhEhs8ZTlrminVXPeYSxGIwhpsmNBbvA/exec';
    
   const payload = {
        name: studentName,
        id: studentID,
        score: score + "/30",
        status: status,
        sheetName: "Ketquananghang" // Thêm tên tab để Script biết chỗ lưu
    };

    try {
        // Sử dụng await để đợi gửi xong dữ liệu mới thực hiện reload trang
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("Đã gửi dữ liệu thành công");
    } catch (error) {
        console.error('Lỗi gửi Sheets:', error);
    }

    // 5. CHUYỂN VỀ GIAO DIỆN ĐĂNG NHẬP
    // Tải lại trang sẽ xóa sạch dữ liệu cũ và đưa học viên về màn hình bắt đầu
    location.reload();
}
