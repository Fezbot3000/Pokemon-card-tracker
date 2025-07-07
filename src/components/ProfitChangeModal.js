import React from 'react';

const ProfitChangeModal = ({
  isOpen,
  onClose,
  profitChangeData,
  oldProfit,
  newProfit,
}) => {
  if (!isOpen) return null;

  // Handle both data structures (direct props and profitChangeData object)
  const previousProfit =
    profitChangeData?.previousProfit ??
    profitChangeData?.oldProfit ??
    oldProfit ??
    0;
  const currentProfit = profitChangeData?.newProfit ?? newProfit ?? 0;
  const difference = currentProfit - previousProfit;

  return (
    <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-lg dark:bg-[#1B2131]">
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Profit Change Summary
          </h2>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Previous Profit
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                {previousProfit.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                New Profit
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                {currentProfit.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Difference
              </div>
              <div
                className={`text-lg font-medium ${difference >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {difference >= 0 ? '+' : ''}
                {difference.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitChangeModal;
