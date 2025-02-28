import { Check, Edit } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { useUpdateUsername, useUserProfile } from '~/features/user/user-hooks';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { username } = useUserProfile();
  const updateUsername = useUpdateUsername();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      username: username,
    },
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    isEditing && inputRef.current?.focus();
  }, [isEditing]);

  const onSubmit = async (data: FormValues) => {
    if (data.username === username) {
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
    e.preventDefault();
    setIsEditing(true);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={'flex w-full flex-col gap-2'}
    >
      <div className="flex items-center gap-2">
        <div className={cn('flex-1', animationClass)}>
          {isEditing ? (
            <input
              {...register('username')}
              ref={(e) => {
                register('username', { validate: validateUsername }).ref(e);
                // @ts-ignore: says it's readonly, but this works
                inputRef.current = e;
              }}
              type="text"
              autoComplete="username"
              className="w-full bg-transparent text-2xl text-white outline-none"
            />
          ) : (
            <span className="text-2xl text-white">{watch('username')}</span>
          )}
        </div>

        <div className="grid grid-cols-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            className={cn(isEditing && 'invisible')}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className={cn(!isEditing && 'invisible')}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {errors.username && (
        <div className="text-destructive text-sm">
          {errors.username.message}
        </div>
      )}
    </form>
  );
}
