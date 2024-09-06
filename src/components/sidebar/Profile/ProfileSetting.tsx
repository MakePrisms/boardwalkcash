import { useToast } from '@/hooks/util/useToast';
import { RootState, useAppDispatch } from '@/redux/store';
import { CheckIcon, ShareIcon } from '@heroicons/react/20/solid';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { useSelector } from 'react-redux';
import { useState } from 'react';
import { Spinner, TextInput } from 'flowbite-react';
import ViewContactsButton from './ViewContactsButton';
import { updateUsernameAction } from '@/redux/slices/UserSlice';
import { HttpResponseError, updateUser } from '@/utils/appApiRequests';
import DiscoverButton from './DiscoverButton';
const ProfileSettings = () => {
   const { username, pubkey } = useSelector((state: RootState) => state.user);
   const { addToast } = useToast();
   const [isEditing, setIsEditing] = useState(false);
   const [isSavingUsername, setIsSavingUsername] = useState(false);
   const [newUsername, setNewUsername] = useState(username);

   const dispatch = useAppDispatch();

   const handleShareLink = () => {
      const url = `${window.location.protocol}//${window.location.host}/${username}`;
      navigator.clipboard.writeText(url);
      addToast('Profile link copied to clipboard', 'success');
   };

   function validateUsername(username: string) {
      // Convert to lowercase for case-insensitivity
      username = username.toLowerCase();

      // Check length
      if (username.length < 3 || username.length > 30) {
         return 'Username must be between 3 and 30 characters long.';
      }

      // Check if it starts and ends with alphanumeric character
      if (!/^[a-z0-9].*[a-z0-9]$/.test(username)) {
         return 'Username must start and end with a letter or number.';
      }

      // Check for valid characters
      if (!/^[a-z0-9_-]+$/.test(username)) {
         return 'Username can only contain letters, numbers, underscores, and hyphens.';
      }

      // Check for consecutive underscores or hyphens
      if (/__|--/.test(username)) {
         return 'Username cannot contain consecutive underscores or hyphens.';
      }

      const reservedWords = [
         'api',
         '_app',
         '_document',
         'already-running',
         'connect',
         'index',
         'mintrisks',
         'setup',
         'wallet',
         'warning',
         'admin',
         'root',
         'system',
         'support',
         'help',
         'info',
         'leaderboard',
      ];
      if (reservedWords.includes(username)) {
         return 'This username is reserved and cannot be used.';
      }

      return true;
   }

   const handleUpdateUsername = async () => {
      if (!newUsername) {
         addToast('Username cannot be empty', 'error');
         return;
      }
      if (newUsername === username) {
         setIsEditing(false);
         return;
      }
      const valid = validateUsername(newUsername);
      if (typeof valid === 'string') {
         addToast(valid, 'error');
         return;
      }
      setIsSavingUsername(true);
      try {
         await updateUser(pubkey!, { username: newUsername });

         addToast('Username updated', 'success');
         setIsEditing(false);
         dispatch(updateUsernameAction(newUsername));
      } catch (error: any) {
         if (error instanceof HttpResponseError) {
            if (error.status === 409) {
               addToast('Username already taken', 'error');
            } else {
               addToast(error.message, 'error');
            }
         } else {
            addToast('Error updating username', 'error');
         }
      }
      setIsSavingUsername(false);
   };

   return (
      <div>
         <div className='flex justify-between mb-9'>
            <div className='flex items-center space-x-4'>
               {isEditing ? (
                  <TextInput
                     type='text'
                     value={newUsername}
                     onChange={e => setNewUsername(e.target.value.toLowerCase())}
                     className='text-black'
                  />
               ) : (
                  <div className='font-bold text-lg'>{username}</div>
               )}
               <button
                  onClick={() => {
                     if (isEditing) {
                        handleUpdateUsername();
                     } else {
                        setIsEditing(true);
                     }
                  }}
               >
                  {isSavingUsername ? (
                     <Spinner size='sm' />
                  ) : isEditing ? (
                     <CheckIcon className='h-5 w-5' />
                  ) : (
                     <PencilSquareIcon className='h-5 w-5' />
                  )}
               </button>
            </div>
            <button className='mr-3' onClick={handleShareLink}>
               {<ShareIcon className='size-6' />}
            </button>
         </div>
         <div className='flex justify-between align-middle mb-9 space-x-4'>
            <DiscoverButton className='w-1/3' />
            <ViewContactsButton className='w-1/3' />
         </div>
      </div>
   );
};

export default ProfileSettings;
