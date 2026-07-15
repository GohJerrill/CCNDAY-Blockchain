import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./contractAddresses";

import careLinkUsersAbi from "./abis/CareLinkUsers.json";
import careLinkCCNDayAbi from "./abis/CareLinkCCNDay.json";
import careLinkStallsAbi from "./abis/CareLinkStalls.json";
import careLinkPaymentsAbi from "./abis/CareLinkPayments.json";

const validateContractAddress = (contractName, contractAddress) => {
  if (!contractAddress) {
    throw new Error(`${contractName} contract address is missing from .env`);
  }

  if (!ethers.isAddress(contractAddress)) {
    throw new Error(`${contractName} contract address is invalid`);
  }
};

export const createCareLinkContracts = (signerOrProvider) => {
  validateContractAddress("CareLinkUsers", CONTRACT_ADDRESSES.users);
  validateContractAddress("CareLinkCCNDay", CONTRACT_ADDRESSES.ccnDay);
  validateContractAddress("CareLinkStalls", CONTRACT_ADDRESSES.stalls);
  validateContractAddress("CareLinkPayments", CONTRACT_ADDRESSES.payments);

  return {
    users: new ethers.Contract(
      CONTRACT_ADDRESSES.users,
      careLinkUsersAbi,
      signerOrProvider,
    ),

    ccnDay: new ethers.Contract(
      CONTRACT_ADDRESSES.ccnDay,
      careLinkCCNDayAbi,
      signerOrProvider,
    ),

    stalls: new ethers.Contract(
      CONTRACT_ADDRESSES.stalls,
      careLinkStallsAbi,
      signerOrProvider,
    ),

    payments: new ethers.Contract(
      CONTRACT_ADDRESSES.payments,
      careLinkPaymentsAbi,
      signerOrProvider,
    ),
  };
};
