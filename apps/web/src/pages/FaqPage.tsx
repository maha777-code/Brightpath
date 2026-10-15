import { Link } from 'react-router-dom';
import { PolicyLayout } from '@/components/PolicyLayout';
import { FaqList } from '@/components/landing/FaqList';

export default function FaqPage() {
  return (
    <PolicyLayout title="Frequently asked questions" lastUpdated="October 2026" wide>
      <p>Straight answers on privacy, accuracy, cheating and cost.</p>

      <FaqList />

      <p>
        Still have a question?{' '}
        <Link to="/contact" className="font-semibold text-cyan-400 underline-offset-4 hover:underline">
          Contact us
        </Link>
        .
      </p>
    </PolicyLayout>
  );
}
