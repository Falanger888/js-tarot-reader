// ---------- УТИЛИТЫ И БЕЗОПАСНОСТЬ ----------

// Защита от XSS-атак (экранирование пользовательского ввода)
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Криптографическая случайность
function secureRandomInt(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

// Честная тасовка Фишера-Йетса
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- СБОРКА КОЛОДЫ ----------
function buildDeck() {
  const deck = [];
  MAJORS.forEach(c => deck.push({
    name: c.n, suit: "Старший Аркан",
    up: c.u, rev: c.r
  }));
  for (const [suit, data] of Object.entries(MINORS)) {
    data.cards.forEach(c => deck.push({
      name: `${c.n} ${suit}`, suit: suit,
      up: `${c.u} (${data.dom})`,
      rev: `${c.r} (${data.dom})`
    }));
  }
  return deck;
}

// ---------- DOM ЭЛЕМЕНТЫ И СОСТОЯНИЕ ----------
const grid = document.getElementById("grid");
const summary = document.getElementById("summary");
const questionInput = document.getElementById("question");

let currentSpread = "5";
let animationTimers = []; // Для очистки старых анимаций

// ---------- ГЕНЕРАЦИЯ HTML КАРТЫ (С доступностью) ----------
function cardHTML(card, index) {
  const reversed = card.reversed;
  const meaning = reversed ? card.rev : card.up;
  
  return `
    <div class="card-slot">
      <div class="position-label">${card.position}</div>
      <div class="card" data-index="${index}" tabindex="0" role="button" aria-label="Карта ${card.name}">
        <div class="card-inner">
          <div class="card-face card-front"></div>
          <div class="card-face card-back">
            ${reversed ? '<div class="rev-badge">перевёрнута</div>' : ''}
            <div>
              <div class="card-name">${card.name}</div>
              <div class="card-suit">${card.suit}</div>
            </div>
            <div class="card-meaning">${meaning}</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ---------- ГЛАВНАЯ ФУНКЦИЯ РАСКЛАДА ----------
function draw() {
  const question = questionInput.value.trim();
  const displayQuestion = question || "Свободный расклад (без вопроса)";
  
  const positions = POSITIONS[currentSpread];
  const deck = shuffle(buildDeck());
  const picked = [];

  for (let i = 0; i < positions.length; i++) {
    picked.push({
      ...deck[i],
      position: positions[i],
      reversed: secureRandomInt(100) < 30 // 30% шанс перевернутой карты
    });
  }

  grid.innerHTML = picked.map((c, i) => cardHTML(c, i)).join("");

  // Очищаем старые таймеры, чтобы не было багов при быстрых кликах
  animationTimers.forEach(t => clearTimeout(t));
  animationTimers = [];

  // Авто-переворот с сохранением ID таймеров
  grid.querySelectorAll(".card").forEach((el, i) => {
    const timerId = setTimeout(() => el.classList.add("flipped"), 350 + i * 320);
    animationTimers.push(timerId);
  });

  // Сводка с защитой от XSS
  summary.innerHTML = `
    <strong>Вопрос:</strong> ${escapeHTML(displayQuestion)}<br><br>
    <strong>Как читать:</strong> смотри не на отдельные карты, а на историю между ними.
    Где конфликт? Где ресурс? Что советует центральная карта? Исход — это не приговор,
    а «куда ведёт текущий вектор, если ничего не менять».
  `;
  summary.classList.add("show");

  window.scrollTo({ top: grid.offsetTop - 20, behavior: "smooth" });
}

// ---------- ОБРАБОТЧИКИ СОБЫТИЙ ----------

// Переключение кнопок расклада
document.querySelectorAll(".spread-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".spread-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentSpread = btn.dataset.spread;
  });
});

// Кнопка "Разложить"
document.getElementById("draw").addEventListener("click", draw);

// Кнопка "Открыть все"
document.getElementById("flipAll").addEventListener("click", () => {
  grid.querySelectorAll(".card").forEach(el => el.classList.add("flipped"));
});

// Кнопка "Сбросить"
document.getElementById("reset").addEventListener("click", () => {
  grid.innerHTML = `
    <div class="empty" style="grid-column: 1 / -1;">
      <span class="deco">☾</span>
      Задай вопрос и нажми «Разложить».<br>
      Карты откроются по одной — или сразу, если нажмёшь «Открыть все».
    </div>`;
  summary.classList.remove("show");
  questionInput.value = "";
});

// Enter в поле ввода
questionInput.addEventListener("keydown", e => {
  if (e.key === "Enter") draw();
});

// ДЕЛЕГИРОВАНИЕ СОБЫТИЙ (Оптимизация и доступность)
// Один слушатель на всю сетку вместо сотни на каждую карту
grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) card.classList.toggle("flipped");
});

// Переворот карт с клавиатуры (Enter или Пробел)
grid.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const card = e.target.closest(".card");
    if (card) {
      e.preventDefault(); 
      card.classList.toggle("flipped");
    }
  }
});