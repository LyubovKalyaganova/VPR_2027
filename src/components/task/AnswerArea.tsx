import type { Task } from '../../types';
import type { TaskPresentation, UserAnswer } from '../../engine';
import { ClassificationAnswer } from './answers/ClassificationAnswer';
import { FillBlankAnswer } from './answers/FillBlankAnswer';
import { MatchingAnswer } from './answers/MatchingAnswer';
import { MultipleChoiceAnswer } from './answers/MultipleChoiceAnswer';
import { NumberAnswer } from './answers/NumberAnswer';
import { OrderingAnswer } from './answers/OrderingAnswer';
import { ShortAnswer } from './answers/ShortAnswer';
import { SingleChoiceAnswer } from './answers/SingleChoiceAnswer';

interface AnswerAreaProps {
  task: Task;
  presentation: TaskPresentation;
  answer: UserAnswer;
  disabled: boolean;
  onChange: (answer: UserAnswer) => void;
}

export function AnswerArea({ task, presentation, answer, disabled, onChange }: AnswerAreaProps) {
  switch (task.taskType) {
    case 'singleChoice':
      return (
        <SingleChoiceAnswer
          options={presentation.options ?? task.answers ?? []}
          value={typeof answer === 'string' ? answer : null}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'multipleChoice':
      return (
        <MultipleChoiceAnswer
          options={presentation.options ?? task.answers ?? []}
          value={Array.isArray(answer) ? answer : []}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'shortAnswer':
      return (
        <ShortAnswer value={typeof answer === 'string' ? answer : ''} disabled={disabled} onChange={onChange} />
      );
    case 'numberAnswer':
      return (
        <NumberAnswer
          value={typeof answer === 'string' || typeof answer === 'number' ? String(answer) : ''}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'matching':
      return (
        <MatchingAnswer
          left={task.matchingLeft ?? []}
          right={presentation.matchingRight ?? task.matchingRight ?? []}
          value={answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {}}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'ordering':
      return (
        <OrderingAnswer
          items={presentation.items ?? task.items ?? []}
          value={Array.isArray(answer) ? answer : []}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'classification':
      return (
        <ClassificationAnswer
          items={presentation.items ?? task.items ?? []}
          categories={task.categories ?? []}
          value={answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {}}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'fillBlank':
      return (
        <FillBlankAnswer value={typeof answer === 'string' ? answer : ''} disabled={disabled} onChange={onChange} />
      );
    case 'imageTask': {
      const options = presentation.options ?? task.answers ?? [];
      if (options.length > 0) {
        return (
          <SingleChoiceAnswer
            options={options}
            value={typeof answer === 'string' ? answer : null}
            disabled={disabled}
            onChange={onChange}
          />
        );
      }
      if (typeof task.correctAnswer === 'number') {
        return (
          <NumberAnswer
            value={typeof answer === 'string' || typeof answer === 'number' ? String(answer) : ''}
            disabled={disabled}
            onChange={onChange}
          />
        );
      }
      return (
        <ShortAnswer value={typeof answer === 'string' ? answer : ''} disabled={disabled} onChange={onChange} />
      );
    }
    default:
      return <p>Этот тип задания появится позже.</p>;
  }
}
