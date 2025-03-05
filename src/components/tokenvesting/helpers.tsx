// Helper function moved from tokenvesting-ui.tsx
"use client";

import { useClusterName } from "./tokenvesting-data-access";

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

  if (now >= account.endTime.toNumber()) {
    return { label: "Fully Vested", className: "badge badge-success" };
  }

  return { label: "Vesting in Progress", className: "badge badge-info" };
}

function maskAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 10)}.....${address.slice(-10)}`;
}

function getSolscanUrl(address: string, clusterName: string): string {
  let baseUrl = "https://solscan.io";
  let clusterParam = "";
  if (clusterName === "local") {
    clusterParam = "?cluster=custom&customUrl=http://127.0.0.1:8899";
  } else if (clusterName === "devnet") {
    clusterParam = "?cluster=devnet";
  } else if (clusterName === "testnet") {
    clusterParam = "?cluster=testnet";
  } else {
    clusterParam = "";
  }

  return `${baseUrl}/address/${address}${clusterParam}`;
}

function AddressLink({ address, label }: { address: string; label?: string }) {
  const clusterName = useClusterName();
  
  return (
    <a
      href={getSolscanUrl(address, clusterName)}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline text-primary"
    >
      {label || maskAddress(address)}
    </a>
  );
}

export { getVestingStatus, maskAddress, AddressLink, getSolscanUrl };
