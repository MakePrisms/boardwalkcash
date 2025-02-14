import { useEffect, useState } from 'react';
import type { NumpadButton } from '~/components/numpad';
import { getDefaultUnit } from '~/features/shared/currencies';
import type { Ticker } from '~/lib/exchange-rate';
import { getLocaleDecimalSeparator } from '~/lib/locale';
import type { Currency } from '~/lib/money';
import { Money } from '~/lib/money';
import { useExchangeRates } from './use-exchange-rate';

type State = {
  input: {
    /** Raw input value */
    value: string;
    /** Currency of the input */
    currency: Currency;
  };
  converted: {
    /** Raw converted value. Undefined if rates are not loaded yet */
    value: string | undefined;
    /** Currency of the converted value */
    currency: Currency;
  };
};

type Props = {
  /** Initial input value as raw string */
  initialRawInputValue: string;
  /** Initial input currency */
  initialInputCurrency: Currency;
  /** Currency to convert to */
  initialOtherCurrency: Currency;
};

const toMoney = ({
  value,
  currency,
}: {
  value: string;
  currency: Currency;
}) => {
  return new Money({
    amount: value,
    currency,
    unit: getDefaultUnit(currency),
  });
};

const getNumberOfDecimals = (value: string, decimalSeparator: string) => {
  const decimalIndex = value.indexOf(decimalSeparator);
  if (decimalIndex === -1) {
    return 0;
  }
  return value.length - decimalIndex - 1;
};

const trimInputValue = (
  value: string | undefined,
  decimalSeparator: string,
) => {
  if (!value) {
    return '0';
  }

  const decimalIndex = value.indexOf(decimalSeparator);
  if (decimalIndex === -1) {
    return value;
  }

  // Remove trailing zeros and decimal separator if it's the last character
  return value
    .replace(/0+$/, '')
    .replace(new RegExp(`\\${decimalSeparator}$`), '');
};

export function useMoneyInput({
  initialRawInputValue,
  initialInputCurrency,
  initialOtherCurrency,
}: Props) {
  const [state, setState] = useState<State>({
    input: { value: initialRawInputValue, currency: initialInputCurrency },
    converted: { value: undefined, currency: initialOtherCurrency },
  });

  const tickers: Ticker[] = [
    `${state.input.currency}-${state.converted.currency}`,
    `${state.converted.currency}-${state.input.currency}`,
  ];

  const { data: rates, error: exchangeRateError } = useExchangeRates(
    tickers.sort(),
  );

  const inputMoney = toMoney(state.input);

  const convertedMoney = state.converted.value
    ? toMoney({
        value: state.converted.value,
        currency: state.converted.currency,
      })
    : undefined;

  useEffect(() => {
    if (rates) {
      setState((current) => {
        const rate =
          rates[`${current.input.currency}-${current.converted.currency}`];

        const newConvertedValue = toMoney(current.input)
          .convert(current.converted.currency, rate)
          .toString(getDefaultUnit(current.converted.currency));

        return {
          ...current,
          converted: {
            value: newConvertedValue,
            currency: current.converted.currency,
          },
        };
      });
    }
  }, [rates]);

  const maxInputDecimals = inputMoney.getMaxDecimals(
    getDefaultUnit(state.input.currency),
  );
  const decimalSeparator = getLocaleDecimalSeparator();
  const handleSetValue = (newValue: string, newCurrency?: Currency) => {
    const inputCurrency = newCurrency ?? state.input.currency;
    const convertedCurrency =
      newCurrency === state.converted.currency
        ? state.input.currency
        : state.converted.currency;

    const rate = rates
      ? rates[`${inputCurrency}-${convertedCurrency}`]
      : undefined;

    const newConvertedValue = rate
      ? toMoney({ value: newValue, currency: inputCurrency })
          .convert(convertedCurrency, rate)
          .toString(getDefaultUnit(convertedCurrency))
      : undefined;

    setState({
      input: { value: newValue, currency: inputCurrency },
      converted: { value: newConvertedValue, currency: convertedCurrency },
    });

    return {
      input: { value: newValue, currency: inputCurrency },
      converted: { value: newConvertedValue, currency: convertedCurrency },
    };
  };

  const setInputValueAndCurrency = (
    newValue: string,
    newCurrency: Currency,
  ) => {
    return handleSetValue(newValue, newCurrency);
  };

  /** Updates the input value or calls onInvalidInput if the input is invalid */
  const handleNumberInput = (
    input: NumpadButton,
    onInvalidInput: () => void,
  ) => {
    const currentValue = state.input.value;

    if (input === 'Backspace') {
      if (currentValue === '0') {
        return onInvalidInput();
      }

      const newValue =
        currentValue.length === 1 ? '0' : currentValue.slice(0, -1);
      return handleSetValue(newValue);
    }

    const valueHasDecimal = currentValue.includes(decimalSeparator);

    if (input === decimalSeparator) {
      // Only add decimal if one doesn't exist yet
      return valueHasDecimal
        ? onInvalidInput()
        : handleSetValue(`${currentValue}${decimalSeparator}`);
    }

    const hasMaxDecimals =
      valueHasDecimal &&
      getNumberOfDecimals(currentValue, decimalSeparator) === maxInputDecimals;

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

  const switchInputCurrency = (currency?: Currency) => {
    if (currency === state.input.currency) {
      return;
    }
    setState((current) => {
      const newInputCurrency = currency ?? current.converted.currency;
      const newConvertedCurrency =
        newInputCurrency === current.input.currency
          ? current.converted.currency
          : current.input.currency;
      return {
        input: {
          value: trimInputValue(current.converted.value, decimalSeparator),
          currency: newInputCurrency,
        },
        converted: {
          value: current.input.value,
          currency: newConvertedCurrency,
        },
      };
    });
  };

  return {
    rawInputValue: state.input.value,
    maxInputDecimals,
    inputValue: inputMoney,
    convertedValue: convertedMoney,
    handleNumberInput,
    switchInputCurrency,
    exchangeRateError,
    setInputValueAndCurrency,
  };
}
