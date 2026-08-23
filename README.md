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
| Окружающий мир W01–W25 | **FROZEN** — generators, pool, weighted selection |
| Subject-aware training | mathematics / russian / world через `/train?subject=` |
| Typecheck / build | Проходят |
| Capacitor / `android/` | Присутствуют как часть архитектуры |

**Цепочка тренировки (math / russian / world):**

```text
SKILL_WEIGHTS ? recommendSessionSkillMix ? generators ? TaskEngine ? session
```

Режимы world: `quick` (5), `normal` (10), `random` (10), `weak`, `topic`.  
Math-only: `review`, `daily`, `mistakes`. Режим `exam` — заглушка.

### Ещё не завершено

- Литературное чтение, английский — предметные матрицы и генераторы
- Полноценный exam/ВПР-режим по предметам (таймер, оценка)
- Сервер / облачная синхронизация (не требуется для локального MVP)
- Android production/store readiness не объявлена

M36+, R26+, W26+ **не создаются** без отдельного решения.

---

## Документация

| Файл | Назначение |
|------|------------|
| `VPR_4_CLASS_2027_PRODUCT_SPEC.md` | Продуктовое ТЗ |
| `CONTENT_MATRIX_MATH.md` | Математика M01–M35 FROZEN |
| `CONTENT_MATRIX_RUSSIAN.md` | Русский R01–R25 FROZEN |
| `CONTENT_MATRIX_WORLD.md` | Окружающий мир W01–W25 FROZEN |
| `MASTERY_SPEC.md` | Освоение навыков, интервалы повторения |

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
```
