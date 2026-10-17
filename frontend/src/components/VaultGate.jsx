import { useVault } from "../context/VaultContext";
import Navbar from "./Navbar";
import PinPad from "./PinPad";

export default function VaultGate({ children }) {
  const { isUnlocked } = useVault();

  if (!isUnlocked) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="page-body flex items-center justify-center">
          <PinPad />
        </div>
      </div>
    );
  }

  return children;
}
