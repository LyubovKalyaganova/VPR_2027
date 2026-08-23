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
| Литературное чтение L01–L24 | **реализовано** — generators, pool, weighted selection |
| Subject-aware training | mathematics / russian / world / reading |
| Typecheck / build | Проходят |
| Capacitor / `android/` | Присутствуют |

**Литературное чтение (`subject: reading`):**
- Каталог: **L01–L24** (не L25+)
- ВПР coverage: **13/13** host skills
- Training pool: 144 задачи (24?3?2)
- Режимы: quick / normal / random / weak / topic
- UI: `/train?subject=reading`
- Развёрнутые задания ВПР 3, 6, 13 — **training analog**, не экспертная проверка свободного ответа

**Цепочка тренировки:**

```text
SKILL_WEIGHTS ? recommendSessionSkillMix ? generators ? TaskEngine ? session
```

### Ещё не завершено

- Английский — предметная матрица и генераторы
- Полноценный exam/ВПР-режим (таймер, оценка)
- Сервер / облачная синхронизация
- Android production/store readiness не объявлена

M36+, R26+, W26+, L25+ **не создаются** без отдельного решения.

---

## Документация

| Файл | Назначение |
|------|------------|
| `VPR_4_CLASS_2027_PRODUCT_SPEC.md` | Продуктовое ТЗ |
| `CONTENT_MATRIX_MATH.md` | Математика M01–M35 FROZEN |
| `CONTENT_MATRIX_RUSSIAN.md` | Русский R01–R25 FROZEN |
| `CONTENT_MATRIX_WORLD.md` | Окружающий мир W01–W25 FROZEN |
| `CONTENT_MATRIX_LITERARY_READING.md` | Литературное чтение L01–L24 |
| `MASTERY_SPEC.md` | Освоение навыков |

---

## Запуск

```bash
npm install
npm run dev
```

Проверки:

```bash
npm run typecheck
npm run build
npm run test:math-training-selection
npm run test:russian-generators
npm run test:russian-coverage
npm run test:russian-training-selection
npm run test:world-generators
npm run test:world-coverage
npm run test:world-training-selection
npm run test:world-bank-audit
npm run test:literary-reading-generators
npm run test:literary-reading-coverage
npm run test:literary-reading-training-selection
npm run test:literary-reading-bank-audit
```
