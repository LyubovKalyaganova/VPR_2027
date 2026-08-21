# CONTENT MATRIX — МАТЕМАТИКА 4 КЛАССА

Версия документа: 1.0  
Предмет: математика (`mathematics`)  
Источник: `VPR_4_CLASS_2027_PRODUCT_SPEC.md`  
Код приложения этим документом не изменяется.

---

## Статусы

Используются только четыре статуса:

| Статус | Значение |
|---|---|
| `DEFINED_BY_SPEC` | Явно сказано в ТЗ |
| `PROJECT_DECISION` | Проектное решение для приложения; это не формулировка ФИПИ и не официальная спецификация ВПР |
| `NEEDS_VPR_CHECK` | Нужна проверка по официальной спецификации / демоверсии ВПР-2027 |
| `PLANNED` | Запланировано ТЗ, в этой матрице ещё не заполнено |

Правило: если статус не `DEFINED_BY_SPEC`, запись нельзя выдавать за требование ВПР.

---

## 1. Назначение матрицы

Матрица — единый справочник:

**Математика 4 класса → раздел → тема → навык.**

Она нужна, чтобы задания, прогресс и рекомендации ссылались на одни и те же устойчивые сущности, а не на произвольные строки в карточках.

На матрицу будут опираться:

| Часть приложения | Зачем нужна матрица |
|---|---|
| Банк заданий | Каждое задание привязывается к разделу, теме и навыку |
| Генераторы | Один генератор производит варианты **одного** навыка (ТЗ §18, §38) |
| `taskRepository` | Выборка по теме, навыку, сложности, источнику |
| Прогресс | Проценты и карта предмета считаются по разделам/темам матрицы |
| `SkillMastery` | Ключ учёта — `skillId` матрицы, а не текст вопроса |
| Адаптивное обучение | Приоритет слабых навыков |
| Слабые места | Режим `weak` |
| Повторение | Режим `topic` и интервалы |
| Кабинет родителя | Рекомендации вида «задачи на движение», а не внутренние id |
| Пробная ВПР | Покрытие проверяемых умений после сверки со спецификацией |

ТЗ §39 также требует колонки ФОП НОО, УМК «Школа России», типы заданий ВПР и плановое число тренировочных заданий. Эти колонки в версии 1.0 **не заполнены**: соответствующих таблиц в ТЗ нет.

Статус блока ФОП/УМК: `PLANNED`.  
Статус типов и баллов ВПР: `NEEDS_VPR_CHECK`.

---

## 2. Правила идентификаторов

Код пока не меняется. Ниже только соглашение для будущей связки.

Формат:

```
math.<section>.<topic>.<skill>
```

Правила:

1. Только латиница, цифры и точка.
2. Нижний регистр, слова через `_`.
3. ID уникален в пределах приложения.
4. ID не зависит от названия на экране: заголовок можно переименовать, ID нельзя.
5. Три уровня после `math` соответствуют разделу, теме и навыку.
6. Короткий ID раздела: `math.calculation`.
7. Короткий ID темы: `math.calculation.multi_digit`.
8. Полный ID навыка: `math.calculation.multi_digit.addition`.

Примеры:

| Уровень | ID | Название на экране |
|---|---|---|
| Предмет | `mathematics` | Математика |
| Раздел | `math.word_problems` | Текстовые задачи |
| Тема | `math.word_problems.motion` | Задачи на движение |
| Навык | `math.word_problems.motion.distance` | Нахождение расстояния |

Не использовать в ID формулировку задания, сложность и тип вопроса. Переход через разряд, разрядность и «с нулями» — параметры генератора, не отдельные навыки.

`PROJECT_DECISION`: формат ID выбран проектом; в ТЗ формат идентификаторов не задан.

---

## 3. Иерархия

ТЗ §4 фиксирует:

```
Предмет → Раздел → Тема → Навык → Тип задания → Сложность → Тренировочные задания
```

| Уровень | Что это | Что это не является |
|---|---|---|
| Предмет | Математика | Тема урока |
| Раздел | Крупный блок карты предмета | Одно умение |
| Тема | Устойчивый учебный участок внутри раздела | Конкретный пример (`234 + 125`) |
| Навык | Проверяемое умение, по которому считается `SkillMastery` | Уровень сложности, тип UI-вопроса, параметр генератора |
| Тип задания | Способ ответа (`numberAnswer`, `singleChoice`, …) | Содержание умения |
| Сложность | Шкала 1–5 из ТЗ §5 | Отдельный навык |

Единственный полный пример иерархии в ТЗ (§4):

```
Математика
→ Текстовые задачи          (раздел)
→ Задачи на движение        (тема)
→ Нахождение расстояния     (навык)
→ Задание ВПР               (тип)
→ Средний уровень           (сложность)
```

### Как прочитан плоский список §18

В §18 блоки перечислены **плоско**. Что из них раздел, а что тема, ТЗ не расписывает, кроме примера про движение.

