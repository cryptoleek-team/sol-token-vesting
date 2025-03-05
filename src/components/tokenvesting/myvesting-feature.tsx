'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '../solana/solana-provider';
import { AppHero, ellipsify } from '../ui/ui-layout';
import { ExplorerLink } from '../cluster/cluster-ui';
import { useVestingProgram } from './tokenvesting-data-access';
import { MyVestingList } from './myvesting-ui';

export default function MyVestingFeature() {
  const { publicKey } = useWallet();
  const { programId } = useVestingProgram();

  return publicKey ? (
    <div>
      <AppHero
        title="My Vesting"
        subtitle={'View and claim your vesting tokens'}
      >
        <p className="mb-6">
          <ExplorerLink
            path={`account/${programId}`}
            label={ellipsify(programId.toString())}
          />
        </p>
      </AppHero>
      <MyVestingList />      
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  );
}