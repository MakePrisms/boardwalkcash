import Image from 'next/image';
import { Button } from 'flowbite-react';

const ZapBotButton = () => {
   const discordLogo = '/discord-logo.png';
   const discordInviteLink = process.env.NEXT_PUBLIC_ZAP_BOT_INVITE_LINK;

   return (
      <a className='mb-6 md:mb-8' href={discordInviteLink} target='__blank'>
         <Button className='bg-transparent border-white hover:bg-cyan-teal'>
            <strong>Add Zap Bot</strong>
            <Image className='ms-2' src={discordLogo} alt='Discord Logo' width={30} height={30} />
         </Button>
      </a>
   );
};

export default ZapBotButton;
