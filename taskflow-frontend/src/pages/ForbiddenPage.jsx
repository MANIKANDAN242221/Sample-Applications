import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/ui';

export default function ForbiddenPage() {
  return (
    <EmptyState
      title="Access denied"
      description="Your role does not have permission to view this page."
      action={<Link to="/" className="btn btn-primary">Back to dashboard</Link>}
    />
  );
}
