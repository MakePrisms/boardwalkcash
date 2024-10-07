const WarningPage = () => {
   return (
      <main className='flex flex-col md:flex-row items-center justify-center mx-auto min-h-screen'>
         <div className='w-full md:w-1/2 space-y-4 p-5'>
            <h2 className='underline text-2xl'>Warning!</h2>
            <p>
               Boardwalk Cash is a self-custodial wallet that enables you to manage payments on your
               own device.
            </p>
            <p>
               Boardwalk Cash supports ecash wallet functionality specified in the Cashu protocol.
               Boardwalk Cash does not offer mint functionality and users are required to choose
               their own mints which serve as third-party custodians. Ecash tokens and private keys
               are stored on your device and Boardwalk Cash has no access to or backup of these
               items.
            </p>
            <p>
               Boardwalk Cash supports Lightning payment functionality specified in the Nostr Wallet
               Connect specification for sending payments and the LNURL Lightning Address
               specification for receiving payments. The NWC access tokens are stored on your device
               and Boardwalk Cash has no access to or backup of the tokens.
            </p>
            <p>
               Boardwalk Cash is in early BETA! We hold no responsibility for people losing access
               to funds. Use at your own risk!
            </p>
            <p>
               Boardwalk Cash is an experimental wallet based on the Cashu, Nostr and LNURL
               protocols which are all still extremely early in development and subject to changes
               without warning.
            </p>
            <p>
               Boardwalk Cash operates on your browser and all information is stored on the local
               storage of your browser on your device. The ecash and NWC tokens are bearer tokens,
               which means if you lose access to your tokens, there is no way to recover them. You
               should not use a private window, or the cache might get cleared. Also, before
               deleting your browser history or cache, you should backup your tokens.
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
