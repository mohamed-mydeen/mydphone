import { useState, useEffect } from "react";
import { LockClosedIcon, FingerPrintIcon, ShieldCheckIcon, BackspaceIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useVault } from "../context/VaultContext";

export default function PinPad() {
  const { hasPin, verifyPin, setupPin } = useVault();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState(hasPin ? "VERIFY" : "SETUP_1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasPin && step !== "VERIFY") setStep("VERIFY");
    if (hasPin === false && step === "VERIFY") setStep("SETUP_1");
  }, [hasPin]);

  const handleKeyPress = (num) => {
    if (pin.length < 6) {
      setPin((p) => p + num);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 6) {
      if (step === "VERIFY") {
        handleVerify();
      } else if (step === "SETUP_1") {
        setConfirmPin(pin);
        setPin("");
        setStep("SETUP_2");
      } else if (step === "SETUP_2") {
        if (pin === confirmPin) {
          handleSetup();
        } else {
          toast.error("PINs do not match. Try again.");
          setPin("");
          setConfirmPin("");
          setStep("SETUP_1");
        }
      }
    }
  }, [pin]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await verifyPin(pin);
      toast.success("Vault Unlocked");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Incorrect PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      await setupPin(pin);
      toast.success("Vault PIN configured securely.");
      // It will auto switch to VERIFY or be unlocked
    } catch (err) {
      toast.error("Failed to setup PIN");
      setPin("");
      setConfirmPin("");
      setStep("SETUP_1");
    } finally {
      setLoading(false);
    }
  };

  // Optional: Trigger WebAuthn (Device Biometrics) natively if supported
  const triggerBiometrics = async () => {
    if (!window.PublicKeyCredential) {
      return toast.error("Biometrics not supported on this device/browser");
    }
    toast("Biometric authentication integration requires a registered passkey. Falling back to PIN.", { icon: "ℹ️" });
  };

  const title = 
    step === "VERIFY" ? "Enter Vault PIN" :
    step === "SETUP_1" ? "Create a 6-digit Vault PIN" :
    "Confirm your Vault PIN";

  const description = 
    step === "VERIFY" ? "Securely encrypted on your device" :
    "This protects your sensitive documents and cannot be recovered if lost without account reset.";

  return (
    <div className="flex flex-col items-center justify-center py-10 w-full max-w-sm mx-auto animate-fade-in">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-sm" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        {step === "VERIFY" ? (
          <LockClosedIcon className="w-8 h-8" style={{ color: "var(--text)" }} />
        ) : (
          <ShieldCheckIcon className="w-8 h-8" style={{ color: "var(--text)" }} />
        )}
      </div>
      
      <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text)" }}>{title}</h2>
      <p className="text-xs text-center mb-8 px-4" style={{ color: "var(--text-4)" }}>{description}</p>

      {/* PIN Dots */}
      <div className="flex items-center gap-4 mb-10">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'scale-110' : 'scale-100 opacity-30'}`}
            style={{ background: i < pin.length ? "var(--text)" : "var(--border-2)" }}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full px-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            disabled={loading}
            onClick={() => handleKeyPress(num.toString())}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium active:scale-95 transition-all"
            style={{ color: "var(--text)", background: "var(--surface-2)" }}
          >
            {num}
          </button>
        ))}
        
        {/* Biometrics button */}
        {step === "VERIFY" ? (
          <button
            onClick={triggerBiometrics}
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-all"
            style={{ color: "var(--text-3)", background: "transparent" }}
          >
            <FingerPrintIcon className="w-8 h-8" />
          </button>
        ) : <div />}

        <button
          disabled={loading}
          onClick={() => handleKeyPress("0")}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium active:scale-95 transition-all"
          style={{ color: "var(--text)", background: "var(--surface-2)" }}
        >
          0
        </button>

        <button
          onClick={handleDelete}
          disabled={pin.length === 0 || loading}
          className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-all"
          style={{ color: "var(--text)", opacity: pin.length === 0 ? 0.3 : 1 }}
        >
          <BackspaceIcon className="w-7 h-7" />
        </button>
      </div>

      {loading && <p className="mt-8 text-xs font-medium animate-pulse" style={{ color: "var(--text-3)" }}>Verifying securely...</p>}
    </div>
  );
}
