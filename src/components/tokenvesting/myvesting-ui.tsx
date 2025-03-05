"use client";

import { PublicKey } from "@solana/web3.js";
import { useVestingProgram, useVestingProgramAccount } from "./tokenvesting-data-access";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";



// Helper function moved from tokenvesting-ui.tsx
function getVestingStatus(account: {
  startTime: { toNumber: () => number };
  endTime: { toNumber: () => number };
  cliffTime: { toNumber: () => number };
  totalAmount: { toNumber: () => number };
  totalWithdrawn: { toNumber: () => number };
}) {
  const now = Math.floor(Date.now() / 1000);
  
  if (account.totalWithdrawn.toNumber() >= account.totalAmount.toNumber()) {
    return { label: "Fully Withdrawn", className: "badge badge-neutral" };
  }
  
  if (now < account.startTime.toNumber()) {
    return { label: "Not Started", className: "badge badge-warning" };
  }
  
  if (now < account.cliffTime.toNumber()) {
    return { label: "Cliff Period", className: "badge badge-warning" };
  }
  
  if (now < account.endTime.toNumber()) {
    return { label: "Vesting in Progress", className: "badge badge-info" };
  }
  
  return { label: "Fully Vested", className: "badge badge-success" };
}

// Helper function moved from tokenvesting-ui.tsx
function maskAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export { getVestingStatus, maskAddress };

export function MyVestingList() {
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
  
    if (!publicKey) {
      return (
        <div className="alert alert-info flex justify-center">
          <span>Please connect your wallet to view your vesting accounts.</span>
        </div>
      );
    }
  
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {accounts.isLoading ? (
          <span className="loading loading-spinner loading-lg"></span>
        ) : accounts.data?.length ? (
          <div className="flex flex-col gap-4">
            {accounts.data.map((vestingAccount) => (
              <VestingAccountWithFilter
                key={vestingAccount.publicKey.toString()}
                vestingAccount={vestingAccount}
                walletKey={publicKey}
              />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl">No vesting accounts</h2>
            You don't have any vesting tokens assigned to your wallet.
          </div>
        )}
      </div>
    );
  }

  function VestingAccountWithFilter({ 
    vestingAccount, 
    walletKey 
  }: { 
    vestingAccount: { publicKey: PublicKey }, 
    walletKey: PublicKey 
  }) {
    const { employeeVestingAccounts } = useVestingProgramAccount({ 
      account: vestingAccount.publicKey 
    });
  
    if (employeeVestingAccounts.isLoading) return null;
  
    const hasMatchingBeneficiary = employeeVestingAccounts.data?.some(
      (employee) => employee.account.beneficiary.toString() === walletKey.toString()
    );
  
    return hasMatchingBeneficiary ? (
      <MyVestingCard
        key={vestingAccount.publicKey.toString()}
        account={vestingAccount.publicKey}
        filterBeneficiary={walletKey}
      />
    ) : null;
  }


  export function MyVestingCard({ account, filterBeneficiary }: { account: PublicKey, filterBeneficiary?: PublicKey }) {
    const { accountQuery, treasuryBalance, employeeVestingAccounts } = useVestingProgramAccount({ account });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
          <p className="text-gray-500">Vesting Account Address: {account.toBase58()}</p>
          <p className="text-gray-500">Token Mint Address: {mintAddress}</p>
          <p className="text-gray-500">Treasury Address: {treasuryAddress}</p>
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
                .map((employee) => (
                    console.log("employee", employee),
                  <div key={employee.publicKey.toString()} className="bg-base-300 p-4 rounded-lg collapse collapse-arrow">
                    <input type="checkbox" className="peer" /> 
                    <div className="collapse-title flex justify-between items-center pr-12">
                      <div>
                        <p>Beneficiary: {maskAddress(employee.account.beneficiary.toString())}</p>
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
                    </div>
                    <div className="collapse-content">
                      <p>Start: {new Date(employee.account.startTime.toNumber() * 1000).toLocaleDateString()}</p>
                      <p>End: {new Date(employee.account.endTime.toNumber() * 1000).toLocaleDateString()}</p>
                      <p>Cliff: {new Date(employee.account.cliffTime.toNumber() * 1000).toLocaleDateString()}</p>
                      <p>Total Amount: {employee.account.totalAmount.toString()}</p>
                      <p>Total Withdrawn: {employee.account.totalWithdrawn.toString()}</p>                    
                    </div>
                    <VestingClaim 
                            companyName={companyName} 
                            account={employee.publicKey} 
                          />
                  </div>
                ))
            ) : (
              <p className="text-center text-gray-500">No employee vesting accounts found</p>
            )}
          </div>
  
        </div>
      </div>
    );
  }
  
export function VestingClaim({ companyName, account }: { companyName: string; account: PublicKey }) {  
  const { program } = useVestingProgram();
  const { claim } = useVestingProgramAccount({ account });

  const employeeAccount = useQuery({
    queryKey: ['employee', account.toString()],
    queryFn: () => program.account.employeeAccount.fetch(account)
  });

  console.log("employeeAccount.data????", employeeAccount);

  const isDisabled = useMemo(() => {
    if (!employeeAccount.data) return true;
    const status = getVestingStatus(employeeAccount.data);
    return status.label === "Fully Withdrawn" || status.label === "Not Started" || status.label === "Cliff Period";    
  }, [employeeAccount.data]);

  return (
    <button 
      className="btn btn-xs lg:btn-md btn-outline" 
      onClick={() => claim.mutateAsync({companyName})} 
      disabled={isDisabled || claim.isPending}
    >
      {claim.isPending ? "Claiming..." : "Claim"}
    </button>
  );
}
  