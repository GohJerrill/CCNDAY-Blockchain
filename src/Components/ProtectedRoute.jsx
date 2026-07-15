import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

const ProtectedRoute = () => {
  const location = useLocation();

  const {
    isConnected,
    isWalletReady,
    walletAddress,
    usersContract,
    authRefreshKey,
  } = useWeb3();

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [accessStatus, setAccessStatus] = useState("checking");

  useEffect(() => {
    const checkAccess = async () => {
      if (!isWalletReady) {
        return;
      }

      if (!isConnected || !walletAddress || !usersContract) {
        setAccessStatus("not-connected");
        setIsCheckingAccess(false);
        return;
      }

      try {
        setIsCheckingAccess(true);

        const authProfile = await usersContract.AuthenticateMyWallet();

        const isOrganiser = Boolean(authProfile.isOrganiser ?? authProfile[3]);
        const isRegisteredUser = Boolean(
          authProfile.isRegisteredUser ?? authProfile[4],
        );

        if (isOrganiser || isRegisteredUser) {
          setAccessStatus("allowed");
          return;
        }

        setAccessStatus("not-registered");
      } catch (error) {
        console.error("Protected route access check error:", error);
        setAccessStatus("not-connected");
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [
    isWalletReady,
    isConnected,
    walletAddress,
    usersContract,
    authRefreshKey,
  ]);   

  if (!isWalletReady || isCheckingAccess) {
    return (
      <main className="route-loading-screen">
        <p>Checking wallet access...</p>
      </main>
    );
  }

  if (accessStatus === "not-connected") {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (accessStatus === "not-registered") {
    return <Navigate to="/RegisterBABY" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
