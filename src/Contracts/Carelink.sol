// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CareLink_Backend {
    address public Organiser;

    mapping(address => bool) public StaffWhiteList;
    address[] public StaffWhiteListArray;

    enum UserType {
        None,
        Student,
        Staff
    }

    enum School {
        IIT,
        Business,
        Engineering,
        Design,
        Science,
        Humanities,
        Others
    }

    enum Year {
        PFP,
        Year1,
        Year2,
        Year3,
        Other
    }

    struct UserProfile {
        address WalletAddress;
        UserType usertype;
        School school;
        Year year;
        bool IsRegistered;
        uint256 RegisteredAt;
    }

    mapping(address => UserProfile) public Users;

    constructor() {
        Organiser = msg.sender;
    }

    modifier onlyOrganiser() {
        require(
            msg.sender == Organiser,
            "Only Organisers can perform this task brother"
        );
        _;
    }

    modifier onlyUnregisteredUser() {
        require(
            !Users[msg.sender].IsRegistered,
            "Wallet is already registered"
        );
        _;
    }

    function addStaffWallet(address _StaffWallet) public onlyOrganiser {
        require(_StaffWallet != address(0), "Invalid wallet Address!");
        require(
            _StaffWallet != Organiser,
            "Organiser cannot be whitelisted as staff!"
        );
        require(
            !StaffWhiteList[_StaffWallet],
            "Staff wallet is already whitelisted"
        );

        StaffWhiteList[_StaffWallet] = true;
        StaffWhiteListArray.push(_StaffWallet);
    }

    function RemoveStaffWallet(address _StaffWallet) public onlyOrganiser {
        require(_StaffWallet != address(0), "Invalid wallet Address!");
        require(
            StaffWhiteList[_StaffWallet],
            "Staff wallet is not Whitelisted"
        );

        delete StaffWhiteList[_StaffWallet];

        for (uint256 i = 0; i < StaffWhiteListArray.length; i++) {
            if (StaffWhiteListArray[i] == _StaffWallet) {
                for (uint256 j = i; j < StaffWhiteListArray.length - 1; j++) {
                    StaffWhiteListArray[j] = StaffWhiteListArray[j + 1];
                }

                StaffWhiteListArray.pop();
                break;
            }
        }
    }

    function GETALLSTAFFWALLET() public view returns (address[] memory) {
        return StaffWhiteListArray;
    }

    function GETSTAFFWALLETCOUNT() public view returns (uint256) {
        return StaffWhiteListArray.length;
    }

    function RegisterAsStudent(
        School _school,
        Year _year
    ) public onlyUnregisteredUser {
        require(msg.sender != Organiser, "Organiser cannot register as user!");

        Users[msg.sender] = UserProfile({
            WalletAddress: msg.sender,
            usertype: UserType.Student,
            school: _school,
            year: _year,
            IsRegistered: true,
            RegisteredAt: block.timestamp
        });
    }

    function IsMyWalletRegistered() public view returns (bool) {
        return Users[msg.sender].IsRegistered;
    }

    function GetMyProfile() public view returns (UserProfile memory) {
        require(Users[msg.sender].IsRegistered, "Wallet is not registered");
        return Users[msg.sender];
    }
}
