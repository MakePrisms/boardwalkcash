import { useToast } from '@/hooks/util/useToast';
import { RootState } from '@/redux/store';
import { ShareIcon } from '@heroicons/react/20/solid';
import { useSelector } from 'react-redux';

const ProfileSettings = () => {
   const username = useSelector((state: RootState) => state.user.username);
   const { addToast } = useToast();
   const handleShareLink = () => {
      const url = `${window.location.protocol}//${window.location.host}/${username}`;
      navigator.clipboard.writeText(url);
      addToast('Profile link copied to clipboard', 'success');
   };

   return (
      <div className='flex justify-between mb-9'>
         <div>{username}</div>
         <button className='mr-3' onClick={handleShareLink}>
            {<ShareIcon className='size-4' />}
         </button>
      </div>
   );
};

export default ProfileSettings;
