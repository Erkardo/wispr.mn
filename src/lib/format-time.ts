import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';

export function formatTimeAgo(date: Date): string {
  if (!date) return '';
  return formatDistanceToNow(date, { addSuffix: true, locale: mn });
}
