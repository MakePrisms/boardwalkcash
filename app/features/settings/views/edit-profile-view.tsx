import { useForm } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { SidebarContent } from '~/components/ui/sidebar';
import { useToast } from '~/hooks/use-toast';
import { SettingsViewHeader } from '../components/settings-view-header';
import { useSettingsSidebar } from '../settings-sidebar-provider';

type ProfileForm = {
  username: string;
};

export function EditProfileView() {
  const { navigateToView } = useSettingsSidebar();
  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: {
      username: 'satoshi', // This should come from actual user data
    },
  });
  const { toast } = useToast();

  const onSubmit = async (data: ProfileForm) => {
    try {
      // TODO: Implement username update logic
      console.log('Updating username...', data.username);
      toast({
        title: 'Profile updated successfully',
        description: 'Your username has been updated',
      });
      navigateToView('main');
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error! Profile update failed',
        description: 'Please try again later or contact support',
      });
    }
  };

  return (
    <>
      <SettingsViewHeader title="Edit Profile" />
      <SidebarContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="font-medium text-sm">
              Username
            </label>
            <Input
              id="username"
              {...register('username', { required: true })}
              placeholder="Enter your username"
            />
          </div>
          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </SidebarContent>
    </>
  );
}
