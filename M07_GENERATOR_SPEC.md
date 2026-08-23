# M07 GENERATOR SPEC
## Программный генератор деления с остатком

Версия документа: 1.0  
Статус: TECHNICAL CONTRACT  
Дата: 2026-08-22

| Поле | Значение |
|---|---|
| Навык | M07 |
| Канонический `skillId` | `math.calculation.mul_div.division_remainder` |
| Название | Деление с остатком |
| Генератор | `gen.math.mul_div.division_remainder` |
| Источник | `generated` |
| Текущая задача | генерация уровней 1–3 |
| Уровни 4–5 | пока не генерируются программно |

Краткий код `M07` не является `skillId`.

Источник педагогических границ: карточка M07 в `CONTENT_MATRIX_MATH.md` (версия 2.0, заморожена). Этот документ не заменяет матрицу и не расширяет каталог M01–M35.

Карточка M07:

- проверяем умение найти **неполное частное и остаток** и проверить: остаток меньше делителя;
- подтипы матрицы: найти частное и остаток; проверить верность готового деления; подобрать наибольшее делимое с данным остатком; сюжетный остаток (не M28);
- L1: малые числа, остаток очевиден;
- L2: типовое деление с остатком;
- L3: остаток «рядом» с делителем, легко сделать остаток ≥ делителя;
- L4: формат ВПР; L5: два вопроса + проверка — **не генерируются**.

Канонический `skillId` и `generatorId` — из матрицы/таксономии  
(`math.calculation.mul_div.division_remainder`, `gen.math.mul_div.division_remainder`),  
а не произвольные черновые строки вроде `…division.with_remainder`.

Публичный API (как у M03–M06):

- `generateM07Task({ difficulty, seed, subtype? })`
- `generateM07Series({ seed, countPerLevel? })`

Тип задания: существующий `Task`.

---

# 1. Назначение

Проверять умение делить **с остатком** в пределах 4 класса:

- найти неполное частное и остаток;
- понимать правило `0 < remainder < divisor`;
- проверять равенство `dividend = divisor × quotient + remainder`;
- не путать частное и остаток;
- на L3 — не допускать ошибку «остаток ≥ делителя».

Каждое задание обязано удовлетворять:

```text
remainder > 0
remainder < divisor
dividend === divisor * quotient + remainder
dividend % divisor === remainder
Math.floor(dividend / divisor) === quotient
dividend > divisor
```

`remainder === 0` **запрещён** (это M06).

---

# 2. Граница M06 / M07

| M06 | M07 |
|---|---|
| деление **нацело** | деление **с остатком** |
| `math.calculation.mul_div.division` | `math.calculation.mul_div.division_remainder` |
| итоговый `remainder === 0` | итоговый `remainder > 0` |

## 2.1. Два разных «остатка»

| Термин | Смысл | Для M07 |
|---|---|---|
| `remainder` | **Итоговый** остаток: `dividend % divisor` | **всегда > 0** и **< divisor** |
| `intermediateRemainder` | промежуточный остаток на шаге письменного деления | может присутствовать; **не** является ответом M07 |

Основной ответ M07 — пара **(частное, итоговый остаток)**.  
Промежуточные остатки можно отражать в `features` / `generatorParams`, но не подменять ими `remainder`.

Не генерировать: деление нацело, дроби, уравнения, полноценные текстовые задачи M28.

---

# 3. Порядок генерации

1. Выбрать уровень и подтип.
2. Зафиксировать структуру: `divisor`, `quotient`, `remainder` (с правилом уровня для остатка).
3. Построить `dividend = divisor * quotient + remainder`.
4. Независимо проверить тождества и `isValidM07Level`.
5. Принять или отбросить.

Неправильно: случайное делимое → посчитать остаток → назвать уровнем.

---

# 4. Классификация остатка

Функции уровня опираются на класс итогового остатка:

- **near** (ловушка L3): `remainder === divisor - 1`  
  или (`remainder === divisor - 2` **и** `divisor >= 5`).
- **not near**: любой допустимый остаток, не попадающий в near.
- **obvious** (для L1): `not near` и `remainder <= floor((divisor - 1) / 2)`.

