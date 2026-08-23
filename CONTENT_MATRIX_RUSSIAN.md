# CONTENT MATRIX — РУССКИЙ ЯЗЫК 4 КЛАССА

Версия документа: 1.0 (заморожена)  
Предмет: русский язык (`russian`)  
Каталог: **ровно R01–R25**. R26+ запрещены.  
Математика M01–M35 **не изменяется** этим документом.

---

## 1. Назначение

Единый справочник: **русский язык → раздел → тема → навык R → подтип → уровень 1–5**.

Используется для: банка заданий, генераторов, `taskRepository`, weighted training, `SkillMastery`, адаптивного подбора.

---

## 2. Приоритеты tier и веса

| Tier | Навыки |
|---|---|
| CORE_HIGH | R01–R07, R10–R15, R18–R19, R21, R23 |
| CORE_MEDIUM | R08–R09, R16–R17, R20, R22 |
| SUPPORT | R24–R25 |
| EXTENSION (≤12% сессии) | местоимение, наречие, прямая речь — **subtypes внутри R12**, не отдельные R |

**trainingWeight** (утверждено): R01 9, R02 8, R03 7, R04 8, R05 7, R06 9, R07 9, R08 6, R09 6, R10 8, R11 8, R12 8, R13 7, R14 8, R15 8, R16 6, R17 6, R18 9, R19 10, R20 7, R21 8, R22 6, R23 9, R24 4, R25 5.

**examWeight** хранится отдельно в `russianTrainingWeights.ts`.

---

## 3. Покрытие КИМ ВПР-2027 (15 заданий)

| № | Задание ВПР | Навыки |
|---|---|---|
| 1 | Диктант | R07 (+ R01–R04) |
| 2 | Однородные (пунктуация) | R05, R11 |
| 3.1 | Грамматическая основа | R10 |
| 3.2 | Части речи | R12 |
| 4 | Ударение | R08 |
| 5 | Звуко-буквенный анализ | R09 |
| 6 | Найти и исправить | R06 |
| 7 | Тема / основная мысль | R18 |
| 8 | План текста | R19 |
| 9 | Вопрос по содержанию | R20 |
| 10 | Значение слова | R16 |
| 11 | Синоним / антоним | R17 |
| 12 | Состав слова + схема | R15 |
| 13 | Существительное | R13 |
| 14 | Прилагательное | R14 |
| 15 | Мини-текст + фразеологизм | R21, R22 |

---

## 4. Карточки навыков R01–R25

### R01 — Орфография: база 1–3 классов
- **skillId:** `russian.orthography.base`
- **ВПР:** №1 (диктант), поддержка №6
- **examWeight:** 8 | **trainingWeight:** 9 | **tier:** CORE_HIGH
- **subtypes:** check_vowel, unpaired, silent, soft_hard, capital, other_base
- **TaskType:** singleChoice, fillBlank
- **Границы:** не R02–R04 (окончания/глагол); не R06 (готовый текст с ошибкой)
- **Не входит:** перенос слова как отдельный R (subtype R01)
- **Покрытие:** выбор правильного написания по правилу 1–3 класса

### R02 — Безударные окончания существительных
- **skillId:** `russian.orthography.noun_endings`
- **ВПР:** №1
- **examWeight:** 7 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** noun_ending, case_hint
- **TaskType:** singleChoice, fillBlank
- **Границы:** не R03 (прилагательные), не R04 (глагол)

### R03 — Безударные окончания прилагательных
- **skillId:** `russian.orthography.adj_endings`
- **ВПР:** №1
- **examWeight:** 6 | **trainingWeight:** 7 | **tier:** CORE_HIGH
- **subtypes:** adj_ending, agreement_hint
- **TaskType:** singleChoice
- **Границы:** не R02, не R14 (грамматические признаки)

### R04 — Орфография глагола
- **skillId:** `russian.orthography.verb_spelling`
- **ВПР:** №1
- **examWeight:** 7 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** tся, ться, personal_ending
- **TaskType:** singleChoice, fillBlank
- **Границы:** **R04 = КАК ПИСАТЬ**; **R25 = ПРИЗНАКИ** (не смешивать)

