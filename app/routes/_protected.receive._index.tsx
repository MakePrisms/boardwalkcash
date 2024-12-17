import { useOutletContext } from '@remix-run/react';
import { Clipboard, QrCode, Scan } from 'lucide-react';
import { useState } from 'react';
import { type InputUnit, Numpad, NumpadInput } from '~/components/numpad';
import {
  ClosePageButton,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from '~/components/page';
import { Button } from '~/components/ui/button';
import { type ExchangeRates, convertToUnit } from '~/lib/exchange-rate';

export default function ReceiveIndex() {
  const [amountInput, setAmountInput] = useState('');
  const { rates } = useOutletContext<{ rates: ExchangeRates }>();

  const [unit] = useState<InputUnit>('sat');

  const handleContinue = async () => {
    const numericAmount = Number(amountInput);
    const toUnit = unit === 'usd' ? 'cent' : 'sat';
    const amount = convertToUnit(numericAmount, unit, toUnit);
    console.log(amount);
  };

  return (
    <>
      <PageHeader>
        <ClosePageButton to="/" transition="slideDown" applyTo="oldView" />
        <PageHeaderTitle>Receive</PageHeaderTitle>
      </PageHeader>
      <PageContent className="flex flex-col items-center justify-between">
        <NumpadInput value={amountInput} unit={unit} rates={rates} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-4">
              <Clipboard />
              <Scan />
              <QrCode />
            </div>
            <Button onClick={handleContinue}>Continue</Button>
          </div>
          {/* QUESTION: should this always be hidden on big screens? 
             If so, should we move the hidden class into the numpad component? */}
          <div className="sm:hidden">
            <Numpad
              value={amountInput}
              onValueChange={setAmountInput}
              showDecimal={unit === 'usd'}
            />
          </div>
        </div>
      </PageContent>
    </>
  );
}
