# M01 GENERATOR SPEC
## Разрядный состав и запись чисел

| Поле | Значение |
|---|---|
| `skillId` | `math.calculation.numbers.place_value` |
| `topicId` | `math.calculation.numbers` |
| Генератор | `gen.math.numbers.place_value` |
| Уровни | L1–L3 |

Границы по карточке M01 в `CONTENT_MATRIX_MATH.md`. Не заменяет матрицу.

### L1
Трёхзначные без нулей: значение цифры / сколько единиц|десятков|сотен.

### L2
Четырёхзначные: запись по разрядному составу или значение цифры.

### L3
Четырёхзначные с нулями: «в разряде … стоит» / запись с нулями.

API: `generateM01Task`, `generateM01Series`.
