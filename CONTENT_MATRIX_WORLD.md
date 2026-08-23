# CONTENT MATRIX — ОКРУЖАЮЩИЙ МИР 4 КЛАССА

Версия документа: 1.0 (заморожена)  
Предмет: окружающий мир (`world`)  
Каталог: **ровно W01–W25**. W26+ запрещены.  
Математика M01–M35 и русский R01–R25 **не изменяются** этим документом.

---

## 1. Назначение

Единый справочник: **окружающий мир → раздел → тема → навык W → подтип → уровень 1–3**.

Используется для: банка заданий, генераторов, `taskRepository`, weighted training, адаптивного подбора.

---

## 2. Официальная структура ВПР-2027

| Параметр | Значение |
|---|---|
| Заданий | 10 (16 подпунктов) |
| Максимум баллов | 28 |
| Время | 45 минут |
| Базовый (Б) | 7 заданий / 17 баллов |
| Повышенный (П) | 3 задания / 11 баллов |

**Форматы ответов в КИМ:**
- Краткий: 1, 2.2, 2.3, 3, 5, 7.1, 8.1, 9.1, 10.1
- Подпись/изображение: 2.1, 4, 9.2
- Развёрнутый: 6, 7.2, 8.2, 10.2

**В приложении** развёрнутые задания — **TRAINING ANALOG**, не экспертная проверка свободного ответа.

**W01 (погода):** таблица использует общий формат (дни + символы + t° + ветер). Точный состав столбцов официальной демоверсии следует сверить перед exam mode.

---

## 3. Приоритеты tier и веса

| Tier | Навыки |
|---|---|
| CORE_HIGH | W01–W04, W07, W09–W14, W25 |
| CORE_MEDIUM | W05, W06, W08, W15–W17 |
| SUPPORT | W18–W20, W23 |
| EXTENSION (≤10% сессии) | W21, W22, W24 |

**examWeight / trainingWeight** — см. `worldTrainingWeights.ts`.

---

## 4. Покрытие КИМ ВПР-2027 (10/10 host skills)

| № | Задание ВПР | Host skill |
|---|---|---|
| 1 | Таблица погоды | W01 |
| 2.1 | Карта зон | W02 |
| 2.2 | Флора/фауна | W02 |
| 2.3 | Утверждения о зоне | W03 |
| 3 | Цепь питания | W04 |
| 4 | Органы тела | W05 |
| 5 | Здоровье | W06 |
| 6 | Безопасность | W07 |
| 7.1 | Эксперимент | W08 |
| 7.2 | Вывод | W09 |
| 8.1 | Отрасли экономики | W10 |
| 8.2 | Значимость труда | W10 |
| 9.1 | История | W11 |
| 9.2 | Лента времени | W12 |
| 10.1 | Родной край: факты | W13 |
| 10.2 | Родной край: высказывание | W14 |

Curriculum skills: W15–W25.

---

## 5. Карточки навыков W01–W25

### W01 — Погода: таблица, символы, выводы
- **skillId:** `world.nature.weather`
- **examW:** 7 | **trainW:** 8 | **tier:** CORE_HIGH
- **subtypes:** read_symbol, compare_days, wind_speed, choose_answer
- **TaskType:** imageTask (SVG-таблица) + singleChoice
- **ВПР:** №1

### W02 — Карта: зоны/материки
- **skillId:** `world.nature.map_zones`
- **examW:** 9 | **trainW:** 9 | **tier:** CORE_HIGH
- **subtypes:** label_zone, pick_fauna, pick_flora, map_legend
- **TaskType:** imageTask + matching/singleChoice
- **ВПР:** №2.1, 2.2

### W03 — Флора/фауна зоны, истинность утверждений
- **skillId:** `world.nature.zone_life`
- **examW:** 7 | **trainW:** 8 | **tier:** CORE_HIGH
- **subtypes:** true_false, best_statement, compare_zones
- **ВПР:** №2.3

### W04 — Цепи питания
- **skillId:** `world.nature.food_chain`
- **examW:** 6 | **trainW:** 9 | **tier:** CORE_HIGH
- **subtypes:** build_chain, order_chain, classify_feeding, find_error_chain
- **TaskType:** ordering, matching, singleChoice
- **ВПР:** №3
- **Граница:** W17 — отдельные учебные цели классификации, не merge

### W05 — Строение тела
- **skillId:** `world.nature.body_structure`
- **examW:** 6 | **trainW:** 6 | **tier:** CORE_MEDIUM
- **subtypes:** label_organ, system_function, find_error_body
- **TaskType:** imageTask + matching
- **ВПР:** №4

### W06 — Здоровье, вредные привычки
- **skillId:** `world.nature.health`
- **examW:** 6 | **trainW:** 7 | **tier:** CORE_MEDIUM
- **subtypes:** harm_habit, organ_function, healthy_choice
- **ВПР:** №5

### W07 — Безопасность
- **skillId:** `world.safety.public`
- **examW:** 7 | **trainW:** 8 | **tier:** CORE_HIGH
- **subtypes:** traffic, public_place, bike_scooter, choose_rule
- **TaskType:** singleChoice, ordering (structured training)
- **ВПР:** №6

### W08 — Эксперимент: чтение текста
- **skillId:** `world.nature.experiment_read`
- **examW:** 6 | **trainW:** 7 | **tier:** CORE_MEDIUM
- **subtypes:** read_experiment, compare_objects, extract_fact
- **TaskType:** passage + singleChoice/shortAnswer
- **ВПР:** №7.1

