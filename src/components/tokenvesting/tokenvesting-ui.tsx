"use client";

import { PublicKey, Cluster } from "@solana/web3.js";
import { useMemo, useState } from "react";
import {
  useVestingProgram,
  useVestingProgramAccount,
} from "./tokenvesting-data-access";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGetTokenInfo, } from "./tokenvesting-data-access";
import { getVestingStatus, AddressLink } from "./helpers";

export function VestingCreate() {
  const { createVestingAccount } = useVestingProgram();
  const { publicKey } = useWallet();
  const [company, setCompany] = useState("");
  const [mint, setMint] = useState("");

  const isFormValid = company.length > 0 && mint.length > 0;

  const handleSubmit = () => {
    if (publicKey && isFormValid) {
      createVestingAccount.mutateAsync({ companyName: company, mint: mint });
    }
  };

  return (
    <div className="flex gap-4 items-end justify-center">
      <div className="form-control">
        <input
          type="text"
          placeholder="Company Name"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>
      <div className="form-control">
        <input
          type="text"
          placeholder="Token Mint Address"
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={createVestingAccount.isPending || !isFormValid}
      >
        Create New Vesting Account {createVestingAccount.isPending && "..."}
      </button>
    </div>
  );
}



export function VestingList() {
  const { accounts, getProgramAccount } = useVestingProgram();
  const { publicKey } = useWallet();

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>
          Program account not found. Make sure you have deployed the program and
          are on the correct cluster.
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="flex flex-col gap-4">
          {accounts.data?.map((account) => (
            <VestingCard
              key={account.publicKey.toString()}
              account={account.publicKey}
            />
          ))}          
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl">No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

export function EmployeeVestingDialog({ 
  isOpen, 
  onClose, 
  account,
  companyName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  account: PublicKey;
  companyName: string;
}) {
  const { createEmployeeVesting, accountQuery } = useVestingProgramAccount({ account });
  const tokenInfo = useGetTokenInfo({ mintAddress: accountQuery.data?.mint ?? PublicKey.default });
  const [formData, setFormData] = useState({
    beneficiary: "",
    startTime: new Date().toISOString().split('T')[0],
    endTime: "",
    cliffTime: "",
    totalAmount: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const adjustedAmount = Number(formData.totalAmount) * (10 ** (tokenInfo.data?.decimals ?? 9));

      await createEmployeeVesting.mutateAsync({
        beneficiary: formData.beneficiary,
        startTime: Math.floor(new Date(formData.startTime).getTime() / 1000),
        endTime: Math.floor(new Date(formData.endTime).getTime() / 1000),
        totalAmount: adjustedAmount,
        cliffTime: Math.floor(new Date(formData.cliffTime).getTime() / 1000),        
      });
      onClose();
    } catch (error) {
      console.error('Failed to create employee vesting:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-base-200 p-6 rounded-lg w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">Create Employee Vesting - {companyName}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <input
              type="text"
              placeholder="Beneficiary Address"
              value={formData.beneficiary}
              onChange={(e) => setFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
              className="input input-bordered w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="input input-bordered w-full [&::-webkit-calendar-picker-indicator]:opacity-100"
                required
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="date"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="input input-bordered w-full [&::-webkit-calendar-picker-indicator]:opacity-100"
                required
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Cliff Date</span>
              </label>
              <input
                type="date"
                value={formData.cliffTime}
                onChange={(e) => setFormData(prev => ({ ...prev, cliffTime: e.target.value }))}
                className="input input-bordered w-full [&::-webkit-calendar-picker-indicator]:opacity-100"
                required
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Total Amount</span>
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={formData.totalAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                className="input input-bordered w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createEmployeeVesting.isPending}>
              Create {createEmployeeVesting.isPending && "..."}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function VestingCard({ account, filterBeneficiary }: { account: PublicKey, filterBeneficiary?: PublicKey }) {
  const { accountQuery, treasuryBalance, employeeVestingAccounts } = useVestingProgramAccount({ account });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const companyName = useMemo(
    () => accountQuery.data?.companyName ?? "Unknown",
    [accountQuery.data?.companyName]
  );

  const mintAddress = useMemo(
    () => accountQuery.data?.mint?.toString() ?? "Unknown",
    [accountQuery.data?.mint]
  );


  const treasuryAddress = useMemo(
    () => accountQuery.data?.treasuryTokenAccount?.toString() ?? "Unknown",
    [accountQuery.data?.treasuryTokenAccount]
  );

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <div className="card bg-base-200 shadow-xl w-full">
      <div className="card-body">
        <h2 className="card-title text-xl text-center justify-center">{companyName}</h2>
        <p className="text-gray-500">Vesting Account Address: <AddressLink address={account.toBase58()} /></p>
        <p className="text-gray-500">Token Mint Address: <AddressLink address={mintAddress} /></p>
        <p className="text-gray-500">Treasury Address: <AddressLink address={treasuryAddress} /></p>
        <p className="text-gray-500">Treasury Balance: {
          treasuryBalance.isLoading 
            ? "Loading..." 
            : treasuryBalance.isError 
              ? "Error loading balance" 
              : treasuryBalance.data
        }</p>
        
        <div className="divider">Employee Vesting Accounts</div>
        
        <div className="space-y-4">
          {employeeVestingAccounts.isLoading ? (
            <span className="loading loading-spinner loading-lg"></span>
          ) : employeeVestingAccounts.data?.length ? (
            employeeVestingAccounts.data
              .filter(employee => 
                !filterBeneficiary || 
                employee.account.beneficiary.toString() === filterBeneficiary.toString()
              )
              .map((employee) => {
                const employeeKey = employee.publicKey.toString();
                return (
                <div key={employeeKey} className="bg-base-300 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p>Beneficiary: <AddressLink address={employee.account.beneficiary.toString()} /></p>
                      <p className="text-sm">
                        {employee.account.totalAmount.toString() === employee.account.totalWithdrawn.toString()
                          ? "All tokens withdrawn"
                          : `Available to withdraw: ${(employee.account.totalAmount.toNumber() - employee.account.totalWithdrawn.toNumber()).toString()}`
                        }
                      </p>
                    </div>
                    <div className={getVestingStatus(employee.account).className}>
                      {getVestingStatus(employee.account).label}
                    </div>
                    <button 
                      className="btn btn-ghost btn-sm ml-2"
                      onClick={() => setExpandedItems(prev => ({
                        ...prev,
                        [employeeKey]: !prev[employeeKey]
                      }))}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-6 w-6 transform ${expandedItems[employeeKey] ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 9l-7 7-7-7" 
                        />
                      </svg>
                    </button>
                  </div>
                  {expandedItems[employeeKey] && (
                    <div className="mt-4 space-y-2">
                      <p>Start: {new Date(employee.account.startTime.toNumber() * 1000).toLocaleDateString()}</p>
                      <p>End: {new Date(employee.account.endTime.toNumber() * 1000).toLocaleDateString()}</p>
                      <p>Cliff: {new Date(employee.account.cliffTime.toNumber() * 1000).toLocaleDateString()}</p>
                      <p>Total Amount: {employee.account.totalAmount.toString()}</p>
                      <p>Total Withdrawn: {employee.account.totalWithdrawn.toString()}</p>                    
                    </div>
                  )}
                </div>
              )})
          ) : (
            <p className="text-center text-gray-500">No employee vesting accounts found</p>
          )}
        </div>

        <button 
          className="btn btn-primary w-full mt-4"
          onClick={() => setIsDialogOpen(true)}
        >
          Create Employee Vesting Account
        </button>

        <EmployeeVestingDialog
          isOpen={isDialogOpen}          
          onClose={() => setIsDialogOpen(false)}
          account={account}
          companyName={companyName}
        />
      </div>
    </div>
  );
}

