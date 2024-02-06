import React, { useState } from 'react';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { Button, Textarea } from "flowbite-react";
import { webln } from "@getalby/sdk";

const CreateNwc = () => {
  const [connectionUri, setConnectionUri] = useState('');

  const createConnection = () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const secretHex = Buffer.from(sk).toString('hex');
    const relayUrl = encodeURIComponent('wss://nos.lol');
    const uri = `nostr+walletconnect://${pk}?relay=${relayUrl}&secret=${secretHex}&lud16=example@lightning.address`;

    localStorage.setItem('nwc_secret', secretHex);
    localStorage.setItem('nwc_connectionUri', uri);

    setConnectionUri(uri);
  };

  const handleRequest = async () => {
    const nwcUri = localStorage.getItem('nwc_connectionUri');
    const nwc = new webln.NostrWebLNProvider({
        nostrWalletConnectUrl: nwcUri!,
      }); 

    // connect to the relay
    await nwc.enable();

    console.log('nwc', nwc)

    const invoice = "lnbc100n1pjuzwqppp5vvrrgazqyffs4jvzamf7ffryjnkuscsjd4ud0qmng58eerhrvdeqdq5g9kxy7fqd9h8vmmfvdjscqzzsxqyz5vqsp50cfacecal8m8vsfm7dus634l8k9pdfhq7hwzdzzdrjdlledaz7ws9qyyssqeagjgp09ju399rpedezwlzpn4vusueuedry8fhhta72t60wctj9ht9ep3908mv7qn570y5mjln26mftg7zkx8tquplnl3fttwaq62vsq04mpy3"

    const response = await nwc.sendPayment(invoice);
  }

  return (
    <div className="flex flex-col mx-auto w-1/2 mt-16">
      <div className="w-full mb-4">
        <Button onClick={createConnection}>Create NWC</Button>
      </div>
      {connectionUri && (
        <div>
          <p>Connection URI:</p>
            <Textarea
                value={connectionUri}
                rows={4}
                readOnly
            />
        </div>
      )}
      <Button className='w-fit' onClick={handleRequest}>Request payment</Button>
    </div>
  );
};

export default CreateNwc;
