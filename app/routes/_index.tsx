import type { MetaFunction } from '@remix-run/node';
import { Button } from '~/components/ui/button';
import { SettingsSidebar } from '~/features/settings/settings-sidebar';

export const meta: MetaFunction = () => {
  return [
    { title: 'Boardwalk' },
    { name: 'description', content: 'Welcome to Boardwalk!' },
  ];
};

export default function Index() {
  return (
    <div>
      <h1>Welcome to Boardwalk!</h1>
      <div className="flex flex-row gap-2">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost">Ghost</Button>
        <SettingsSidebar />
      </div>
    </div>
  );
}
