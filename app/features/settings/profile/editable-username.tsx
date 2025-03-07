import { Check, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateUsername, useUser } from '~/features/user/user-hooks';
import useAnimation from '~/hooks/use-animation';
import { useToast } from '~/hooks/use-toast';
import { cn } from '~/lib/utils';

// Reserved routes that can't be used as usernames
// QUESTION: can we do this more efficiently so that
// we don't have to update for every new route?
const RESERVED_ROUTES = [
  'settings',
  'profile',
  'login',
  'signup',
  'api',
  'admin',
  'help',
  'about',
  'terms',
  'privacy',
  'receive',
  'send',
  'verify-email',
];

type FormValues = {
  username: string;
};

function validateUsername(username: string) {
  // Check length (3-20 characters)
  if (username.length < 3 || username.length > 20) {
    return 'Username must be between 3 and 20 characters';
  }

  // Check characters (only a-z, 0-9, underscore, hyphen allowed)
  // This requirement comes from LUD16 https://github.com/lnurl/luds/blob/luds/16.md
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return 'Username can only contain lowercase letters, numbers, underscores and hyphens';
  }

  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    return 'This username is not available';
  }

  return true;
}

export default function EditableUsername() {
  const { animationClass, start: startAnimation } = useAnimation({
    name: 'slam',
    durationMs: 400,
  });
  const { toast } = useToast();
  const user = useUser();
  const updateUsername = useUpdateUsername();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<FormValues>({
    defaultValues: {
      username: user.username,
    },
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    isEditing && setFocus('username');
  }, [isEditing, setFocus]);

  const onSubmit = async (data: FormValues) => {
    if (data.username === user.username) {
      setIsEditing(false);
      return;
    }

    try {
      await updateUsername(data.username);
      startAnimation();
      setIsEditing(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update username',
      });
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    // Prevent default to avoid form submission
    e.preventDefault();
    setIsEditing(true);
  };

  const textSize = user.username.length > 12 ? 'text-xl' : 'text-2xl';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={'flex w-full flex-col gap-2'}
    >
      <div className="flex items-center gap-2">
        <div className={cn('flex-1', animationClass)}>
          {isEditing ? (
            <input
              {...register('username', { validate: validateUsername })}
              type="text"
              autoComplete="username"
              className={cn(
                'w-full bg-transparent text-white outline-none',
                textSize,
              )}
            />
          ) : (
            <span className={cn('text-white', textSize)}>{user.username}</span>
          )}
        </div>

        <button
          type={isEditing ? 'submit' : 'button'}
          onClick={isEditing ? undefined : handleEditClick}
        >
          {isEditing ? (
            <Check className="h-4 w-4" />
          ) : (
            <Edit className="h-4 w-4" />
          )}
        </button>
      </div>

      {errors.username && (
        <div className="text-destructive text-sm">
          {errors.username.message}
        </div>
      )}
    </form>
  );
}
