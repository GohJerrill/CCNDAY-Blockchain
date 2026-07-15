import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ethers } from "ethers";
import { createCareLinkContracts } from "../blockchain/contracts";
import { SEPOLIA_CHAIN_ID } from "../blockchain/contractAddresses";

const Web3Context = createContext(null);

const normaliseAddress = (address) => {
  return address ? address.toLowerCase() : "";
};

export const Web3Provider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [authRefreshKey, setAuthRefreshKey] = useState(0);
  const [web3Error, setWeb3Error] = useState("");

  const walletAddressRef = useRef(null);
  const contractsRef = useRef(null);

  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  useEffect(() => {
    contractsRef.current = contracts;
  }, [contracts]);

  const formatWalletAddress = useCallback((address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const clearWalletSession = useCallback(() => {
    setWalletAddress(null);
    setProvider(null);
    setSigner(null);
    setContracts(null);
    setWeb3Error("");
    setAuthRefreshKey((currentKey) => currentKey + 1);
    localStorage.removeItem("carelinkWalletConnected");
  }, []);

  const initialiseWalletSession = useCallback(
    async ({ shouldRequestAccounts, providedAccounts = null }) => {
      if (!window.ethereum) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to continue.",
        );
      }

      const accounts =
        providedAccounts ||
        (await window.ethereum.request({
          method: shouldRequestAccounts
            ? "eth_requestAccounts"
            : "eth_accounts",
        }));

      if (!accounts || accounts.length === 0) {
        return null;
      }

      const selectedAddress = window.ethereum.selectedAddress || accounts[0];

      if (!selectedAddress) {
        return null;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);

      const network = await browserProvider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        throw new Error("Please switch MetaMask to the Sepolia network.");
      }

      const walletSigner = await browserProvider.getSigner(selectedAddress);
      const address = await walletSigner.getAddress();
      const careLinkContracts = createCareLinkContracts(walletSigner);

      setProvider(browserProvider);
      setSigner(walletSigner);
      setContracts(careLinkContracts);
      setWalletAddress(address);
      setWeb3Error("");
      setAuthRefreshKey((currentKey) => currentKey + 1);
      localStorage.setItem("carelinkWalletConnected", "true");

      return {
        provider: browserProvider,
        signer: walletSigner,
        contracts: careLinkContracts,
        address,
      };
    },
    [],
  );

  const syncWalletFromMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      return;
    }

    const wasConnected = localStorage.getItem("carelinkWalletConnected");

    if (wasConnected !== "true") {
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });

    if (!accounts || accounts.length === 0) {
      clearWalletSession();
      return;
    }

    const selectedAddress = window.ethereum.selectedAddress || accounts[0];
    const currentAddress = walletAddressRef.current;

    if (
      normaliseAddress(selectedAddress) === normaliseAddress(currentAddress) &&
      contractsRef.current
    ) {
      return;
    }

    console.log("CareLink wallet sync detected account:", selectedAddress);

    await initialiseWalletSession({
      shouldRequestAccounts: false,
      providedAccounts: [selectedAddress],
    });
  }, [clearWalletSession, initialiseWalletSession]);

  const checkWalletRegistration = useCallback(
    async (address, activeContracts) => {
      if (!activeContracts?.users) {
        return false;
      }

      const isRegistered =
        await activeContracts.users.IsWalletRegistered(address);

      return Boolean(isRegistered);
    },
    [],
  );

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setWeb3Error("");

    try {
      const walletSession = await initialiseWalletSession({
        shouldRequestAccounts: true,
      });

      if (!walletSession) {
        return {
          connected: false,
          isRegistered: false,
          address: null,
        };
      }

      const isRegistered = await checkWalletRegistration(
        walletSession.address,
        walletSession.contracts,
      );

      return {
        connected: true,
        isRegistered,
        address: walletSession.address,
      };
    } catch (error) {
      console.error("Wallet connection error:", error);

      const errorMessage =
        error?.reason ||
        error?.shortMessage ||
        error?.message ||
        "Unable to connect wallet. Please try again.";

      setWeb3Error(errorMessage);

      return {
        connected: false,
        isRegistered: false,
        address: null,
        error: errorMessage,
      };
    } finally {
      setIsConnecting(false);
    }
  }, [checkWalletRegistration, initialiseWalletSession]);

  const switchWalletAccount = useCallback(async () => {}, [
    checkWalletRegistration,
    clearWalletSession,
    initialiseWalletSession,
  ]);

  useEffect(() => {
    const restoreWalletConnection = async () => {
      const wasConnected = localStorage.getItem("carelinkWalletConnected");

      if (wasConnected !== "true") {
        setIsWalletReady(true);
        return;
      }

      try {
        await initialiseWalletSession({
          shouldRequestAccounts: false,
        });
      } catch (error) {
        console.error("Wallet restore error:", error);
        clearWalletSession();
      } finally {
        setIsWalletReady(true);
      }
    };

    restoreWalletConnection();
  }, [clearWalletSession, initialiseWalletSession]);

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged = async (accounts) => {
      console.log("MetaMask accounts changed:", accounts);

      if (!accounts || accounts.length === 0) {
        clearWalletSession();
        return;
      }

      try {
        setWeb3Error("");

        await initialiseWalletSession({
          shouldRequestAccounts: false,
          providedAccounts: accounts,
        });
      } catch (error) {
        console.error("Account change error:", error);
        clearWalletSession();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const handleWindowFocus = () => {
      syncWalletFromMetaMask().catch((error) => {
        console.error("Wallet focus sync error:", error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncWalletFromMetaMask().catch((error) => {
          console.error("Wallet visibility sync error:", error);
        });
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const walletSyncInterval = window.setInterval(() => {
      syncWalletFromMetaMask().catch((error) => {
        console.error("Wallet interval sync error:", error);
      });
    }, 2000);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(walletSyncInterval);
    };
  }, [clearWalletSession, initialiseWalletSession, syncWalletFromMetaMask]);

  const contextValue = useMemo(
    () => ({
      walletAddress,
      formattedWalletAddress: formatWalletAddress(walletAddress),
      provider,
      signer,
      contracts,
      usersContract: contracts?.users || null,
      ccnDayContract: contracts?.ccnDay || null,
      stallsContract: contracts?.stalls || null,
      paymentsContract: contracts?.payments || null,
      isConnected: Boolean(walletAddress),
      isConnecting,
      isWalletReady,
      authRefreshKey,
      web3Error,
      connectWallet,
      clearWalletSession,
      formatWalletAddress,
    }),
    [
      walletAddress,
      formatWalletAddress,
      provider,
      signer,
      contracts,
      isConnecting,
      isWalletReady,
      authRefreshKey,
      web3Error,
      connectWallet,
      clearWalletSession,
    ],
  );

  return (
    <Web3Context.Provider value={contextValue}>{children}</Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);

  if (!context) {
    throw new Error("useWeb3 must be used inside Web3Provider");
  }

  return context;
};