В §10 карта предмета показывает восемь подписей: Вычисления, Порядок действий, Величины, Геометрия, Таблицы, Текстовые задачи, Движение, Логика. «Движение» там стоит рядом с «Текстовые задачи», а в §4 движение — **тема внутри** текстовых задач.

`PROJECT_DECISION`: каноническая иерархия — §4. Пункты карты §10 — подписи для ребёнка, не отдельный справочник разделов. «Движение» в матрице — тема, не раздел.

`PROJECT_DECISION`: блоки «единицы измерения», «время», «масса», «длина», «площадь», «стоимость», «скорость» вложены в раздел «Величины». В ТЗ они соседи, не дети.

`PROJECT_DECISION`: «периметр», «площадь фигур», «симметрия» вложены в «Геометрию».

`PROJECT_DECISION`: «таблицы» и «диаграммы» объединены в один раздел `math.data`. На карте §10 есть только «Таблицы».

«Площадь» (§18) и «площадь фигур» (§18) различаются:

- `math.quantities.area` — величина и единицы;
- `math.geometry.figure_area` — вычисление площади фигуры.

«Скорость» как единицы — в величинах; применение в сюжете — в задачах на движение.

---

## 4. Карта математики

Предмет: **Математика**  
`subject = mathematics`  
Статус предмета: `DEFINED_BY_SPEC` (ТЗ §3, §18)

Сводка разделов:

| ID раздела | Название | Основание | Статус |
|---|---|---|---|
| `math.calculation` | Вычисления | §10, §18 | `DEFINED_BY_SPEC` |
| `math.order_of_operations` | Порядок действий | §10, §18 | `DEFINED_BY_SPEC` |
| `math.quantities` | Величины | §10, §18 | `DEFINED_BY_SPEC` |
| `math.geometry` | Геометрия | §10, §18 | `DEFINED_BY_SPEC` |
| `math.data` | Таблицы и диаграммы | §18 таблицы + диаграммы; §10 только таблицы | `PROJECT_DECISION` |
| `math.word_problems` | Текстовые задачи | §4, §10, §18 | `DEFINED_BY_SPEC` |
| `math.logic` | Логические задачи | §10 «Логика», §18 «логические задачи» | `DEFINED_BY_SPEC` |

Итого разделов: **7**.

Ниже для каждого раздела: темы, пробел по навыкам, затем **минимальный** набор навыков. Искусственная дробность («сложение без перехода», «сложение с переходом в единицах») в матрицу **не входит**: это параметры генератора и сложность, не навыки.

Допустимые `TaskType` — только уже существующие в коде. `audio` для математики не назначается.

Рекомендуемая сложность 1–5 — не официальная раскладка ВПР.

Связь с ВПР по всем строкам, пока нет спецификации 2027: `NEEDS_VPR_CHECK`.

Готовность контента:

| Статус | Смысл |
|---|---|
| `none` | Заданий этого навыка в банке нет |
| `seed` | Есть только учебный задел (текущие 10 заданий по вычислениям) |
| `empty_planned` | Навык нужен приложению, банка ещё нет |

---

### 4.1. Раздел `math.calculation` — Вычисления

Название раздела: `DEFINED_BY_SPEC`.

**Пробел.** ТЗ не даёт каталога навыков вычислений. Есть только пример генератора: тип «сложение многозначных чисел», разрядность 4, сложность 2 (§18). Умножение и деление в §18 **не названы**.

Темы:

| ID темы | Название | Статус | Комментарий |
|---|---|---|---|
| `math.calculation.multi_digit` | Сложение и вычитание многозначных чисел | `PROJECT_DECISION` | Опирается на пример генератора §18; вычитание в примере не названо, добавлено как парное действие |
| `math.calculation.mul_div` | Умножение и деление | `PROJECT_DECISION` | В §18 блока нет. Нужно для 4 класса, но это не требование ТЗ. Включение в ВПР: `NEEDS_VPR_CHECK` |

Минимальные навыки:

| ID навыка | Название | Статус навыка | TaskType | Сложность | ВПР | Контент |
|---|---|---|---|---|---|---|
| `math.calculation.multi_digit.addition` | Сложение многозначных чисел | `DEFINED_BY_SPEC` как тип генератора; как навык матрицы — `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 1–3 тренировка (`PROJECT_DECISION`); 4–5 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `seed` (текущий банк близок к этому навыку, но записан свободными строками) |
| `math.calculation.multi_digit.subtraction` | Вычитание многозначных чисел | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4–5 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `seed` |
| `math.calculation.mul_div.multiplication` | Умножение | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4–5 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.calculation.mul_div.division` | Деление | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4–5 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |

Параметры генератора (не навыки): разрядность, переход через разряд, нули в записи, число слагаемых. Статус: `PROJECT_DECISION`, кроме разрядности и сложности из примера §18 (`DEFINED_BY_SPEC` как поля примера).

---

### 4.2. Раздел `math.order_of_operations` — Порядок действий

Название раздела: `DEFINED_BY_SPEC`.

**Пробел.** Темы и навыки внутри блока ТЗ не задаёт.

