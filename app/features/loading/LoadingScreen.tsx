import agicashLoadingLogo from '~/assets/agicash-loading-logo.png';
export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <img src={agicashLoadingLogo} alt="Agicash Loading Logo" width={250} className='mb-10'/>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="mx-auto flex h-screen w-full items-center justify-center px-4 sm:max-w-sm">
      <div>Loading...</div>
    </div>
  );
}
