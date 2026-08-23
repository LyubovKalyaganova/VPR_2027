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
| Английский язык E01–E18 | **реализовано** — generators, pool, weighted selection |
| Subject-aware training | mathematics / russian / world / reading / english |
| Typecheck / build | Проходят |
| Capacitor / `android/` | Присутствуют |

**Английский язык (`subject: english`):**
- Каталог: **E01–E18** (не E19+)
- ВПР coverage: **4/4** host tasks (25 pts)
- Training pool: 108 задач (18?3?2)
- Audio: TTS en-GB, `listenLimit: 2`
- Writing: training analog K1/K2 (не экспертная проверка)
- UI: `/train?subject=english`

**Литературное чтение (`subject: reading`):**
- Каталог: **L01–L24**
- ВПР coverage: **13/13** host skills
- Training pool: 144 задачи (24?3?2)
- Режимы: quick / normal / random / weak / topic
- UI: `/train?subject=reading`

**Цепочка тренировки:**

```text
SKILL_WEIGHTS ? recommendSessionSkillMix ? generators ? TaskEngine ? session
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

Проверки:

```bash
npm run typecheck
npm run build
npm run test:english-generators
npm run test:english-coverage
npm run test:english-training-selection
npm run test:english-bank-audit
npm run test:literary-reading-generators
npm run test:literary-reading-coverage
npm run test:literary-reading-training-selection
npm run test:literary-reading-bank-audit
npm run test:world-bank-audit
npm run test:russian-bank-audit
npm run test:math-training-selection
```
