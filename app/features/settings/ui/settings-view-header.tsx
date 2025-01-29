import {
  PageBackButton,
  type PageBackButtonProps,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';

export const SettingsViewHeader = ({
  title,
  navBack,
}: {
  title: string;
  navBack: PageBackButtonProps;
}) => {
  return (
    <PageHeader>
      <PageBackButton {...navBack} />
      <PageHeaderTitle>{title}</PageHeaderTitle>
    </PageHeader>
  );
};