### R05 — Пунктуация: однородные члены
- **skillId:** `russian.punctuation.homogeneous`
- **ВПР:** №2
- **examWeight:** 7 | **trainingWeight:** 7 | **tier:** CORE_HIGH
- **subtypes:** homogeneous_punct, comma_between
- **TaskType:** singleChoice
- **Границы:** R11 — синтаксическое выделение ОЧ, R05 — знаки

### R06 — Орфографическая зоркость
- **skillId:** `russian.orthography.proofreading`
- **ВПР:** №6
- **examWeight:** 8 | **trainingWeight:** 9 | **tier:** CORE_HIGH
- **subtypes:** find_fix, find_error_rule, no_error, wrong_fix_reason
- **TaskType:** singleChoice, shortAnswer
- **Reasoning:** где ошибка → правило → исправление

### R07 — Диктант-готовность
- **skillId:** `russian.orthography.dictation_prep`
- **ВПР:** №1
- **examWeight:** 9 | **trainingWeight:** 9 | **tier:** CORE_HIGH
- **subtypes:** hear_choose, find_orthogram, punctuation_step, self_check
- **TaskType:** singleChoice, fillBlank, **audio** (TTS через SpeechSynthesis + выбор написания)
- **Цифровой аналог:** transcript → воспроизведение → выбор написания → самопроверка. **Не замена** рукописного диктанта ВПР.

### R08 — Орфоэпия: ударение
- **skillId:** `russian.phonetics.stress`
- **ВПР:** №4
- **examWeight:** 6 | **trainingWeight:** 6 | **tier:** CORE_MEDIUM
- **subtypes:** stress
- **TaskType:** singleChoice

### R09 — Фонетика: звуко-буквенный разбор
- **skillId:** `russian.phonetics.sound_letter`
- **ВПР:** №5
- **examWeight:** 6 | **trainingWeight:** 6 | **tier:** CORE_MEDIUM
- **subtypes:** sound_count, letter_count, syllable_count
- **TaskType:** numberAnswer, singleChoice

### R10 — Синтаксис: грамматическая основа
- **skillId:** `russian.syntax.base`
- **ВПР:** №3.1
- **examWeight:** 8 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** find_subject, find_predicate, find_base, error_in_base
- **TaskType:** singleChoice, matching

### R11 — Синтаксис: однородные члены
- **skillId:** `russian.syntax.homogeneous`
- **ВПР:** №2
- **examWeight:** 7 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** identify_member, find_homogeneous, error
- **TaskType:** singleChoice, matching
- **Границы:** R05 — пунктуация

### R12 — Морфология: части речи
- **skillId:** `russian.morphology.parts_of_speech`
- **ВПР:** №3.2
- **examWeight:** 7 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** core_pos, extension_pos (местоимение, наречие — EXTENSION cap)
- **TaskType:** singleChoice, classification

### R13 — Морфология: существительное
- **skillId:** `russian.morphology.noun`
- **ВПР:** №13
- **examWeight:** 7 | **trainingWeight:** 7 | **tier:** CORE_HIGH
- **subtypes:** noun_gender, noun_number, noun_case, trait_sequence, error_in_analysis
- **TaskType:** singleChoice, ordering

### R14 — Морфология: прилагательное
- **skillId:** `russian.morphology.adjective`
- **ВПР:** №14
- **examWeight:** 7 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** adj_traits, agreement, error_in_analysis
- **TaskType:** singleChoice

### R15 — Морфемика: состав слова + схема
- **skillId:** `russian.morphology.word_structure`
- **ВПР:** №12
- **examWeight:** 8 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** find_root, next_morpheme_step, choose_schema, schema_error
- **TaskType:** singleChoice, imageTask (SVG-схема)
- **Reasoning:** шаги разбора + проверка схемы

### R16 — Лексика: значение по контексту
- **skillId:** `russian.lexis.context_meaning`
- **ВПР:** №10
- **examWeight:** 6 | **trainingWeight:** 6 | **tier:** CORE_MEDIUM
- **subtypes:** context_meaning
- **TaskType:** singleChoice, shortAnswer

