// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./Collection.sol";

contract Maker is Ownable, EIP712 {
    bytes32 private constant VOUCHER_TYPE = keccak256("Voucher(uint256 fee,uint256 timestamp)");

    address private voucherSigner;

    mapping(address => address[]) private ownerToCollections;

    struct Voucher {
        uint256 fee;
        uint256 timestamp;
        bytes signature;
    }

    constructor(address _voucherSigner) EIP712("Maker", "1") {
        voucherSigner = _voucherSigner;
    }

    function make(
        uint256 tokenId,
        string calldata collectionName,
        string calldata collectionSymbol,
        string calldata tokenUri,
        Voucher calldata voucher
    ) payable external {
        require(
            voucherSigner == _verifyVoucher(voucher),
            "Maker: Signature invalid or unauthorized"
        );

        require(
            voucher.fee <= msg.value,
            "Maker: Amount sent is not correct"
        );

        require(
            block.timestamp - 5 minutes <= voucher.timestamp,
            "Maker: Voucher is expired"
        );

        Collection _collection = new Collection(collectionName, collectionSymbol);

        _collection.mint(msg.sender, tokenId, tokenUri);

        _collection.transferOwnership(msg.sender);

        ownerToCollections[msg.sender].push(address(_collection));

        (bool success, ) = owner().call{value: msg.value}("");
        require(success, "Maker: unable to send value, recipient may have reverted");
    }

    function setVoucherSigner(address _voucherSigner) external {
        voucherSigner = _voucherSigner;
    }

    function collectionCount(address owner) public view returns (uint) {
        return ownerToCollections[owner].length;
    }

    function collection(address owner, uint256 index) public view returns (address) {
        return ownerToCollections[owner][index];
    }

    function _verifyVoucher(Voucher calldata voucher) private view returns (address) {
        return ECDSA.recover(
            _hashVoucher(voucher),
            voucher.signature
        );
    }

    function _hashVoucher(Voucher calldata voucher) private view returns (bytes32) {
        return _hashTypedDataV4(keccak256(
            abi.encode(
                VOUCHER_TYPE,
                voucher.fee,
                voucher.timestamp
            )
        ));
    }
}
