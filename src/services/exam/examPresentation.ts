import type { Task } from '../../types';
import type { TaskPresentation } from '../../engine';
import { shuffle } from '../../utils/shuffle';

export function buildExamPresentation(task: Task): TaskPresentation {
  switch (task.taskType) {
    case 'singleChoice':
    case 'multipleChoice':
      return { options: shuffle(task.answers ?? []) };
    case 'imageTask':
      return task.answers && task.answers.length > 0 ? { options: shuffle(task.answers) } : {};
    case 'audio':
      if (task.matchingLeft && task.matchingLeft.length > 0) {
        if (task.matchingRowOptions?.length) {
          return { matchingRowOptions: task.matchingRowOptions.map((row) => shuffle([...row])) };
        }
        return { matchingRight: shuffle(task.matchingRight ?? []) };
      }
      return { options: shuffle(task.answers ?? []) };
    case 'matching':
      if (task.matchingRowOptions?.length) {
        return { matchingRowOptions: task.matchingRowOptions.map((row) => shuffle([...row])) };
      }
      return { matchingRight: shuffle(task.matchingRight ?? []) };
    case 'ordering':
    case 'classification':
      return { items: shuffle(task.items ?? task.answers ?? []) };
    default:
      return {};
  }
}

export function buildExamPresentations(tasks: Task[]): Record<string, TaskPresentation> {
  const presentations: Record<string, TaskPresentation> = {};
  for (const task of tasks) {
    presentations[task.id] = buildExamPresentation(task);
  }
  return presentations;
}
