# ВПР 4 класс 2027

Образовательное приложение для подготовки учеников 4 класса к ВПР.

Стек: React + TypeScript + Vite. Локальное хранение прогресса (без сервера). Android-оболочка через Capacitor присутствует в репозитории.

---

## Текущее состояние (фактическое)

### Готово

| Область | Статус |
|--------|--------|
| Web-приложение | Работает (`npm run dev` / `npm run build`) |
| Математика M01–M35 | **FROZEN** |
| Русский язык R01–R25 | **FROZEN** |
| Окружающий мир W01–W25 | **FROZEN** |
| Литературное чтение L01–L24 | **FROZEN** |
| Английский язык E01–E18 | **FROZEN** |
| Progress / Mastery / Adaptive | **Этап 14** — история попыток ? mastery ? weak |
| Subject-aware training | mathematics / russian / world / reading / english |
| Typecheck / build | Проходят |
| Capacitor / `android/` | Присутствуют |

**Прогресс (Этап 14):**
- Source of truth: `Attempt` history (`localAttemptRecorder` / localStorage)
- Mastery: `calculateSkillMastery` (0–100, `new` ? weak)
- Adaptive weak: cold-start по trainingWeight; с историей — weakness + review
- SubjectPage / TrainResult: реальные данные по всем 5 предметам
- Scripts: `test:progress`, `test:mastery`, `test:adaptive`, `test:attempt-history`

**Цепочка:**

```text
Answer ? Checker ? AttemptRecorder ? History ? Mastery ? Adaptive / UI
```

### Ещё не завершено

- Полноценный exam/ВПР-режим (таймер, оценка)
- Сервер / облачная синхронизация
- Android production/store readiness не объявлена

M36+, R26+, W26+, L25+, E19+ **не создаются** без отдельного решения.

---

## Документация

| Файл | Назначение |
|------|------------|
| `VPR_4_CLASS_2027_PRODUCT_SPEC.md` | Продуктовое ТЗ |
| `CONTENT_MATRIX_MATH.md` | Математика M01–M35 FROZEN |
| `CONTENT_MATRIX_RUSSIAN.md` | Русский R01–R25 FROZEN |
| `CONTENT_MATRIX_WORLD.md` | Окружающий мир W01–W25 FROZEN |
| `CONTENT_MATRIX_LITERARY_READING.md` | Литературное чтение L01–L24 |
| `CONTENT_MATRIX_ENGLISH.md` | Английский язык E01–E18 |
| `MASTERY_SPEC.md` | Освоение навыков |

---

## Запуск

```bash
npm install
npm run dev
```

Проверки прогресса:

```bash
npm run test:progress
npm run test:mastery
npm run test:adaptive
npm run test:attempt-history
npm run typecheck
npm run build
```
