import { useToast } from '@/hooks/util/useToast';
import { RootState } from '@/redux/store';
import { ShareIcon } from '@heroicons/react/20/solid';
import { useSelector } from 'react-redux';
import { useState } from 'react';
import { TextInput } from 'flowbite-react';
import ViewContactsButton from './ViewContactsButton';

const ProfileSettings = () => {
   const { username, pubkey } = useSelector((state: RootState) => state.user);
   const { addToast } = useToast();
   const [isEditing, setIsEditing] = useState(false);
   const [newUsername, setNewUsername] = useState(username);

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
      const res = await fetch(`/api/users/${pubkey}`, {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            username: newUsername,
         }),
      });
      if (res.status === 200) {
         addToast('Username updated', 'success');
         setIsEditing(false);
      }
      if (res.status === 409) {
         addToast('Username already taken', 'error');
      }
   };

   return (
      <div>
         <div className='flex justify-between mb-9'>
            <div className='flex items-center space-x-4'>
               {isEditing ? (
                  <TextInput
                     type='text'
                     value={newUsername}
                     onChange={e => setNewUsername(e.target.value)}
                     className='text-black'
                  />
               ) : (
                  <div>{username}</div>
               )}
               <button
                  onClick={() => {
                     if (isEditing) {
                        handleUpdateUsername();
                     } else {
                        setIsEditing(true);
                     }
                  }}
                  className='text-sm underline'
               >
                  {isEditing ? 'Save' : 'Edit'}
               </button>
            </div>
            <button className='mr-3' onClick={handleShareLink}>
               {<ShareIcon className='size-4' />}
            </button>
         </div>
         <ViewContactsButton />
      </div>
   );
};

export default ProfileSettings;