| ID темы | Название | Статус |
|---|---|---|
| `math.order_of_operations.expressions` | Выражения с несколькими действиями | `PROJECT_DECISION` |

| ID навыка | Название | Статус | TaskType | Сложность | ВПР | Контент |
|---|---|---|---|---|---|---|
| `math.order_of_operations.expressions.evaluate` | Вычисление значения выражения | `PROJECT_DECISION` | `numberAnswer`, `fillBlank`, `ordering` (`PROJECT_DECISION`) | 2–3 (`PROJECT_DECISION`); 4–5 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |

`ordering` — только если нужно упорядочить шаги, не вместо ответа-числа.

---

### 4.3. Раздел `math.quantities` — Величины

Название раздела: `DEFINED_BY_SPEC`.  
Вложение перечисленных ниже блоков: `PROJECT_DECISION`.

**Пробел.** ТЗ не определяет навыки (перевод единиц vs сюжетная задача vs чтение часов).

Темы — названия из §18:

| ID темы | Название | Статус названия | Статус вложения |
|---|---|---|---|
| `math.quantities.units` | Единицы измерения | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.quantities.time` | Время | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.quantities.mass` | Масса | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.quantities.length` | Длина | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.quantities.area` | Площадь | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.quantities.cost` | Стоимость | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.quantities.speed` | Скорость | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |

Минимальные навыки — по одному на тему:

| ID навыка | Название | Статус | TaskType | Сложность | ВПР | Контент |
|---|---|---|---|---|---|---|
| `math.quantities.units.convert` | Перевод и сравнение единиц | `PROJECT_DECISION` | `matching`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.quantities.time.calculate` | Расчёт времени | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.quantities.mass.calculate` | Масса: перевод и расчёт | `PROJECT_DECISION` | `matching`, `numberAnswer`, `singleChoice` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.quantities.length.calculate` | Длина: перевод и расчёт | `PROJECT_DECISION` | `matching`, `numberAnswer`, `singleChoice` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.quantities.area.convert` | Площадь как величина | `PROJECT_DECISION` | `matching`, `numberAnswer`, `singleChoice` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.quantities.cost.calculate` | Стоимость | `PROJECT_DECISION` | `numberAnswer`, `singleChoice` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.quantities.speed.convert` | Скорость как величина | `PROJECT_DECISION` | `matching`, `numberAnswer`, `singleChoice` (`PROJECT_DECISION`) | 2–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |

Сюжет «найти расстояние по скорости и времени» **не** дублируется здесь; он относится к `math.word_problems.motion`.

---

### 4.4. Раздел `math.geometry` — Геометрия

Название раздела: `DEFINED_BY_SPEC`.  
Вложение периметра, площади фигур и симметрии: `PROJECT_DECISION`.

**Пробел.** Виды фигур, сетка, чертёж, единицы см/см² ТЗ не задаёт.

| ID темы | Название | Статус названия | Статус вложения |
|---|---|---|---|
| `math.geometry.perimeter` | Периметр | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.geometry.figure_area` | Площадь фигур | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |
| `math.geometry.symmetry` | Симметрия | `DEFINED_BY_SPEC` | `PROJECT_DECISION` |

| ID навыка | Название | Статус | TaskType | Сложность | ВПР | Контент |
|---|---|---|---|---|---|---|
| `math.geometry.perimeter.calculate` | Нахождение периметра | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `imageTask` | 1–3 (`PROJECT_DECISION`); `imageTask` и уровень 4: `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.geometry.figure_area.calculate` | Нахождение площади фигуры | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `imageTask` | 2–3 (`PROJECT_DECISION`); `imageTask` и уровень 4: `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.geometry.symmetry.identify` | Распознавание симметрии | `PROJECT_DECISION` | `singleChoice`, `classification`, `imageTask` | 1–3 (`PROJECT_DECISION`); `imageTask` и уровень 4: `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |

---

### 4.5. Раздел `math.data` — Таблицы и диаграммы

Статус раздела: `PROJECT_DECISION` (объединение двух блоков §18).

**Пробел.** Виды диаграмм, число вопросов к одной таблице, связь «один объект — несколько заданий» ТЗ для математики не задаёт (такой принцип есть у чтения, §20).

| ID темы | Название | Статус |
|---|---|---|
| `math.data.tables` | Таблицы | `DEFINED_BY_SPEC` как блок |
| `math.data.charts` | Диаграммы | `DEFINED_BY_SPEC` как блок |

| ID навыка | Название | Статус | TaskType | Сложность | ВПР | Контент |
|---|---|---|---|---|---|---|
| `math.data.tables.read` | Чтение таблицы | `PROJECT_DECISION` | `tableTask`, `singleChoice`, `numberAnswer` (`PROJECT_DECISION`) | 1–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.data.charts.read` | Чтение диаграммы | `PROJECT_DECISION` | `imageTask`, `tableTask`, `singleChoice`, `numberAnswer` | 2–3 (`PROJECT_DECISION`); тип картинки и уровень 4: `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |

---

### 4.6. Раздел `math.word_problems` — Текстовые задачи

