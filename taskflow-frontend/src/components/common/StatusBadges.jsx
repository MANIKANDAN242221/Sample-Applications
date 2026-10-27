import { labelOf, TASK_PRIORITIES, TASK_STATUSES } from '../../constants';
import { Badge } from './ui';

const STATUS_TONE = { todo: 'neutral', in_progress: 'info', in_review: 'warning', done: 'success' };
const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger' };
const ROLE_TONE = { admin: 'danger', manager: 'info', member: 'neutral' };

export const TaskStatusBadge = ({ status }) => (
  <Badge tone={STATUS_TONE[status]}>{labelOf(TASK_STATUSES, status)}</Badge>
);

export const PriorityBadge = ({ priority }) => (
  <Badge tone={PRIORITY_TONE[priority]}>{labelOf(TASK_PRIORITIES, priority)}</Badge>
);

export const RoleBadge = ({ role }) => <Badge tone={ROLE_TONE[role]}>{role}</Badge>;
