import agicashLoadingLogo from '~/assets/full_logo.png';

export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <img
        src={agicashLoadingLogo}
        alt="Agicash Loading Logo"
        width={250}
        className="mb-10"
      />
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="mb-10">Loading...</div>
    </div>
  );
}
