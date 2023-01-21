import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/src/signers';

const VOUCHER_TYPE = {
  Voucher: [
    { name: 'fee', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
  ],
};

export async function createVoucher(
  signer: SignerWithAddress,
  verifyingContract: string,
  fee: BigNumber,
  timestamp: number
) {
  const domain = {
    name: 'Maker',
    version: '1',
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract,
  };

  const signature = await signer._signTypedData(domain, VOUCHER_TYPE, {
    fee,
    timestamp,
  });

  return {
    fee,
    timestamp,
    signature,
  };
}
