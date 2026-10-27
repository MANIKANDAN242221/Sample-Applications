import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/ui';
import { PriorityBadge } from '../../components/common/StatusBadges';
import { TASK_STATUSES } from '../../constants';
import { formatDate, isOverdue } from '../../utils/format';

/**
 * @param {object}   props
 * @param {object[]} props.tasks
 * @param {boolean}  props.showProject      show a project column linking to the project
 * @param {(task, status) => void} [props.onStatusChange]  omit to make status read-only
 * @param {(task) => void}         [props.onEdit]
 * @param {(task) => void}         [props.onDelete]
 * @param {(task) => boolean}      [props.canDelete]
 */
function TaskTableComponent({ tasks, showProject, onStatusChange, onEdit, onDelete, canDelete = () => false }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Title</th>
            {showProject && <th scope="col">Project</th>}
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Assignee</th>
            <th scope="col">Due</th>
            {(onEdit || onDelete) && <th scope="col" className="actions-col"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td className="title-cell">{task.title}</td>
              {showProject && (
                <td>
                  <Link to={`/projects/${task.projectId}`}>{task.projectName}</Link>
                </td>
              )}
              <td>
                {onStatusChange ? (
                  <select
                    className="input input-compact"
                    aria-label={`Status of ${task.title}`}
                    value={task.status}
                    onChange={(e) => onStatusChange(task, e.target.value)}
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  task.status
                )}
              </td>
              <td>
                <PriorityBadge priority={task.priority} />
              </td>
              <td>{task.assigneeName ?? <span className="muted">Unassigned</span>}</td>
              <td className={isOverdue(task) ? 'overdue' : undefined}>
                {formatDate(task.dueDate)}
                {isOverdue(task) && <span className="sr-only"> (overdue)</span>}
              </td>
              {(onEdit || onDelete) && (
                <td className="actions-col">
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
                      Edit
                    </Button>
                  )}
                  {onDelete && canDelete(task) && (
                    <Button variant="ghost-danger" size="sm" onClick={() => onDelete(task)}>
                      Delete
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const TaskTable = memo(TaskTableComponent);
