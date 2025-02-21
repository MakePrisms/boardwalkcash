import { Check, Edit } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { useUserStore } from '~/features/user/user-provider';
import useAnimation from '~/hooks/use-animation';
import { useToast } from '~/hooks/use-toast';
import { cn } from '~/lib/utils';

type State = {
  isEditing: boolean;
  editedUsername: string;
};

type Props = {
  className?: string;
};

export default function EditableUsername({ className }: Props) {
  const { animationClass, start: startAnimation } = useAnimation({
    name: 'slam',
  });
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useUserStore((s) => s.user);
  const updateUsername = useUserStore((s) => s.updateUsername);
  const [state, setState] = useState<State>({
    isEditing: false,
    editedUsername: user.username,
  });

  useEffect(() => {
    state.isEditing && inputRef.current?.focus();
  }, [state.isEditing]);

  const handleUpdate = async () => {
    if (state.editedUsername === user.username) {
      setState({ ...state, isEditing: false });
      return;
    }

    try {
      await updateUsername(state.editedUsername);
      startAnimation();
      setState({ ...state, isEditing: false });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update username',
      });
    }
  };

  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      <div className={cn('flex-1', animationClass)}>
        {state.isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={state.editedUsername}
            onChange={(e) =>
              setState({ ...state, editedUsername: e.target.value })
            }
            className="w-full bg-transparent text-2xl text-white outline-none"
          />
        ) : (
          <span className="text-2xl text-white">{user.username}</span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={
          state.isEditing
            ? handleUpdate
            : () => setState({ ...state, isEditing: true })
        }
      >
        {state.isEditing ? (
          <Check className="h-4 w-4" />
        ) : (
          <Edit className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
