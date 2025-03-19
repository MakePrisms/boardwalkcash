import {
  ClosePageButton,
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { NotificationsList } from '~/features/notifications/notification-list';
import { useNotificationStore } from '~/features/notifications/use-notification-store';

export default function notificationsPage() {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <Page>
      <PageHeader>
        <ClosePageButton transition="slideLeft" to="/" applyTo="oldView" />
        <PageHeaderTitle>Notifications</PageHeaderTitle>
      </PageHeader>
      <PageContent className="overflow-y-auto">
        <NotificationsList notifications={notifications} />
      </PageContent>
    </Page>
  );
}
