import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Maker } from '../typechain-types';
import { createVoucher } from './unitls/createVoucher';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/src/signers';

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

  beforeEach(async () => {
    [owner, collectionOwner, voucherSigner, wrongVoucherSigner] =
      (await ethers.getSigners()) as any;

    const Maker = await ethers.getContractFactory('Maker');

    maker = await Maker.connect(owner).deploy(voucherSigner.address);

    timestamp = Math.floor(Date.now() / 1000);
  });

  it('Should make collection', async function () {
    const ownerInitialBalance = await owner.getBalance();

    const voucher = await createVoucher(
      voucherSigner,
      maker.address,
      feeAmount,
      timestamp
    );

    const tx = await maker
      .connect(collectionOwner)
      .make(tokenId, collectionName, collectionSymbol, tokenUri, voucher, {
        value: feeAmount,
      });

    tx.wait(1);

    const collection = await ethers.getContractAt(
      'Collection',
      await maker.collection(collectionOwner.address, 0)
    );

    expect((await maker.collectionCount(collectionOwner.address)).toNumber()).equal(1);
    expect(await owner.getBalance()).equal(ownerInitialBalance.add(feeAmount));
    expect(await collection.name()).equal(collectionName);
    expect(await collection.symbol()).equal(collectionSymbol);
    expect(await collection.owner()).equal(collectionOwner.address);
    expect((await collection.balanceOf(collectionOwner.address)).toNumber()).equal(1);
    expect(await collection.tokenURI(tokenId)).equal(tokenUri);
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
