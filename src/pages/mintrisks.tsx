const MintRisksPage = () => {
   return (
      <main className='flex flex-col items-center justify-center mx-auto min-h-screen'>
         <div className='mb-5 max-w-md'>
            <h2 className='text-2xl underline mb-2'>Mint Risks</h2>
            <p className='text-white'>
               Boardwalk Cash requires adding a mint. Mints issue ecash tokens and are responsible
               for providing validation and liquidity. Before you add a mint, make sure you are
               aware of the risks associated with the specific mint and only put in what you can
               afford to lose! This wallet, most mints and the Cashu protocol are still
               experimental.
            </p>
         </div>
      </main>
   );
};

export default MintRisksPage;
