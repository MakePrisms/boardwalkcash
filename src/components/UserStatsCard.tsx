import { GiftMetrics } from '@/types';
import { formatCents } from '@/utils/formatting';
import { Card } from 'flowbite-react';

interface UserStatsCardProps {
   title: string;
   userData: GiftMetrics;
   onRowClick: (giftCount: { [giftName: string]: number }) => void;
}

const UserStatsCard = ({ userData, onRowClick, title }: UserStatsCardProps) => (
   <Card
      onClick={() => onRowClick(userData.giftCount)}
      className='transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:cursor-pointer'
   >
      <h3 className='text-xl mb-2'>{title}</h3>
      <p>Total: {userData?.total || 0}</p>
      <p>Amount: {formatCents(userData?.totalAmountCents)}</p>
   </Card>
);

export default UserStatsCard;
