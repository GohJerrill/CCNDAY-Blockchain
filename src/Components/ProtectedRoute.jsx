import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

const ORGANISER_HOME_PATH = "/Organiser/CCNDaySetup";
const USER_HOME_PATH = "/UserDashboard";

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

      setIsCheckingAccess(true);
      setAccessStatus("checking");

      if (!isConnected || !walletAddress || !usersContract) {
        setAccessStatus("not-connected");
        setIsCheckingAccess(false);
        return;
      }

      try {
        const authProfile = await usersContract.AuthenticateMyWallet();

        const isOrganiser = Boolean(authProfile.isOrganiser ?? authProfile[3]);
        const isRegisteredUser = Boolean(
          authProfile.isRegisteredUser ?? authProfile[4],
        );

        const isOrganiserPath =
          location.pathname === "/Organiser" ||
          location.pathname.startsWith("/Organiser/");

        if (isOrganiser) {
          if (!isOrganiserPath) {
            setAccessStatus("redirect-organiser");
            return;
          }

          setAccessStatus("allowed");
          return;
        }

        if (isRegisteredUser) {
          if (isOrganiserPath) {
            setAccessStatus("redirect-user");
            return;
          }

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
    location.pathname,
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

  if (accessStatus === "redirect-organiser") {
    return <Navigate to={ORGANISER_HOME_PATH} replace />;
  }

  if (accessStatus === "redirect-user") {
    return <Navigate to={USER_HOME_PATH} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
