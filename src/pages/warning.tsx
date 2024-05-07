const WarningPage = () => {
   return (
      <main className='flex flex-col md:flex-row items-center justify-center mx-auto min-h-screen'>
         <div className='w-full md:w-1/2 space-y-4 p-5'>
            <h2 className='underline text-2xl'>Warning!</h2>
            <p>
               Boardwalk Cash is a self-custodial ecash wallet that lets you send and receive
               dollar-denominated ecash instantly and privately built on top of bitcoin lightning
               wallets that have integrated the Cashu protocol.
            </p>
            <p>
               Boardwalk Cash is in early BETA! We hold no responsibility for people losing access
               to funds. Use at your own risk!
            </p>
            <p>
               Boardwalk Cash is an experimental wallet based on the Cashu and Nostr protocols which
               are both still extremely early in development and subject to changes without warning.
            </p>
            <p>
               Boardwalk Cash operates on your browser and all information is stored on the local
               storage of your browser. The tokens are bearer tokens, which mean if you lose access
               to your tokens, there is no way to recover them. You should not use a private window,
               or the cache might get cleared. Also, before deleting your browser history or cache,
               you should backup your tokens.
            </p>
            <p>
               Terms of service can be found at{' '}
               <a className='text-cyan-teal underline' href='https://www.makeprisms.com/terms'>
                  https://www.makeprisms.com/terms
               </a>
            </p>
         </div>
      </main>
   );
};

export default WarningPage;
