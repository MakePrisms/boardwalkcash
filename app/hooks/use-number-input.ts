import { useEffect, useState } from 'react';
import type { NumpadButton } from '~/components/numpad';
import type { Currency } from '~/lib/money';
import { Money, getLocaleDecimalSeparator } from '~/lib/money';
import { getUnit } from '~/utils';
import { useExchangeRate } from './use-exchange-rate';

type InputState = {
  /** The active input */
  active: {
    value: string;
    currency: Currency;
  };
  /** The converted input */
  other: {
    value: string;
    currency: Currency;
  };
};

export function useNumberInput(
  initialValue: string,
  initialCurrency: Currency,
  initialOtherCurrency: Currency,
) {
  const [inputState, setInputState] = useState<InputState>({
    active: { value: initialValue, currency: initialCurrency },
    other: { value: '0', currency: initialOtherCurrency },
  });

  const {
    rate,
    isLoading: isExchangeRateLoading,
    error: exchangeRateError,
  } = useExchangeRate(
    `${inputState.active.currency}-${inputState.other.currency}`,
  );

  const inputMoney = new Money({
    amount: inputState.active.value,
    currency: inputState.active.currency,
    unit: getUnit(inputState.active.currency),
  });

  const otherMoney = new Money({
    amount: inputState.other.value,
    currency: inputState.other.currency,
    unit: getUnit(inputState.other.currency),
  });

  // Update the converted value when the exchange rate changes
  useEffect(() => {
    if (rate) {
      const convertedValue = new Money({
        amount: inputState.active.value,
        currency: inputState.active.currency,
        unit: getUnit(inputState.active.currency),
      })
        .convert(inputState.other.currency, rate)
        .toString(getUnit(inputState.other.currency));

      setInputState((prev) => ({
        ...prev,
        other: { ...prev.other, value: convertedValue },
      }));
    }
  }, [
    rate,
    inputState.active.value,
    inputState.active.currency,
    inputState.other.currency,
  ]);

  const maxInputDecimals = inputMoney.getMaxDecimals(
    getUnit(inputState.active.currency),
  );

  const handleSetValue = (newValue: string) => {
    if (!rate) {
      setInputState((prev) => ({
        active: { ...prev.active, value: newValue },
        other: { ...prev.other, value: '0' },
      }));
      return;
    }

    const convertedValue = new Money({
      amount: newValue,
      currency: inputState.active.currency,
      unit: getUnit(inputState.active.currency),
    })
      .convert(inputState.other.currency, rate)
      .toString(getUnit(inputState.other.currency));

    setInputState((prev) => ({
      active: { ...prev.active, value: newValue },
      other: { ...prev.other, value: convertedValue },
    }));
  };

  /** Updates the input value or calls onInvalidInput if the input is invalid */
  const handleNumberInput = (
    input: NumpadButton,
    onInvalidInput: () => void,
  ) => {
    const currentValue = inputState.active.value;
    const decimalSeparator = getLocaleDecimalSeparator();

    if (input === 'Backspace') {
      if (currentValue === '0') {
        return onInvalidInput();
      }

      const newValue =
        currentValue.length === 1 ? '0' : currentValue.slice(0, -1);
      return handleSetValue(newValue);
    }

    const valueHasDecimal = currentValue.includes('.');

    if (input === decimalSeparator) {
      // Only add decimal if one doesn't exist yet
      return valueHasDecimal
        ? onInvalidInput()
        : handleSetValue(`${currentValue}${decimalSeparator}`);
    }

    const hasMaxDecimals =
      valueHasDecimal &&
      currentValue.length - currentValue.indexOf(decimalSeparator) >
        maxInputDecimals;
    if (hasMaxDecimals) {
      return onInvalidInput();
    }

    if (input === '0' && currentValue === '0') {
      return onInvalidInput();
    }

    // replace 0 value with button value
    const newValue = currentValue === '0' ? input : currentValue + input;

    handleSetValue(newValue);
  };

  const switchInputCurrency = () => {
    setInputState((prev) => ({
      active: {
        value: prev.other.value,
        currency: prev.other.currency,
      },
      other: {
        value: prev.active.value,
        currency: prev.active.currency,
      },
    }));
  };

  return {
    inputValue: inputState.active.value,
    inputCurrency: inputState.active.currency,
    maxInputDecimals,
    inputMoney,
    otherMoney,
    handleNumberInput,
    switchInputCurrency,
    isExchangeRateLoading,
    exchangeRateError,
  };
}