Примеры для делителя 7:

- obvious: 1, 2, 3;
- mid (L2): 4;
- near: 5, 6.

---

# 5. Формат ответа

Задание всегда спрашивает **и частное, и остаток**.

Текст условия:  
`Раздели с остатком: A ÷ B. Найди неполное частное и остаток.`

Каноническая запись ответа (строка):

```text
частное Q, остаток R
```

Пример: `частное 4, остаток 2`.

- L1 и L2: `singleChoice`, 4 варианта в том же формате.
- L3: `numberAnswer`, `correctAnswer` — та же строка.

Правильный ответ вычисляется программно:  
`quotient = Math.floor(dividend / divisor)`,  
`remainder = dividend % divisor`.  
Поля в `generatorParams` — справочные, не источник истины.

---

# 6. Уровень 1

Цель карточки: **малые числа, остаток очевиден**.

Структура:

- делимое **двузначное** (10–99);
- делитель ∈ [2, 9];
- частное ∈ [1, 9];
- остаток **очевиден** (класс obvious);
- `dividend > divisor`;
- `remainder > 0`.

Подтип: `small_obvious`.

Примеры: `17 ÷ 5` → частное 3, остаток 2; `26 ÷ 8` → 3 ост. 2; `35 ÷ 6` → 5 ост. 5 недопустимо (near).

Не создавать как L1: трёхзначные делимые; `remainder === 0`; near-остаток.

Инженерная проверка L1:

- `digitCount(dividend) === 2`;
- `divisor ∈ [2, 9]`, `quotient ∈ [1, 9]`;
- remainder в классе obvious;
- тождества деления с остатком;
- не проходит L2 и L3.

---

# 7. Уровень 2

Цель карточки: **типовое деление с остатком**.

Структура:

- делимое **3–4 знака**;
- делитель ∈ [2, 9];
- частное ≥ 10;
- остаток **not near**;
- для дополнительного «типового» ощущения при `divisor >= 5` предпочтителен mid-остаток  
  (`floor((divisor - 1) / 2) < remainder < divisor - 1`), но достаточно любого not near;
- нули внутри делимого допускаются.

Подтипы:

- `typical_written` — без нуля в делимом;
- `with_zero_in_dividend` — есть цифра 0 в делимом.

Примеры: `125 ÷ 4` → 31 ост. 1; `1307 ÷ 6` → … с not-near остатком.

Не создавать: двузначное делимое; `remainder === 0`; near-остаток (L3).

Инженерная проверка L2:

- делимое 3–4 знака, делитель 2–9, частное ≥ 10;
- remainder not near, remainder > 0;
- не проходит L1 и L3.

---

# 8. Уровень 3

Цель карточки: **остаток рядом с делителем** — легко ошибочно получить остаток ≥ делителя.

Структура:

- делитель ∈ [3, 9] (делитель 2 не даёт выразительной near-ловушки);
- remainder в классе **near**;
- делимое 2–4 знака, `dividend > divisor`;
- частное ≥ 2;
- типично 3–4-значное делимое, но двузначное near допустимо как компактная ловушка.

Подтипы:

- `near_divisor` — основная ловушка «остаток почти делитель»;
- `largest_with_remainder` — число N есть наибольшее k-значное с данным near-остатком R при делении на D; условие явно говорит об этом.

Примеры: `47 ÷ 5` → частное 9, остаток 4 (near); `999 ÷ 8` как наибольшее 3-значное с остатком 7.

Не создавать: `remainder === 0`; not-near как единственный фактор без near.

Инженерная проверка L3:

- remainder near;
- `divisor ∈ [3, 9]`;
- тождества верны;
- не проходит L1 и L2.

---

# 9. Подтипы и features

| subtype | Уровень | Структура |
|---|---|---|
| `small_obvious` | L1 | 2 знака, obvious remainder; делитель чаще 5–9 |
| `typical_written` | L2 | 3–4 знака, not near, без 0 в делимом |
| `with_zero_in_dividend` | L2 | 3–4 знака, not near, нуль в делимом |
| `near_divisor` | L3 | near remainder |
| `largest_with_remainder` | L3 | near + наибольшее k-значное делимое; явная формулировка |

