import agicashLoadingLogo from '~/assets/agicash-loading-logo.png';

export function LoadingScreen() {
  return (
    <div className="mx-auto flex h-screen w-full items-center justify-center px-4 sm:max-w-sm">
      <img src={agicashLoadingLogo} alt="Agicash Loading Logo" />
    </div>
  );
}
