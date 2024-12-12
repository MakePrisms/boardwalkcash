import { useNavigate } from '@remix-run/react';
import { useForm } from 'react-hook-form';
import { PageContent } from '~/components/page';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { SettingsViewHeader } from '~/features/settings/components/settings-view-header';

type ProfileForm = {
  username: string;
};

export default function EditProfile() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: {
      username: 'satoshi', // This should come from actual user data
    },
  });
  const onSubmit = async (data: ProfileForm) => {
    try {
      // TODO: Implement username update logic
      console.log('Updating username...', data.username);
      navigate('/settings');
    } catch {
      // TODO
    }
  };

  return (
    <>
      <SettingsViewHeader title="Edit Profile" />
      <PageContent>
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
      </PageContent>
    </>
  );
}
