import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_COLORS } from '../data/demo/avatars';
import { SUBJECTS } from '../data/demo/subjects';
import { useUserStore } from '../store/useUserStore';
import type { SubjectId } from '../types';
import { Avatar, Button, Card } from '../components/ui';
import styles from './OnboardingPage.module.css';

const STEPS = ['Приветствие', 'Имя', 'Класс', 'Предметы', 'Диагностика'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATAR_COLORS[0]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>(SUBJECTS.map((item) => item.id));

  const canContinue = useMemo(() => {
    if (step === 1) {
      return name.trim().length >= 2;
    }
    if (step === 3) {
      return selectedSubjects.length > 0;
    }
    return true;
  }, [name, selectedSubjects.length, step]);

  function toggleSubject(id: SubjectId) {
    setSelectedSubjects((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function finish(goToTrain: boolean) {
    completeOnboarding({
      name: name.trim() || 'Ученик',
      avatar,
      selectedSubjects,
    });
    navigate(goToTrain ? '/train' : '/', { replace: true });
  }

  return (
    <div className={styles.page}>
      <div className={styles.dots} aria-label={`Шаг ${step + 1} из ${STEPS.length}`}>
        {STEPS.map((label, index) => (
          <span key={label} className={`${styles.dot} ${index <= step ? styles.dotActive : ''}`} />
        ))}
      </div>

      {step === 0 ? (
        <section className={styles.block}>
          <p className={styles.kicker}>ВПР 4 класс 2027</p>
          <h1>Привет! Давай настроим тренажёр</h1>
          <p className={styles.lead}>
            Сначала коротко познакомимся. Потом приложение поможет понять, что уже получается, а что стоит
            потренировать.
          </p>
        </section>
      ) : null}

      {step === 1 ? (
        <section className={styles.block}>
          <h1>Как тебя зовут?</h1>
          <p className={styles.lead}>Достаточно имени. Фамилию и другие личные данные указывать не нужно.</p>
          <label className={styles.label} htmlFor="child-name">
            Имя
          </label>
          <input
            id="child-name"
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Маша"
            autoComplete="given-name"
          />
          <p className={styles.sub}>Выбери цвет аватара</p>
          <div className={styles.avatars}>
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.avatarBtn} ${avatar === color ? styles.avatarActive : ''}`}
                onClick={() => setAvatar(color)}
                aria-label={`Аватар цвета ${color}`}
              >
                <Avatar name={name || 'У'} color={color} size={52} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className={styles.block}>
          <h1>Какой у тебя класс?</h1>
          <p className={styles.lead}>Это приложение создано для подготовки учеников 4 класса.</p>
          <Card className={styles.classCard}>
            <strong>4 класс</strong>
            <span>Подходит для текущего учебного года</span>
          </Card>
        </section>
      ) : null}

      {step === 3 ? (
        <section className={styles.block}>
          <h1>Какие предметы тренируем?</h1>
          <p className={styles.lead}>
            Рекомендуем выбрать все пять. Так подготовка будет полной, даже если третий предмет на ВПР ещё не
            известен.
          </p>
          <div className={styles.subjectList}>
            {SUBJECTS.map((subject) => {
              const selected = selectedSubjects.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  className={`${styles.subject} ${selected ? styles.subjectSelected : ''}`}
                  onClick={() => toggleSubject(subject.id)}
                >
                  <span className={styles.subjectMark} style={{ background: subject.accent }} />
                  <span>
                    <strong>{subject.title}</strong>
                    <em>{subject.description}</em>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className={styles.block}>
          <h1>Можно начать с диагностики</h1>
          <p className={styles.lead}>
            Короткая проверка поможет понять стартовую точку. Это не оценка «хорошо» или «плохо», а начало
            подготовки.
          </p>
          <Card>
            <p className={styles.note}>
              Движок заданий появится на следующем этапе. Сейчас можно войти в приложение и посмотреть каркас
              экранов.
            </p>
          </Card>
        </section>
      ) : null}

      <div className={styles.footer}>
        {step < 4 ? (
          <Button fullWidth disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
            Дальше
          </Button>
        ) : (
          <>
            <Button fullWidth onClick={() => finish(true)}>
              К диагностике
            </Button>
            <Button fullWidth variant="secondary" onClick={() => finish(false)}>
              Начать позже
            </Button>
          </>
        )}
        {step > 0 && step < 4 ? (
          <Button variant="ghost" fullWidth onClick={() => setStep((current) => current - 1)}>
            Назад
          </Button>
        ) : null}
      </div>
    </div>
  );
}
