import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/ui';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist or you do not have access to it."
      action={<Link to="/" className="btn btn-primary">Back to dashboard</Link>}
    />
  );
}
