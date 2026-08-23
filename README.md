# ВПР 4 класс 2027

Образовательное приложение для подготовки учеников 4 класса к ВПР.

Стек: React + TypeScript + Vite. Локальное хранение прогресса (без сервера). Android-оболочка через Capacitor.

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
| Английский язык E01–E18 | **FROZEN** |
| Progress / Mastery / Adaptive | **Этап 14** — история попыток ? mastery ? weak |
| Training (quick / normal / random / topic / weak) | **READY** |
| VPR Exam (таймер, scoring, resume) | **READY** (Этап 16 FROZEN) |
| Subject-aware training | mathematics / russian / world / reading / english |
| Typecheck / build | Проходят |
| Android integration (Capacitor) | **READY** (Этап 18–20 FROZEN) |
| Release AAB | Собирается (`npm run android:bundleRelease`) |

**Прогресс (Этап 14):**
- Source of truth: `Attempt` history (`localAttemptRecorder` / localStorage)
- Mastery: `calculateSkillMastery` (0–100, `new` ? weak)
- Adaptive weak: cold-start по trainingWeight; с историей — weakness + review
- SubjectPage / TrainResult: реальные данные по всем 5 предметам
- Scripts: `test:progress`, `test:mastery`, `test:adaptive`, `test:attempt-history`

**Цепочка:**

```text
Answer ? Checker ? AttemptRecorder ? History ? Mastery ? Adaptive / UI
```

### Ещё не завершено

- Физический Android smoke test — **pending device**
- Release signing (`signing.properties`) — **pending**
- RuStore upload — **not yet**
- Сервер / облачная синхронизация — не планируется

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
npm run test:progress
npm run test:mastery
npm run test:adaptive
npm run test:attempt-history
npm run test:release-audit
npm run typecheck
npm run build
```

Android:

```bash
npm run android:build
npm run android:bundleRelease
```
