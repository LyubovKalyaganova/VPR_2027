# ВПР 4 класс 2027

Образовательное приложение для подготовки учеников 4 класса к ВПР.

Стек: React + TypeScript + Vite. Локальное хранение прогресса (без сервера). Android-оболочка через Capacitor подготовлена в репозитории.

---

## Текущее состояние (фактическое)

Проект начинался как **Этап 1: Web-каркас** интерфейса. С тех пор значительно продвинут.

### Готово

| Область | Статус |
|--------|--------|
| Web-приложение | Работает (`npm run dev` / `npm run build`) |
| Математика M01–M35 | **FROZEN** — каталог закрыт, `MATH_SKILL_COUNT = 35` |
| Генераторы M01–M35 | Есть для всех 35 навыков + self-check |
| Математический training pool | Подключён: ~220 задач (10 статических + 210 сгенерированных) |
| skillId в банке | Все 35 навыков представлены |
| Weighted training | Подключён к реальным сессиям |
| Typecheck / build | Проходят |
| Capacitor / `android/` | Присутствуют как часть архитектуры |

**Цепочка математической тренировки (подтверждена):**

```text
MATH_SKILL_WEIGHTS
  ? recommendSessionSkillMix
  ? selectWeightedMathSessionTasks / adaptive cold-start
  ? TaskEngine.createSession
  ? задания ребёнку
```

Проверенные режимы: `quick`, `normal`, `random`, `weak` (cold-start и с историей), `topic`.  
Режим `exam` в UI пока отключён (заглушка).

Особые навыки (без расширения каталога за M35):

- **M29** — составные задачи + ход решения (`full` / `first` / `next` / `error` / `choose_solution`)
- **M26** — одношаговые задачи, производительность; доли как EXTENSION
- **M17** — 2D/пространственные тела, `spatial_read`, выбор схемы/чертежа

**M36+ не создаются.** Математическую матрицу без отдельного решения не расширять.

### Ещё не завершено

- Русский язык, окружающий мир, литературное чтение, английский — предметные матрицы и генераторы
- Полноценный exam/ВПР-режим по предметам
- Сервер / облачная синхронизация (их нет и не требуется для текущего локального MVP)
- Финальная сборка и полевое тестирование Android APK/AAB как «готового магазинного» приложения

Весь продукт целиком **не** считается завершённым: закрыт математический блок, остальные предметы — впереди.

---

## Документация

| Файл | Назначение |
|------|------------|
| `VPR_4_CLASS_2027_PRODUCT_SPEC.md` | Продуктовое ТЗ (целевое видение) |
| `CONTENT_MATRIX_MATH.md` | Замороженная матрица математики M01–M35 |
| `MASTERY_SPEC.md` | Освоение навыков, интервалы повторения |
| `M01_GENERATOR_SPEC.md` … `M35_GENERATOR_SPEC.md` | Контракты генераторов |

Матрицы других предметов (`CONTENT_MATRIX_RUSSIAN.md` и т.д.) по ТЗ ещё предстоит создать.

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
npm run test:math-weights
npm run test:math-training-selection
npm run test:m01-generator   # … аналогично test:m02 … test:m35
```

---

## Структура (кратко)

- `src/features/mathematics/` — генераторы, веса, selection
- `src/services/` — `taskRepository`, adaptive selector, mastery, daily plan
- `src/store/` — тренировочные сессии
- `src/engine/` — TaskEngine, checkers
- `android/`, `capacitor.config.ts` — оболочка Capacitor
