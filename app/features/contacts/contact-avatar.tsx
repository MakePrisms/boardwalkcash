import { cn } from '~/lib/utils';
import type { Contact } from './contact';

const getInitials = (username: string) => {
  return username.slice(0, 2).toUpperCase();
};

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  lg: 'h-20 w-20 text-2xl',
};

type Props = {
  contact: Contact;
  size?: keyof typeof sizeClasses;
};

export function ContactAvatar({ contact, size = 'sm' }: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground',
        sizeClasses[size],
      )}
    >
      {getInitials(contact.username)}
    </div>
  );
}
