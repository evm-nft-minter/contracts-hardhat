import { ethers, upgrades } from 'hardhat';
import { Maker } from '../typechain-types';

export async function deployMaker(voucherSigner: string) {
  const Maker = await ethers.getContractFactory('Maker');
  const maker = await upgrades.deployProxy(Maker, [voucherSigner]);

  await maker.deployed();

  return <Maker>maker;
}
