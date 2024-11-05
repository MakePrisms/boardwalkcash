import Link from 'next/link';

const UserLink = ({ username }: { username: string }) => {
   return (
      <Link
         className='underline'
         target='_blank'
         href={`/${username}`}
         rel='noreferrer'
         onClick={e => e.stopPropagation()}
      >
         {username}
      </Link>
   );
};

export default UserLink;
