import useLeaderboard from '@/hooks/boardwalk/useLeaderboard';
import { checkboxTheme } from '@/themes/checkboxTheme';
import { Button, Checkbox, Label } from 'flowbite-react';

interface LeaderboardSettingsProps {
   onOpenModal: () => void;
}

const LeaderboardSettings = ({ onOpenModal }: LeaderboardSettingsProps) => {
   const { hideFromLeaderboard, updateHideFromLeaderboard } = useLeaderboard();

   return (
      <div className='flex justify-around'>
         <div className='flex items-center gap-2'>
            <Checkbox
               theme={checkboxTheme}
               id='stay-anonymous'
               checked={hideFromLeaderboard}
               onChange={() => updateHideFromLeaderboard(!hideFromLeaderboard)}
            />
            <Label className='text-white' htmlFor='stay-anonymous'>
               Hide my stats
            </Label>
         </div>

         <Button className='btn-primary' onClick={onOpenModal}>
            View Stats
         </Button>
      </div>
   );
};

export default LeaderboardSettings;
