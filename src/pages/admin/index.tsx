import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from 'flowbite-react';
import Link from 'next/link';

const AdminPage = () => {
   const [password, setPassword] = useState('');
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const router = useRouter();

   useEffect(() => {
      const storedPassword = localStorage.getItem('adminPassword');
      if (storedPassword) {
         setIsLoggedIn(true);
      }
   }, []);

   const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('adminPassword', password);
      setIsLoggedIn(true);
   };

   const handleLogout = () => {
      localStorage.removeItem('adminPassword');
      setIsLoggedIn(false);
   };

   if (isLoggedIn) {
      return (
         <div className='text-2xl font-bold m-4'>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
               <Button as={Link} href='/admin/campaigns'>
                  Create Campaign
               </Button>
               <Button as={Link} href='/admin/campaigns/active'>
                  Active Campaigns
               </Button>
               <Button color={'failure'} onClick={handleLogout}>
                  Logout
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div>
         <h1 className='text-2xl font-bold m-4'>Admin Login</h1>
         <form onSubmit={handleLogin} className='px-0 sm:px-4'>
            <div className='flex space-x-4'>
               <input
                  type='password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='Enter admin password'
               />
               <Button type='submit'>Login</Button>
            </div>
         </form>
      </div>
   );
};

export default AdminPage;
