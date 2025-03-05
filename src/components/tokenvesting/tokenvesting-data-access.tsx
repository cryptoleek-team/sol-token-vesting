"use client";

import { getVestingProgram, getVestingProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAccount, getMint } from "@solana/spl-token";
import BN from "bn.js";
import { publicDecrypt } from "crypto";

interface CreateVestingArgs {
  companyName: string;
  mint: string;
}

interface ClaimVestingArgs {
  companyName: string;
}

interface CreateEmployeeArgs {
  startTime: number;
  endTime: number;
  totalAmount: number;
  cliffTime: number;
  beneficiary: string;  
}

export function useVestingProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const programId = useMemo(
    () => getVestingProgramId(cluster.network as Cluster),
    [cluster]
  );
  const program = getVestingProgram(provider);

  const accounts = useQuery({
    queryKey: ["vesting", "all", { cluster }],
    queryFn: async () => {
      console.log('Fetching all vesting accounts for cluster:', cluster);
      const result = await program.account.vestingAccount.all();
      console.log('Fetched vesting accounts:', result);
      for (const account of result) {
        console.log('Vesting Account PublicKey:', account.publicKey.toString());
      }
      return result;
    },
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const createVestingAccount = useMutation<string, Error, CreateVestingArgs>({
    mutationKey: ["vesting-account", "create", { cluster }],
    mutationFn: ({ companyName, mint }) =>
      program.methods
        .createVestingAccount(companyName)
        .accounts({ mint: new PublicKey(mint) })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return accounts.refetch();
    },
    onError: () => toast.error("Failed to initialize account"),
  });

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createVestingAccount,
  };
}

export function useGetTreasuryBalance({ treasuryAddress, mintAddress }: { treasuryAddress: PublicKey, mintAddress: PublicKey }) {
  const { connection } = useConnection();
  const { cluster } = useCluster();

  return useQuery({
    queryKey: ['get-treasury-balance', { endpoint: connection.rpcEndpoint, treasuryAddress, mintAddress }],
    queryFn: async () => {
      try {
        const tokenAccount = await getAccount(connection, treasuryAddress);
        const mint = await getMint(connection, mintAddress);
        const balance = Number(tokenAccount.amount) / Math.pow(10, mint.decimals);
        return balance;
      } catch (error) {
        console.error('Failed to fetch treasury balance:', error);
        throw error;
      }
    },
  });
}

export function useGetTokenInfo({ mintAddress }: { mintAddress: PublicKey }) {
  const { connection } = useConnection();
  return useQuery({
    queryKey: ['get-token-info', { endpoint: connection.rpcEndpoint, mintAddress }],
    queryFn: async () => {  
      const mint = await getMint(connection, mintAddress);
      return mint;
    },
  });
}


export function useVestingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program, accounts } = useVestingProgram();

  const accountQuery = useQuery({
    queryKey: ["vesting", "fetch", { cluster, account }],
    queryFn: () => program.account.vestingAccount.fetch(account),
  });

  const createEmployeeVesting = useMutation<string, Error, CreateEmployeeArgs>({
    mutationKey: ["employee-vesting", "create", { cluster }],    
    mutationFn: async ({ startTime, endTime, totalAmount, cliffTime, beneficiary }) => {
      console.log('Creating employee vesting with params:', {
        startTime,
        endTime,
        totalAmount,
        cliffTime,
        beneficiary,
        account: account.toBase58()
      });
      
      const tx = await program.methods
        .createEmployeeVesting(new BN(startTime), new BN(endTime), new BN(totalAmount), new BN(cliffTime))
        .accounts({ beneficiary: new PublicKey(beneficiary), vestingAccount: account })
        .rpc();
      
      console.log('Employee vesting created successfully, tx:', tx);
      return tx;
    },
    onSuccess: (tx) => {
      console.log('Transaction successful, refreshing accounts');
      transactionToast(tx);
      return accounts.refetch();
    },
  });

  const claim = useMutation<string, Error, ClaimVestingArgs>({
    mutationKey: ["employee-claim", "claim", { cluster }],
    mutationFn: async ({ companyName }) => {
      console.log('Claiming tokens with params:', {
        companyName,
        account: account.toBase58()
      });
      
      const tx = await program.methods
        .claimTokens(companyName)
        .accounts({ tokenProgram: TOKEN_PROGRAM_ID })
        .rpc();
      
      console.log('Tokens claimed successfully, tx:', tx);
      return tx;
    },
    onSuccess: (tx) => {
      console.log('Claim transaction successful, refreshing accounts');
      transactionToast(tx);
      return accounts.refetch();
    },
  });

  const treasuryBalance = useGetTreasuryBalance({
    treasuryAddress: accountQuery.data?.treasuryTokenAccount ?? PublicKey.default,
    mintAddress: accountQuery.data?.mint ?? PublicKey.default,
  });

  const employeeVestingAccounts = useQuery({
    queryKey: ["employee-vesting", "all", { cluster, account }],
    queryFn: async () => {
      console.log('Fetching employee vesting accounts for vesting account:', account.toString());
      
      const employeeAccounts = await program.account.employeeAccount.all([{
        memcmp: {
          offset: 80,
          bytes: account.toBase58(),
        },
      }]);

      console.log('Found employee vesting accounts:', employeeAccounts);
      return employeeAccounts;
    },
  });

  return {
    accountQuery,
    createEmployeeVesting,
    claim,
    treasuryBalance,
    employeeVestingAccounts,
  };
}
