const ReserveDocsPage = () => {
   return (
      <main className='flex flex-col md:flex-row items-center justify-center mx-auto min-h-screen'>
         <div className='w-full md:w-1/2 space-y-4 p-5'>
            <h2 className='underline text-2xl'>Reserve</h2>
            <p>
               Boardwalk Reserve enables you to use your lightning wallet as the funding source for
               your eCash transactions. A Reserve is similar to a Cashu Mint, except only you can
               mint eCash tokens. No one else can create eCash tokens linked to your lightning
               wallet.
            </p>
            <p>
               You can link a lightning wallet using Nostr Wallet Connect (“NWC”). Reserve works
               best with{' '}
               <a href='https://getalby.com' target='__blank' className='link'>
                  Alby
               </a>{' '}
               and{' '}
               <a href='https://umbrel.com' target='__blank' className='link'>
                  Umbrel
               </a>{' '}
               or{' '}
               <a href='https://start9.com' target='__blank' className='link'>
                  Start9
               </a>{' '}
               running the NWC app.
            </p>
            <p>
               You are responsible for ensuring your Reserve has sufficient bitcoin to complete any
               future bitcoin withdrawals. Anyone that has eCash tokens linked to your Reserve can
               send a request to withdraw the equivalent amount of bitcoin from your lightning
               wallet at any point in the future. Your eCash tokens are denominated in USD and your
               lightning wallet may be denominated in bitcoin. You should ensure there is sufficient
               coverage for any changes in exchange rates.
            </p>
            <p>
               Reserve is a highly experimental product based on the Cashu and Nostr protocols which
               are still extremely early in development. This functionality will certainly change in
               the near future and your Reserve may no longer work. Do not plan to use a Reserve for
               an extended period of time. Only use small amounts that you are willing to lose and
               be sure to set a small NWC budget.
            </p>
         </div>
      </main>
   );
};

export default ReserveDocsPage;
