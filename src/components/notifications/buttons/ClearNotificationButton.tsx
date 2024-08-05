interface ClearNotificationButtonProps {
   clearNotification: () => void;
}

const ClearNotificationButton = ({ clearNotification }: ClearNotificationButtonProps) => {
   const handleClearNotification = async () => {
      clearNotification();
   };

   return (
      <button className='btn-notification' onClick={handleClearNotification}>
         clear
      </button>
   );
};

export default ClearNotificationButton;
