import React from 'react';

interface RadioButtonProps {
   selected: boolean;
   onChange?: () => void;
   color?: string;
   size?: number;
}

const RadioButton: React.FC<RadioButtonProps> = ({
   selected,
   onChange,
   color = '#000000',
   size = 18,
}) => {
   return (
      <div
         onClick={onChange}
         className={`border-cyan-teal`}
         style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `2px solid #26a69a`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
         }}
      >
         {selected && (
            <div
               className={`bg-${color}`}
               style={{
                  width: size / 2,
                  height: size / 2,
                  borderRadius: '50%',
               }}
            />
         )}
      </div>
   );
};

export default RadioButton;