### R17 — Лексика: синонимы / антонимы
- **skillId:** `russian.lexis.synonyms_antonyms`
- **ВПР:** №11
- **examWeight:** 6 | **trainingWeight:** 6 | **tier:** CORE_MEDIUM
- **subtypes:** synonym, antonym
- **TaskType:** singleChoice, matching

### R18 — Текст: тема и основная мысль + заголовок
- **skillId:** `russian.text.theme_main_idea`
- **ВПР:** №7
- **examWeight:** 8 | **trainingWeight:** 9 | **tier:** CORE_HIGH
- **subtypes:** theme, main_idea, theme_vs_main, heading, conclusion
- **TaskType:** singleChoice, shortAnswer

### R19 — Текст: план / последовательность
- **skillId:** `russian.text.plan`
- **ВПР:** №8
- **examWeight:** 9 | **trainingWeight:** 10 | **tier:** CORE_HIGH
- **subtypes:** order_events, best_plan, extra_part, restore_sequence
- **TaskType:** ordering, singleChoice

### R20 — Текст: вопрос и понимание
- **skillId:** `russian.text.comprehension`
- **ВПР:** №9
- **examWeight:** 6 | **trainingWeight:** 7 | **tier:** CORE_MEDIUM
- **subtypes:** fact, inference, fact_vs_conclusion
- **TaskType:** singleChoice, shortAnswer

### R21 — Речь: мини-текст ситуации
- **skillId:** `russian.speech.situational`
- **ВПР:** №15 (часть 1)
- **examWeight:** 7 | **trainingWeight:** 8 | **tier:** CORE_HIGH
- **subtypes:** situational, goal, addressee, assemble_text
- **TaskType:** singleChoice, ordering
- **Границы:** не R22 (фразеологизм)

### R22 — Речь: фразеологизм
- **skillId:** `russian.speech.idiom`
- **ВПР:** №15 (часть 2)
- **examWeight:** 6 | **trainingWeight:** 6 | **tier:** CORE_MEDIUM
- **subtypes:** idiom_meaning, choose_idiom, literal_vs_figurative
- **TaskType:** singleChoice

### R23 — Рассуждение: ход / ошибка в разборе
- **skillId:** `russian.reasoning.analysis`
- **ВПР:** поддержка №3, 12–14
- **examWeight:** 8 | **trainingWeight:** 9 | **tier:** CORE_HIGH
- **subtypes:** first_step, next_step, find_error, choose_sequence
- **TaskType:** singleChoice, ordering
- **Аналог:** M29 reasoning в математике

### R24 — Синтаксис: простое / сложное
- **skillId:** `russian.syntax.simple_complex`
- **ВПР:** программа (SUPPORT)
- **examWeight:** 4 | **trainingWeight:** 4 | **tier:** SUPPORT
- **subtypes:** sentence_type
- **TaskType:** singleChoice
- **Ограничение:** не доминировать в обычной сессии

### R25 — Морфология: глагол (признаки)
- **skillId:** `russian.morphology.verb`
- **ВПР:** программа (SUPPORT)
- **examWeight:** 5 | **trainingWeight:** 5 | **tier:** SUPPORT
- **subtypes:** verb_tense, verb_conjugation, verb_person_number
- **TaskType:** singleChoice
- **Граница:** R04 = правописание; R25 = признаки

---

## 5. Cross-skill audit (обязательные границы)

| Пара | Правило |
|---|---|
| R05 ↔ R11 | R05 — знаки; R11 — члены предложения |
| R04 ↔ R25 | письмо vs признаки |
| R01 ↔ R06 | правило vs поиск в тексте |
| R07 ↔ R01–R06 | диктант использует орфографию, но отдельный R |
| R12 ↔ R13/R14/R25 | часть речи vs разбор |
| R18 ↔ R19 ↔ R20 | тема/план/вопрос — разные subtypes |
| R21 ↔ R22 | ситуация vs фразеологизм |
| R23 ↔ остальные | reasoning поверх разборов, не дублирует R13–R15 |

---

## 6. Статус

**RUSSIAN FROZEN** — каталог R01–R25 зафиксирован. Новые skillId запрещены без BLOCKED — NEW SKILL REQUIRED.
