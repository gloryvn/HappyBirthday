/* ===== CẤU HÌNH TẬP TRUNG — chỉ cần sửa file này ===== */
const CONFIG = {
  name: "Your Name",                    // tên người được chúc
  taps: 50,                             // số lần nhấn bánh
  colors: { pink: "#ffc2d4", cream: "#fff8ef", cherry: "#d6264f", gold: "#e6c27a" },
  music: "assets/audio/birthday-music.mp3",   // để "" nếu không dùng nhạc
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
  photos: [                             // thêm/bớt tuỳ ý (6–12 ảnh), đặt file vào assets/images
    { src: "assets/images/memory-01.jpg", caption: "A moment to remember." },
    { src: "assets/images/memory-02.jpg", caption: "Little things, big memories." },
    { src: "assets/images/memory-03.jpg", caption: "One of my favorite days." },
    { src: "assets/images/memory-04.jpg", caption: "Forever in our memories." },
    { src: "assets/images/memory-05.jpg", caption: "Smiles worth keeping." },
    { src: "assets/images/memory-06.jpg", caption: "Just us being us." }
  ]
};
