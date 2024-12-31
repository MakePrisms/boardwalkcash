import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';

export default function Scan() {
  return (
    <>
      <PageHeader>
        <ClosePageButton
          to="/receive"
          transition="slideDown"
          applyTo="oldView"
        />
        <PageHeaderTitle>Scan</PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <div>Insert QR scanner here</div>
        <div>We can scan cashu tokens to receive</div>
      </PageContent>
    </>
  );
}