Название раздела: `DEFINED_BY_SPEC`.  
Тема «Задачи на движение»: `DEFINED_BY_SPEC` (§4, §18).  
Навык «Нахождение расстояния»: `DEFINED_BY_SPEC` (§4).

**Пробел.** Другие навыки движения (время, скорость) ТЗ не называет. Общие текстовые задачи без движения — отдельный блок §18 без внутренних умений. «Средний уровень» в примере §4 **не сопоставлен** шкале 1–5.

| ID темы | Название | Статус |
|---|---|---|
| `math.word_problems.general` | Текстовые задачи | `DEFINED_BY_SPEC` как блок; как тема внутри раздела — `PROJECT_DECISION` |
| `math.word_problems.motion` | Задачи на движение | `DEFINED_BY_SPEC` |

| ID навыка | Название | Статус | TaskType | Сложность | ВПР | Контент |
|---|---|---|---|---|---|---|
| `math.word_problems.general.solve` | Решение текстовой задачи | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `shortAnswer`, `constructedResponse` | 2–3 (`PROJECT_DECISION`); `constructedResponse` и уровень 4: `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.word_problems.motion.distance` | Нахождение расстояния | `DEFINED_BY_SPEC` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`; в ТЗ указано только «Задание ВПР») | «средний» в §4 не равен числу 1–5 → 2–3 как `PROJECT_DECISION`; 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.word_problems.motion.time` | Нахождение времени | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 2–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |
| `math.word_problems.motion.speed` | Нахождение скорости | `PROJECT_DECISION` | `numberAnswer`, `singleChoice`, `fillBlank` (`PROJECT_DECISION`) | 2–3 (`PROJECT_DECISION`); 4 `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |

Навыки времени и скорости предложены только потому, что иначе тему «движение» нельзя тренировать как систему трёх величин. Это не цитата ТЗ.

---

### 4.7. Раздел `math.logic` — Логические задачи

Название раздела: `DEFINED_BY_SPEC`.

**Пробел.** Виды логических задач, навыки и типы ТЗ не задаёт.

| ID темы | Название | Статус |
|---|---|---|
| `math.logic.problems` | Логические задачи | `PROJECT_DECISION` (тема = название блока) |

| ID навыка | Название | Статус | TaskType | Сложность | ВПР | Контент |
|---|---|---|---|---|---|---|
| `math.logic.problems.solve` | Решение логической задачи | `PROJECT_DECISION` | `singleChoice`, `classification`, `ordering`, `constructedResponse` | 2–3 (`PROJECT_DECISION`); развёрнутый ответ и уровень 4: `NEEDS_VPR_CHECK` | `NEEDS_VPR_CHECK` | `none` |

Детализация видов логики: `PLANNED`.

---

### 4.8. Сводка карты

| Раздел | Тем | Навыков |
|---|---|---|
| Вычисления | 2 | 4 |
| Порядок действий | 1 | 1 |
| Величины | 7 | 7 |
| Геометрия | 3 | 3 |
| Таблицы и диаграммы | 2 | 2 |
| Текстовые задачи | 2 | 4 |
| Логические задачи | 1 | 1 |
| **Всего** | **18** | **22** |

Из 22 навыков явно назван в ТЗ один: `math.word_problems.motion.distance`.  
`math.calculation.multi_digit.addition` опирается на пример генератора, но как навык справочника это всё же проектная фиксация.

Не включено намеренно (нет в §18, не выдумываем темы): дроби и доли, числа с запятой как отдельный раздел, уравнения, доли величины, комбинаторика, объём, углы. Нужны ли они — вопрос к ФОП и ВПР, см. §11.

Колонки ТЗ §39 (ФОП НОО, УМК «Школа России», число тренировочных заданий, типы номеров ВПР): `PLANNED` / `NEEDS_VPR_CHECK`. В версии 1.0 не заполняются.

---

## 5. Типы заданий

Существующие `TaskType` (код менять нельзя, новые типы не вводить):

`singleChoice`, `multipleChoice`, `shortAnswer`, `numberAnswer`, `matching`, `ordering`, `classification`, `fillBlank`, `audio`, `constructedResponse`, `imageTask`, `tableTask`.

Правила:

1. Тип — способ ответа, не навык.
2. Несколько типов на один навык допустимы.
3. `audio` для математики не используется. Если официальная ВПР потребует иное: `NEEDS_VPR_CHECK`.
4. «Задание ВПР» в примере §4 — не элемент `TaskType`. Официальный формат номера: `NEEDS_VPR_CHECK`. Для поля `vprTaskType` пока нет справочника.
5. Назначение типов ниже — `PROJECT_DECISION`, пока нет демоверсии 2027.

| ID навыка | Допустимые типы | Не использовать без проверки | Статус |
|---|---|---|---|
| `math.calculation.multi_digit.addition` | `numberAnswer`, `singleChoice`, `fillBlank` | `audio`, `imageTask`, `tableTask` | `PROJECT_DECISION` |
| `math.calculation.multi_digit.subtraction` | `numberAnswer`, `singleChoice`, `fillBlank` | `audio` | `PROJECT_DECISION` |
| `math.calculation.mul_div.multiplication` | `numberAnswer`, `singleChoice`, `fillBlank` | `audio` | `PROJECT_DECISION` |
| `math.calculation.mul_div.division` | `numberAnswer`, `singleChoice`, `fillBlank` | `audio` | `PROJECT_DECISION` |
| `math.order_of_operations.expressions.evaluate` | `numberAnswer`, `fillBlank`, `ordering` | `audio` | `PROJECT_DECISION` |
| `math.quantities.units.convert` | `matching`, `singleChoice`, `fillBlank` | `audio` | `PROJECT_DECISION` |
| `math.quantities.time.calculate` | `numberAnswer`, `singleChoice`, `fillBlank` | `audio` | `PROJECT_DECISION` |
| `math.quantities.mass.calculate` | `matching`, `numberAnswer`, `singleChoice` | `audio` | `PROJECT_DECISION` |
| `math.quantities.length.calculate` | `matching`, `numberAnswer`, `singleChoice` | `audio` | `PROJECT_DECISION` |
| `math.quantities.area.convert` | `matching`, `numberAnswer`, `singleChoice` | `audio` | `PROJECT_DECISION` |
| `math.quantities.cost.calculate` | `numberAnswer`, `singleChoice` | `audio` | `PROJECT_DECISION` |
| `math.quantities.speed.convert` | `matching`, `numberAnswer`, `singleChoice` | `audio` | `PROJECT_DECISION` |
| `math.geometry.perimeter.calculate` | `numberAnswer`, `singleChoice` | `imageTask` → `NEEDS_VPR_CHECK` | `PROJECT_DECISION` / `NEEDS_VPR_CHECK` |
| `math.geometry.figure_area.calculate` | `numberAnswer`, `singleChoice` | `imageTask` → `NEEDS_VPR_CHECK` | `PROJECT_DECISION` / `NEEDS_VPR_CHECK` |
| `math.geometry.symmetry.identify` | `singleChoice`, `classification` | `imageTask` → `NEEDS_VPR_CHECK` | `PROJECT_DECISION` / `NEEDS_VPR_CHECK` |
| `math.data.tables.read` | `tableTask`, `singleChoice`, `numberAnswer` | `audio` | `PROJECT_DECISION` |
| `math.data.charts.read` | `singleChoice`, `numberAnswer` | `imageTask`, `tableTask` → `NEEDS_VPR_CHECK` | `PROJECT_DECISION` / `NEEDS_VPR_CHECK` |
| `math.word_problems.general.solve` | `numberAnswer`, `singleChoice`, `shortAnswer` | `constructedResponse` → `NEEDS_VPR_CHECK` | `PROJECT_DECISION` / `NEEDS_VPR_CHECK` |
| `math.word_problems.motion.distance` | `numberAnswer`, `singleChoice`, `fillBlank` | официальный тип ВПР неизвестен | `PROJECT_DECISION` + `NEEDS_VPR_CHECK` |
| `math.word_problems.motion.time` | `numberAnswer`, `singleChoice`, `fillBlank` | то же | `PROJECT_DECISION` + `NEEDS_VPR_CHECK` |
| `math.word_problems.motion.speed` | `numberAnswer`, `singleChoice`, `fillBlank` | то же | `PROJECT_DECISION` + `NEEDS_VPR_CHECK` |
| `math.logic.problems.solve` | `singleChoice`, `classification`, `ordering` | `constructedResponse` → `NEEDS_VPR_CHECK` | `PROJECT_DECISION` / `NEEDS_VPR_CHECK` |

`multipleChoice` ни одному навыку пока не назначен: в ТЗ для математики множественный выбор не описан. При необходимости — `NEEDS_VPR_CHECK`, не вводить «на всякий случай».

---

## 6. Сложность

Шкала ТЗ §5 — `DEFINED_BY_SPEC`:

| Уровень | Название | Смысл в ТЗ |
|---|---|---|
| 1 | Разминка | Простые задания для формирования навыка |
| 2 | Тренировка | Типовые школьные задания |
| 3 | Повышенная сложность | Несколько действий или более глубокое понимание |
| 4 | ВПР | Максимально близко к формату ВПР |
| 5 | Эксперт | Сложнее для сильных учеников |

Что ТЗ **не** определяет:

- какая тема обязана быть только уровнем 2 или только 4;
- сколько заданий каждого уровня в тренировке и в варианте ВПР;
- соответствие «средний уровень» из §4 числу 2, 3 или 4;
- формулу перевода сложности в `masteryScore`.

Правила матрицы (`PROJECT_DECISION`):

1. Тренировочный банк навыка может жить на 1–3, пока нет сверки ВПР.
2. Уровень 4 не ставить массово до проверки демоверсии 2027.
3. Уровень 5 не нужен для MVP.
4. Разрядность, переход через разряд и число действий меняют **сложность внутри навыка**, а не создают новый навык.
5. Пример §18 (сложение, разрядность 4, сложность 2) — единственный числовой якорь генератора: `DEFINED_BY_SPEC` как пример, не как норма для всех тем.

Распределение сложности в пробной ВПР: `NEEDS_VPR_CHECK`.

---

## 7. Связь с ВПР

Нельзя выдумать номера, баллы и длительность ВПР-2027. Поля `vprVersion` и `sourceType: 'vpr'` в типах уже есть; официального справочника номеров нет.

Нужна проверка по официальной демоверсии, описанию, спецификации и критериям (ТЗ §41):

| Вопрос | Статус |
|---|---|
| Типы заданий математики в ВПР-2027 | `NEEDS_VPR_CHECK` |
| Номера заданий и структура варианта | `NEEDS_VPR_CHECK` |
| Максимальные баллы и критерии | `NEEDS_VPR_CHECK` |
| Время работы | `NEEDS_VPR_CHECK` |
| Распределение сложности | `NEEDS_VPR_CHECK` |
| Содержание (что именно проверяет каждый номер) | `NEEDS_VPR_CHECK` |
| Есть ли умножение, деление, дроби, чертежи, таблицы | `NEEDS_VPR_CHECK` |
| Как заполнять `vprTaskType` | `NEEDS_VPR_CHECK` |
| Соответствие навыка матрицы конкретному номеру ВПР | `NEEDS_VPR_CHECK` |

Текущие 10 заданий имеют `vprVersion: 2027` и `sourceType: 'training'`. Это **учебный** задел, не вариант ВПР. Нельзя считать их покрытием спецификации 2027.

До сверки:

- не собирать режим `exam` из тренировочных id;
- не писать на экране «это задание №… ВПР»;
- не ставить `sourceType: 'vpr'` без основания.

---

## 8. Генераторы математики

ТЗ требует генераторы «там, где это возможно» (§18, §38). Поля генератора (`DEFINED_BY_SPEC`): тип задания, диапазон чисел, количество действий, уровень сложности, ограничения, правильный ответ, генератор объяснения.

Пример типа: сложение многозначных чисел, разрядность 4, сложность 2 — `DEFINED_BY_SPEC`.

Код генераторов не пишется, пока матрица не утверждена.

| ID (черновик) | Что генерирует | Навык матрицы | Статус |
|---|---|---|---|
| `gen.math.multi_digit.addition` | Сложение многозначных чисел | `math.calculation.multi_digit.addition` | `DEFINED_BY_SPEC` |
| `gen.math.multi_digit.subtraction` | Вычитание многозначных чисел | `math.calculation.multi_digit.subtraction` | `PROJECT_DECISION` |
| `gen.math.mul_div.multiplication` | Умножение | `math.calculation.mul_div.multiplication` | `PROJECT_DECISION` |
| `gen.math.mul_div.division` | Деление | `math.calculation.mul_div.division` | `PROJECT_DECISION` |
| `gen.math.order_of_operations.evaluate` | Порядок действий | `math.order_of_operations.expressions.evaluate` | `PROJECT_DECISION` |
| `gen.math.quantities.units` | Перевод единиц | `math.quantities.units.convert` | `PROJECT_DECISION` |
| `gen.math.quantities.time` | Время | `math.quantities.time.calculate` | `PROJECT_DECISION` |
| `gen.math.quantities.mass` | Масса | `math.quantities.mass.calculate` | `PROJECT_DECISION` |
| `gen.math.quantities.length` | Длина | `math.quantities.length.calculate` | `PROJECT_DECISION` |
| `gen.math.quantities.area` | Площадь как величина | `math.quantities.area.convert` | `PROJECT_DECISION` |
| `gen.math.quantities.cost` | Стоимость | `math.quantities.cost.calculate` | `PROJECT_DECISION` |
| `gen.math.quantities.speed` | Скорость как величина | `math.quantities.speed.convert` | `PROJECT_DECISION` |
| `gen.math.geometry.perimeter` | Периметр | `math.geometry.perimeter.calculate` | `PROJECT_DECISION` |
| `gen.math.geometry.figure_area` | Площадь фигур | `math.geometry.figure_area.calculate` | `PROJECT_DECISION` |
| `gen.math.word_problems.general` | Сюжетные задачи | `math.word_problems.general.solve` | `PROJECT_DECISION` |
| `gen.math.word_problems.motion` | Задачи на движение | навыки `motion.*` | `PROJECT_DECISION` (тема `DEFINED_BY_SPEC`, генератор не описан) |
| `gen.math.data.tables` | Вопросы к таблице | `math.data.tables.read` | `PROJECT_DECISION` |
| `gen.math.data.charts` | Вопросы к диаграмме | `math.data.charts.read` | `PROJECT_DECISION` |
| `gen.math.logic.problems` | Логические задачи | `math.logic.problems.solve` | `PROJECT_DECISION` |
| `gen.math.geometry.symmetry` | Симметрия | `math.geometry.symmetry.identify` | `PROJECT_DECISION` |

Генератор должен менять числа и сохранять навык. Нельзя одним генератором закрывать разные `skillId`.

Симметрия, диаграммы и часть геометрии могут оказаться плохо параметризуемыми (нужна картинка). Тогда банк — статические задания, не генератор. Это `PROJECT_DECISION` / `NEEDS_VPR_CHECK`, не запрет ТЗ.

---

## 9. Связь с текущим `Task`

Код не меняется. Ниже — целевая модель.

Текущие поля `Task`, которые должны опираться на матрицу:

| Поле сейчас | Тип сейчас | Целевая связь | Комментарий |
|---|---|---|---|
| `subject` | `SubjectId` | `mathematics` | Уже стабильный ID. Сохраняется |
| `section` | `string` | заголовок раздела **или** ID `math.calculation` | Сейчас свободная строка |
| `topic` | `string` | должен соответствовать теме матрицы | Сейчас не `Topic.id` |
| `skill` | `string` | должен соответствовать навыку матрицы | Сейчас не `Skill.id` |
| `difficulty` | `1..5` | шкала §5 | Совпадает с ТЗ; раскладка по темам — нет |
| `taskType` | `TaskType` | один из допустимых для навыка | Список типов уже есть |
| `vprVersion` | `number` | `2027` до появления ветки 2028 | Версионирование `DEFINED_BY_SPEC` |
| `vprTaskType` | `string?` | код номера ВПР после сверки | Сейчас пусто, справочника нет |
| `sourceType` | `SourceType` | `training` / `generated` / `vpr` / … | Не путать training и vpr |
| `generatorId` | `string?` | ID из §8 | Пока не используется в банке |
| `generatorParams` | `object?` | разрядность, ограничения | Совпадает с идеей §38 |

Есть отдельные типы `Topic` и `Skill` с полями `id` и `topicId`. Задания на них **не ссылаются**.

Фактически сейчас:

```text
Topic.id  / Skill.id     — справочник карты предмета (демо)
Task.topic / Task.skill  — произвольные русские строки
```

Пример расхождения:

| Источник | section | topic | skill |
|---|---|---|---|
| Карта предмета (демо) | «Вычисления» как подпись навыка | `math-calc` | «Вычисления», «Порядок действий», … |
| `MATH_TASKS` | `Вычисления` | `Сложение и вычитание многозначных чисел` | `Сложение без перехода через разряд` и т.п. |
| Эта матрица | `math.calculation` | `math.calculation.multi_digit` | `math.calculation.multi_digit.addition` |

Из-за этого нельзя честно считать слабые места, `SkillMastery` и кабинет родителя: попытка не попадает в строку справочника.

Рекомендуемая связка **после утверждения матрицы** (код позже):

1. Считать каноном ID этой матрицы.
2. Добавить в задание стабильные поля вроде `sectionId`, `topicId`, `skillId` **или** писать в `topic`/`skill` сами ID, а русские названия брать из матрицы.
3. Не оставлять два параллельных смысла у `topic`: и человеческое название, и ключ учёта.
4. Не плодить навыки из текущих 10 карточек («без перехода», «с заимствованием») — свернуть их в `addition` / `subtraction` + параметры генератора.
5. Демо-карту предмета (`DEMO_SKILLS`) позже заменить агрегацией по разделам матрицы, а не наоборот.

До смены полей новые задания, если появятся точечно, лучше сразу писать названия, совпадающие с этой матрицей, понимая, что это всё ещё строки, не FK.

---

## 10. Что нельзя делать до утверждения матрицы

Пока этот документ не подтверждён:

1. Не создавать массовый банк математики «на все темы».
2. Не писать генераторы.
3. Не строить адаптивный алгоритм.
4. Не считать живой `SkillMastery`.
5. Не включать режимы «слабые места», «повторение темы», «случайная» как реальный подбор.
6. Не строить кабинет родителя на демо-процентах как на правде.
7. Не собирать пробную ВПР.
8. Не придумывать номера и баллы ВПР-2027.
9. Не дробить навыки по сложности и трюкам генератора.
10. Не подменять матрицу текущими строками `MATH_TASKS`.
11. Не заполнять ФОП/УМК «по памяти».
12. Не менять `Task`, `Topic`, `Skill`, `TaskEngine`, репозиторий и экраны «заодно» с этим документом.

Допустимо: обсуждать и править **этот файл**; точечно оставлять уже существующие 10 учебных заданий.

---

## 11. OPEN QUESTIONS

Вопросы, которые нужно закрыть до массового наполнения:

1. **Официальная структура ВПР-2027 по математике:** число заданий, типы, баллы, время, критерии (ТЗ §41).
2. **Карта ФОП НОО и УМК «Школа России»** — обязательна по ТЗ §39, в ТЗ таблиц нет.
3. **Границы тем:** скорость и стоимость — только величины или ещё сюжетные задачи? Площадь — величина, геометрия или оба (как принято здесь)?
4. **Движение на карте §10 vs тема §4** — подтвердить, что раздел один (`word_problems`).
5. **Умножение и деление** — включать ли тему `mul_div` до сверки ВПР?
6. **Дроби, доли, десятичные числа, уравнения** — в §18 нет; нужны ли 4 классу и ВПР?
7. **Каталог навыков:** достаточно ли 22 или официальные умения ВПР потребуют другой нарезки?
8. **Типы UI vs типы ВПР:** чем заполнять `vprTaskType`?
9. Нужен ли `multipleChoice` в математике?
10. Нужны ли чертежи (`imageTask`) уже в тренировке или только после спецификации?
11. **Формула `masteryScore`** — в ТЗ есть требование не сводить к одному верному ответу, самой формулы нет.
12. **Тип ошибки** для адаптивности (ТЗ §11) — справочника ошибок нет.
13. **Интервалы повторения** 1 / 3 / 7 дней — значения есть, место конфигурации и привязка к `skillId` не описаны.
14. Сколько тренировочных заданий на навык (ТЗ §39 требует число — его нет).
15. Быстрая тренировка: 5 заданий из каких навыков?
16. Как показывать карту предмета: 7 разделов матрицы или 8 подписей из §10?
17. Генератор или статика для симметрии, диаграмм, логики?
18. Можно ли считать текущие 10 заданий покрытием `addition`+`subtraction` после перепривязки ID?
19. Источник и права на формулировки «как в ВПР», рисунки и таблицы до RuStore.

---

## 12. Ограничения для будущей Android/RuStore версии

Подробные требования магазина здесь не повторяются. Только принципы, чтобы матрица и будущий банк их не ломали:

1. **Offline first.** Задания, тексты, картинки и аудио математики должны жить в приложении, не на обязательном API.
2. **Минимум персональных данных.** Матрица и банк не содержат имени ребёнка; не добавлять в задания поля профиля.
3. **Без лишних Android-разрешений.** Контент не должен требовать микрофон, камеру, геолокацию, контакты.
4. **Без обязательного сервера в MVP.** Генерация и проверка — на устройстве.
5. **Понятный источник и права.** Не копировать официальные КИМ без основания; генераторы и собственные формулировки предпочтительнее.
6. **Картинки и схемы** — файлы в бандле (`public/images` или эквивалент), пригодные для WebView, без внешних URL.
7. **Не привязывать контент к Web-only API.** Не строить задания на `window`, браузерных плагинах, облачных формулах или сети «на каждый пример».
8. Параметры генератора должны сериализоваться в обычные данные (`generatorId` + `generatorParams`), чтобы одинаково работать в браузере и в Android WebView.

---

## Приложение A. Счётчики версии 1.0

| Сущность | Количество |
|---|---|
| Разделы | 7 |
| Темы | 18 |
| Навыки | 22 |
| Генераторы (черновик списка) | 20 |

Ориентир по статусам **строк справочника** (разделы + темы + навыки = 47). У строки может быть несколько пометок (вложение, типы, ВПР); ниже — **основной** статус самой сущности:

| Статус | Количество | Что вошло |
|---|---|---|
| `DEFINED_BY_SPEC` | 20 | 6 разделов с именем из ТЗ; 13 тем, чьё название взято из §18/§4 (величины, геометрия, таблицы, диаграммы, движение); 1 навык «нахождение расстояния». Раздел `math.data` сюда не входит |
| `PROJECT_DECISION` | 27 | 1 раздел-объединение; 5 тем с проектным именем или статусом темы (`multi_digit`, `mul_div`, `expressions`, `general`, `logic.problems`); 21 навык, не названный в ТЗ как навык |
| `NEEDS_VPR_CHECK` | 22 навыка + 9 пунктов §7 | связь с ВПР у каждого навыка; отдельно номера, баллы, время, критерии, содержание, `vprTaskType` |
| `PLANNED` | 3 блока | ФОП/УМК, число заданий на навык, детализация логики |

Черновик генераторов: 1 `DEFINED_BY_SPEC`, 19 `PROJECT_DECISION`.

---

## Приложение B. Соответствие блокам ТЗ §18

Каждый блок §18 куда-то попал:

| Блок ТЗ | Куда в матрице |
|---|---|
| вычисления | раздел `math.calculation` |
| порядок действий | раздел `math.order_of_operations` |
| величины | раздел `math.quantities` |
| единицы измерения | тема `math.quantities.units` |
| время | тема `math.quantities.time` |
| масса | тема `math.quantities.mass` |
| длина | тема `math.quantities.length` |
| площадь | тема `math.quantities.area` |
| стоимость | тема `math.quantities.cost` |
| скорость | тема `math.quantities.speed` |
| текстовые задачи | раздел и тема `general` |
| задачи на движение | тема `math.word_problems.motion` |
| таблицы | тема `math.data.tables` |
| диаграммы | тема `math.data.charts` |
| геометрия | раздел `math.geometry` |
| периметр | тема `math.geometry.perimeter` |
| площадь фигур | тема `math.geometry.figure_area` |
| симметрия | тема `math.geometry.symmetry` |
| логические задачи | раздел `math.logic` |

Конец документа.
