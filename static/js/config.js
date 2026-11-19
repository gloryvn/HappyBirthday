/* ===== CẤU HÌNH TẬP TRUNG — chỉ cần sửa file này ===== */
const CONFIG = {
  name: "pu pu",                        // tên người được chúc
  taps: 50,                             // số lần nhấn bánh
  colors: { pink: "#ffc2d4", cream: "#fff8ef", cherry: "#d6264f", gold: "#e6c27a" },
  music: "static/audio/birthday-music.mp3",   // để "" nếu không dùng nhạc

  // ----- Giai đoạn 1: Màn hình chào -----
  welcomeText: "Hey! Someone special has a birthday today...",
  welcomeSub: "I have something special for you!",
  openLabel: "Open Your Surprise",

  // ----- Giai đoạn 2: Bánh kem -----
  cakeTitle: "Happy Birthday!",
  cakeHint: "Make a wish and tap the cake!",
  milestones: { 10: "Keep going!", 25: "Halfway there!", 40: "Almost there!" },
  doneTitle: "YOU DID IT!",
  doneSub: "Your birthday surprise is ready!",
  revealLabel: "REVEAL MY SURPRISE",

  // ----- Giai đoạn 3: Trang chúc mừng -----
  heroText: "Today is all about you. May your life always be filled with happiness, laughter and beautiful moments.",
  wishes: [
    "Chúc bạn có một tuổi mới thật rực rỡ!",
    "Mong rằng mỗi ngày trôi qua đều mang đến cho bạn những niềm vui mới, những cơ hội tuyệt vời và thật nhiều điều đáng nhớ.",
    "Chúc bạn luôn giữ được nụ cười trên môi, sự tự tin trong trái tim và nhiệt huyết để theo đuổi những điều mình yêu thích.",
    "Hy vọng rằng mọi ước mơ của bạn, dù lớn lao hay giản dị, đều sẽ từng bước trở thành hiện thực.",
    "Hãy luôn hạnh phúc, luôn tỏa sáng và trở thành phiên bản tuyệt vời nhất của chính mình nhé!"
  ],
  lastMessage: [                        // giữ ngắn (khoảng 6–8 dòng) để vừa lá thư
    "Cảm ơn vì đã luôn là một phần đẹp đẽ trong những ngày của mình.",
    "Chúc bạn thật nhiều yêu thương. 💖"
  ],
  finalTitle: "Once again, Happy Birthday!",
  finalSub: "May your next chapter be even more beautiful.",
  replayLabel: "Replay the Surprise",

  photos: [                             // thêm/bớt tuỳ ý (6–12 ảnh), đặt file vào static/images
    { src: "static/images/memory-01.jpg", caption: "A moment to remember." },
    { src: "static/images/memory-02.jpg", caption: "Little things, big memories." },
    { src: "static/images/memory-03.jpg", caption: "One of my favorite days." },
    { src: "static/images/memory-04.jpg", caption: "Forever in our memories." },
    { src: "static/images/memory-05.jpg", caption: "Smiles worth keeping." },
    { src: "static/images/memory-06.jpg", caption: "Just us being us." }
  ]
};
