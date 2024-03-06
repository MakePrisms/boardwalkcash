import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";

const Balance = ({ balance }: { balance: number }) => {
  const [usdBtc, setUsdBtc] = useState(0);
  const [unit, setUnit] = useState("sats");
  const [usdBalance, setUsdBalance] = useState("0.00");
  const [exchangeError, setExchangeError] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    // Fetch the USD to BTC rate on load
    fetch("https://mempool.space/api/v1/prices").then((res) =>
      res.json().then((data) => {
        setUsdBtc(data.USD);
        setExchangeError(false);
      })
    ).catch((error) => {
      console.error("Error fetching USD to BTC rate: ", error);
      addToast("Error fetching USD to BTC rate", "error")
      setExchangeError(true);
    });
  }, []); 

  const updateUsdBalance = (newBalance = balance) => {
    if (unit === "usd") {
      const balanceBtc = newBalance / 100_000_000;
      const balanceUsd = balanceBtc * usdBtc;

      if (balanceUsd === 0) {
        setUsdBalance("0.00");
      }
      else if (balanceUsd < 0.01) {
        setUsdBalance("< 0.01");
      } else {
        setUsdBalance(balanceUsd.toFixed(2));
      }
    }
  };

  useEffect(() => {
    // This effect runs when balance, usdBtc, or unit changes
    updateUsdBalance();
  }, [balance, usdBtc, unit]);

  const handleClick = () => {
    // Toggle unit and optionally update usdBalance if switching to "usd"
    setUnit((prevUnit) => {
      const newUnit = prevUnit === "sats" ? "usd" : "sats";
      if (newUnit === "usd") {
        updateUsdBalance();
      }
      return newUnit;
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full mb-14">
      <h1 onClick={handleClick} className="mb-4 hover:cursor-pointer">
        <span className="font-teko text-6xl font-bold">
          {unit === "sats" ? balance : usdBalance}
        </span>{" "}
        <span className="font-5xl text-cyan-teal font-bold">{unit}</span>
      </h1>
      {exchangeError && unit === 'usd' && <p className="text-red-600">error fetching exchange rate</p>}
    </div>
  );
};

export default Balance;
