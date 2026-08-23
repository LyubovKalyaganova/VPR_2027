# M02 GENERATOR SPEC
## Сравнение многозначных чисел

| Поле | Значение |
|---|---|
| `skillId` | `math.calculation.numbers.compare` |
| `topicId` | `math.calculation.numbers` |
| Генератор | `gen.math.numbers.compare` |
| Уровни | L1–L3 |

Границы по карточке M02 в `CONTENT_MATRIX_MATH.md`. Не пересекается с M27 («на сколько» / «во сколько раз»).

### L1
Одинаковая разрядность, выбор верного сравнения.

### L2
Четырёхзначные: наибольшее/наименьшее или сравнение.

### L3
Разная разрядность, ловушка 999 vs 1000, упорядочивание.

API: `generateM02Task`, `generateM02Series`.