L1 не должен систематически выдавать `remainder === 1`: равномерно выбирать из класса obvious при делителе ≥ 5.

`features` (без дубля главного subtype):

- `near_remainder` — итоговый remainder в классе near
- `obvious_remainder` — класс obvious
- `multi_step` — частное ≥ 10
- `zero_inside_dividend`
- `intermediate_remainder` — был промежуточный остаток на шаге (информативно)
- `mixed_digits`
- `remainder_one` — `remainder === 1`
- `remainder_max` — `remainder === divisor - 1`

---

# 10. generatorParams

```text
dividend
divisor
quotient
remainder                     // ТОЛЬКО итоговый остаток; для M07 всегда > 0
digitCounts                   // [делимое, делитель]
hasZeros
hasIntermediateRemainder      // опциональный факт письменного деления
intermediateRemainderCount
subtype
features
seed
```

Новые поля в `Task` не добавляются.

---

# 11. Проверка корректности

После сборки:

- `remainder > 0` и `remainder < divisor`;
- `dividend === divisor * quotient + remainder`;
- `dividend % divisor === remainder`;
- `Math.floor(dividend / divisor) === quotient`;
- факты уровня = `isValidM07Level`;
- subtype соответствует фактам;
- нет `remainder === 0`.

Функция `isValidM07Level(dividend, divisor, difficulty)` независимо классифицирует уровень.

---

# 12. Дистракторы

L1–L2: `singleChoice`, 4 уникальных варианта формата `частное Q, остаток R`.

Приоритет ошибок:

1. забыли остаток → подмена на «частное Q, остаток 0» (отклоняется правилами M07 как ответ ученика, но как дистрактор допустим);
2. перепутали частное и остаток (если оба правдоподобны);
3. неверное частное ±1 при том же остатке / пересчитанном;
4. верное частное, остаток `remainder + 1` вплоть до `>= divisor`;
5. `divisor * quotient` забыли добавить остаток в проверке → другое частное;
6. остаток = divisor (недопустимый);
7. ошибка сноса / соседнее частное.

Не подставлять бессмысленные `+100` без модели ошибки.  
Ровно один правильный вариант.

---

# 13. Дубликаты

Fingerprint: `dividend÷divisor`.

В серии одинаковая пара не повторяется.

---

# 14. Seed

Только `seededRng`. Не `Math.random()`.  
Одинаковые `seed + difficulty + subtype` → одно задание.  
Одинаковый seed серии → одна серия.

---

# 15. Формат Task

- `skillId = math.calculation.mul_div.division_remainder`
- `subject = mathematics`
- `sourceType = generated`
- `generatorId = gen.math.mul_div.division_remainder`
- `topicId = math.calculation.mul_div`
- `difficulty = 1 | 2 | 3`

---

# 16. Уровни 4–5

Не генерировать.  
L4 — формат ВПР. L5 — два вопроса + проверка.  
`difficulty` 4 или 5 → контролируемая ошибка.

---

# 17. Серия и self-check

`generateM07Series`: по умолчанию 10+10+10, не попадает в `MATH_TASKS`.

Файл: `src/features/mathematics/generators/divisionWithRemainderGenerator.selfcheck.ts`  
Скрипт: `scripts/run-m07-generator-check.mjs`  
Команда: `npm run test:m07-generator`

Проверять skillId, уровни, sourceType, generatorId, тождества, remainder>0, remainder<divisor, дубли, Math.random, seed, взаимную исключаемость L1/L2/L3, отклонение L4/L5, граничные remainder=1 и remainder=divisor-1 в серии, все заявленные подтипы.

---

# 18. Критерии готовности

- спецификация согласована с карточкой M07;
- L1/L2/L3 структурно различны;
- ни одного `remainder === 0`;
- M03–M06 не затронуты;
- test:m03…m07, typecheck, build зелёные;
- UI и `MATH_TASKS` не изменены.

---

# 19. Что генератор не делает

- не меняет `CONTENT_MATRIX_MATH.md` и каталог M01–M35;
- не создаёт M08;
- не пишет задания в `MATH_TASKS`;
- не подключает UI;
- не вводит новые `skillId`.
