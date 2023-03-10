// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "./Collection.sol";

contract Maker is OwnableUpgradeable, EIP712Upgradeable {
    bytes32 private constant VOUCHER_TYPE = keccak256("Voucher(uint256 fee,uint256 timestamp)");

    address private voucherSigner;

    mapping(address => Collection[]) private ownerToCollections;

    struct Voucher {
        uint256 fee;
        uint256 timestamp;
        bytes signature;
    }

    function initialize(address _voucherSigner) initializer public {
        voucherSigner = _voucherSigner;
        __Ownable_init();
        __EIP712_init("Maker", "1");
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

        (bool success, ) = owner().call{value: msg.value}("");

        require(success, "Maker: unable to send value, recipient may have reverted");

        Collection _collection = new Collection(collectionName, collectionSymbol);

        ownerToCollections[msg.sender].push(_collection);

        _collection.mint(msg.sender, tokenId, tokenUri);

        _collection.transferOwnership(msg.sender);
    }

    function setVoucherSigner(address _voucherSigner) external {
        voucherSigner = _voucherSigner;
    }

    function collectionCount(address owner) public view returns (uint) {
        return ownerToCollections[owner].length;
    }

    function collection(address owner, uint256 index) public view returns (Collection) {
        return ownerToCollections[owner][index];
    }

    function _verifyVoucher(Voucher calldata voucher) private view returns (address) {
        return ECDSAUpgradeable.recover(
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
