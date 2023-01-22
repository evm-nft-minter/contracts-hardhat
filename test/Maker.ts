import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Maker } from '../typechain-types';
import { createVoucher } from './unitls/createVoucher';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/src/signers';
import { deployMaker } from '../scripts/deploy';

describe('Maker', function () {
  let maker: Maker;

  let owner: SignerWithAddress;
  let collectionOwner: SignerWithAddress;
  let voucherSigner: SignerWithAddress;
  let wrongVoucherSigner: SignerWithAddress;
  let timestamp: number;

  const feeAmount = ethers.utils.parseEther('0.01');
  const tokenId = 1;
  const collectionName = 'test';
  const collectionSymbol = 'TEST';
  const tokenUri = 'https://test';

  before(async () => {
    [owner, collectionOwner, voucherSigner, wrongVoucherSigner] =
      (await ethers.getSigners()) as any;

    timestamp = Math.floor(Date.now() / 1000);
  });

  beforeEach(async () => {
    maker = await deployMaker(voucherSigner.address);
  });

  it('Should make collection', async function () {
    const ownerInitialBalance = await owner.getBalance();

    const voucher = await createVoucher(
      voucherSigner,
      maker.address,
      feeAmount,
      timestamp
    );

    const tx = await maker.connect(collectionOwner)
      .make(tokenId, collectionName, collectionSymbol, tokenUri, voucher, {
        value: feeAmount,
      });

    await tx.wait(1);

    const collection = await ethers.getContractAt(
      'Collection',
      await maker.collection(collectionOwner.address, 0)
    );

    const [
      makerCollectionCount,
      ownerBalance,
      collectionOwnerBalance,
      collectionName_,
      collectionSymbol_,
      collectionOwner_,
      tokenURI_,
    ] = await Promise.all([
      maker.collectionCount(collectionOwner.address),
      owner.getBalance(),
      collection.balanceOf(collectionOwner.address),
      collection.name(),
      collection.symbol(),
      collection.owner(),
      collection.tokenURI(tokenId),
    ]);

    expect(makerCollectionCount.toNumber()).equal(1);
    expect(ownerBalance).equal(ownerInitialBalance.add(feeAmount));
    expect(collectionOwnerBalance.toNumber()).equal(1);
    expect(collectionName_).equal(collectionName);
    expect(collectionSymbol_).equal(collectionSymbol);
    expect(collectionOwner_).equal(collectionOwner.address);
    expect(tokenURI_).equal(tokenUri);
  });

  it('Should fail if voucher is expired', async function () {
    const tenMinutes = 60 * 10;
    const wrongTimestamp = timestamp - tenMinutes;

    const voucher = await createVoucher(
      voucherSigner,
      maker.address,
      feeAmount,
      wrongTimestamp
    );

    await expect(
      maker
        .connect(collectionOwner)
        .make(tokenId, collectionName, collectionSymbol, tokenUri, voucher, {
          value: feeAmount,
        })
    ).to.be.rejectedWith('Maker: Voucher is expired');
  });

  it('Should fail if fee amount isn`t enough', async function () {
    const wrongFeeAmount = feeAmount.sub('100');

    const voucher = await createVoucher(
      voucherSigner,
      maker.address,
      feeAmount,
      timestamp
    );

    await expect(
      maker
        .connect(collectionOwner)
        .make(tokenId, collectionName, collectionSymbol, tokenUri, voucher, {
          value: wrongFeeAmount,
        })
    ).to.be.rejectedWith('Maker: Amount sent is not correct');
  });

  it('Should fail if voucher signer is wrong', async function () {
    const voucher = await createVoucher(
      wrongVoucherSigner,
      maker.address,
      feeAmount,
      timestamp
    );

    await expect(
      maker
        .connect(collectionOwner)
        .make(tokenId, collectionName, collectionSymbol, tokenUri, voucher, {
          value: feeAmount,
        })
    ).to.be.rejectedWith('Maker: Signature invalid or unauthorized');
  });
});