### W09 — Вывод по опыту
- **skillId:** `world.nature.experiment_conclusion`
- **examW:** 5 | **trainW:** 8 | **tier:** CORE_HIGH
- **subtypes:** draw_conclusion, reject_wrong_conclusion, cause_effect
- **ВПР:** №7.2

### W10 — Отрасли экономики
- **skillId:** `world.society.economy`
- **examW:** 9 | **trainW:** 9 | **tier:** CORE_HIGH
- **subtypes:** match_sector, match_profession, social_importance, explain_labor
- **TaskType:** matching, singleChoice
- **ВПР:** №8.1, 8.2

### W11 — История: личности и события
- **skillId:** `world.society.history_match`
- **examW:** 6 | **trainW:** 7 | **tier:** CORE_HIGH
- **subtypes:** person_event, date_century, period_match
- **TaskType:** matching
- **ВПР:** №9.1

### W12 — Лента времени
- **skillId:** `world.society.timeline`
- **examW:** 6 | **trainW:** 8 | **tier:** CORE_HIGH
- **subtypes:** place_on_timeline, order_events, find_error_timeline
- **TaskType:** imageTask + ordering/matching
- **ВПР:** №9.2

### W13 — Родной край: факты
- **skillId:** `world.society.region_facts`
- **examW:** 7 | **trainW:** 7 | **tier:** CORE_HIGH
- **subtypes:** city_facts, landmark, nature_feature, economy_local
- **TaskType:** shortAnswer/singleChoice
- **Регион:** параметрический `WorldRegionContent`, demo: «Северный край»
- **ВПР:** №10.1

### W14 — Родной край: структурированное высказывание
- **skillId:** `world.society.region_speech`
- **examW:** 8 | **trainW:** 8 | **tier:** CORE_HIGH
- **subtypes:** plan_speech, topic_sentence, best_presentation, extra_detail
- **TaskType:** ordering/singleChoice (training analog)
- **ВПР:** №10.2

### W15 — Причинно-следственные связи
- **skillId:** `world.nature.cause_effect`
- **tier:** CORE_MEDIUM | curriculum

### W16 — Экология
- **skillId:** `world.nature.ecology`
- **tier:** CORE_MEDIUM | curriculum

### W17 — Сравнение и классификация природы
- **skillId:** `world.nature.classification`
- **tier:** CORE_MEDIUM | **отдельный skill, не merge с W04**

### W18 — География России
- **skillId:** `world.nature.geography`
- **tier:** SUPPORT

### W19 — Государство, символы
- **skillId:** `world.society.civic`
- **tier:** SUPPORT

### W20 — Историческая карта
- **skillId:** `world.society.historical_map`
- **tier:** SUPPORT

### W21 — Всемирное наследие
- **skillId:** `world.society.heritage`
- **tier:** EXTENSION

### W22 — Безопасность в интернете
- **skillId:** `world.safety.online`
- **tier:** EXTENSION

### W23 — Земля, Солнце, сезоны
- **skillId:** `world.nature.earth_sun`
- **tier:** SUPPORT

### W24 — Методы познания природы
- **skillId:** `world.nature.methods`
- **tier:** EXTENSION

### W25 — Reasoning: ход рассуждения
- **skillId:** `world.reasoning.analysis`
- **examW:** 7 | **trainW:** 9 | **tier:** CORE_HIGH
- **subtypes:** first_step, next_step, find_error, choose_sequence, cause_effect
- **Meta-skill** (аналог M29/R23), не склад сложных тем

---

## 6. Cross-skill boundaries

| Пара | Вердикт |
|---|---|
| W02 ↔ W03 | карта vs утверждения о зоне — CLEAR |
| W05 ↔ W06 | строение vs здоровье — CLEAR |
| W08 ↔ W09 | факт vs вывод — CLEAR |
| W10 ↔ W14 | экономика vs рассказ о регионе — BORDERLINE |
| W11 ↔ W12 | личность/событие vs timeline — CLEAR |
| W13 ↔ W14 | факты vs presentation — SPLIT |
| W15 ↔ W01 | причина vs таблица погоды — BORDERLINE |
| W16 ↔ W04 | экология vs цепь питания — CLEAR |
| W17 ↔ W04 | **отдельные цели, НЕ MERGE** |
| W18 ↔ W02 | карта vs география — BORDERLINE |
| W19 ↔ W11 | гражданские vs история — CLEAR |
| W25 ↔ W09/W12 | meta vs предметное — CLEAR |

---

## 7. Digital adaptation

| TaskType | Применение |
|---|---|
| singleChoice | W03, W06, W07, W09, W13 |
| matching | W02, W05, W10, W11, W12, W20, W21, W24 |
| ordering | W04, W07, W12, W14 |
| imageTask | W01, W02, W05, W12 |
| shortAnswer | W08, W13 |
| passage | W08 |

**Не используется:** tableTask (UI не подключён), constructedResponse, OCR, audio.

---

## 8. EXTENSION policy

Cap ≤ **10%** обычной тренировочной сессии. W21/W22/W24 не доминируют.

---

## 9. Known limitations

- Развёрнутые ответы ВПР (№6, 7.2, 8.2, 10.2) — только training analog
- W13/W14 — нейтральный demo-регион, параметризация через `WorldRegionContent`
- W01 — столбцы таблицы погоды: validate against official demo before exam mode
- W26+ запрещены до отдельного GAP-аудита

---

## 10. Training pool

Production pool: **150 задач** (25 skills × 3 levels × 2 per level).  
Weighted selection: `WORLD_SKILL_WEIGHTS` → `recommendWorldSessionSkillMix` → generators.
