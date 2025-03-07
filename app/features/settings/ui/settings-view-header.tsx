import {
  PageBackButton,
  type PageBackButtonProps,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';

export const SettingsViewHeader = ({
  title,
  navBack,
  children,
}: {
  title: string;
  navBack: PageBackButtonProps;
  children?: React.ReactNode;
}) => {
  return (
    <PageHeader>
      <PageBackButton {...navBack} />
      <PageHeaderTitle>{title}</PageHeaderTitle>
      {children}
    </PageHeader>
  );
};
