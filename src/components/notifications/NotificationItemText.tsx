interface NotificationItemTextProps {
   text: string;
   time: string;
}

const NotificationItemText = ({ text, time }: NotificationItemTextProps) => {
   return (
      <div className='flex flex-row justify-between'>
         <div className='font-semibold'>{text}</div>
         <div className='ml-2'>{time}</div>
      </div>
   );
};

export default NotificationItemText;
