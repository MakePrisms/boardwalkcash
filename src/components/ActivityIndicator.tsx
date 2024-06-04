import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spinner } from 'flowbite-react';
import { resetStatus } from '@/redux/slices/ActivitySlice';
import { RootState } from '@/redux/store';

const ActivityIndicator = () => {
   const [processing, setProcessing] = useState<boolean>(false);

   const { status, data } = useSelector((state: RootState) => state.activity);

   const dispatch = useDispatch();

   const resetTimeout = useRef<NodeJS.Timeout | number | null>(null);

   useEffect(() => {
      resetTimeout.current && clearTimeout(resetTimeout.current);

      // Set processing to true if status is sending or receiving
      setProcessing(status === 'sending' || status === 'receiving');

      // If status is success or error, reset status after x seconds
      if (status === 'success' || status === 'error') {
         resetTimeout.current = setTimeout(() => {
            dispatch(resetStatus());
         }, 10_000);
      }
   }, [status, data]);

   return (
      <div className='flex flex-row justify-around mx-10 mb-10 items-center text-center'>
         {processing ? (
            <>
               <p className='mt-1'>{data.message}&nbsp;</p>
               <Spinner size='lg' />
            </>
         ) : (
            <>
               <p className={`${status === 'error' ? 'text-red-600' : 'text-green-400'}`}>
                  {data.message}&nbsp;
               </p>
            </>
         )}
      </div>
   );
};

export default ActivityIndicator;
