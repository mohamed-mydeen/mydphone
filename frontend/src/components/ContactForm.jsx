import { useState, useEffect } from "react";
import { StarIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid, ShieldExclamationIcon as ShieldSolid } from "@heroicons/react/24/solid";
import LoadingSpinner from "./LoadingSpinner";

const EMPTY = {
  full_name: "", phone_number: "", alternate_number: "",
  email: "", address: "", notes: "",
  is_favorite: false, is_emergency: false,
};

const Field = ({ label, id, error, required, children }) => (
  <div>
    <label htmlFor={id} className="input-label">
      {label}{required && <span style={{ color: "var(--brand)" }}> *</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs mt-1 font-medium" style={{ color: "#ef4444" }}>{error}</p>
    )}
  </div>
);

export default function ContactForm({ initial = null, onSave, onCancel, loading = false }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
    setErrors({});
  }, [initial]);

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((err) => ({ ...err, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Name is required";
    if (!form.phone_number.trim()) e.phone_number = "Phone number is required";
    else if (!/^[\d\s\-\+\(\)]{7,}$/.test(form.phone_number)) e.phone_number = "Enter a valid phone number";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (!payload.alternate_number) delete payload.alternate_number;
    if (!payload.email)            delete payload.email;
    if (!payload.address)          delete payload.address;
    if (!payload.notes)            delete payload.notes;
    onSave(payload);
  };



  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Row 1: Name */}
      <Field label="Full Name" id="cf-name" error={errors.full_name} required>
        <input
          id="cf-name"
          className="input"
          value={form.full_name}
          onChange={set("full_name")}
          placeholder="Jane Doe"
          autoComplete="name"
          style={errors.full_name ? { borderColor: "#ef4444" } : {}}
        />
      </Field>

      {/* Row 2: Phone + Alt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone Number" id="cf-phone" error={errors.phone_number} required>
          <input
            id="cf-phone"
            className="input"
            value={form.phone_number}
            onChange={set("phone_number")}
            placeholder="+1 555 000 0000"
            type="tel"
            style={errors.phone_number ? { borderColor: "#ef4444" } : {}}
          />
        </Field>
        <Field label="Alternate Number" id="cf-alt">
          <input
            id="cf-alt"
            className="input"
            value={form.alternate_number}
            onChange={set("alternate_number")}
            placeholder="+1 555 000 0001"
            type="tel"
          />
        </Field>
      </div>

      {/* Row 3: Email */}
      <Field label="Email Address" id="cf-email" error={errors.email}>
        <input
          id="cf-email"
          className="input"
          value={form.email}
          onChange={set("email")}
          placeholder="jane@example.com"
          type="email"
          style={errors.email ? { borderColor: "#ef4444" } : {}}
        />
      </Field>

      {/* Row 4: Address */}
      <Field label="Address" id="cf-address">
        <input
          id="cf-address"
          className="input"
          value={form.address}
          onChange={set("address")}
          placeholder="123 Main St, City, State"
        />
      </Field>

      {/* Row 5: Notes */}
      <Field label="Notes" id="cf-notes">
        <textarea
          id="cf-notes"
          className="input resize-none"
          style={{ minHeight: "80px" }}
          value={form.notes}
          onChange={set("notes")}
          placeholder="Additional information…"
        />
      </Field>

      {/* Toggles */}
      <div
        className="flex gap-3 p-4 rounded-lg"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
      >
        {[
          { field: "is_favorite",  label: "Mark as Favorite", Icon: StarIcon,             IconActive: StarSolid,  activeColor: "#d97706" },
          { field: "is_emergency", label: "Emergency Contact", Icon: ShieldExclamationIcon, IconActive: ShieldSolid, activeColor: "#dc2626" },
        ].map(({ field, label, Icon, IconActive, activeColor }) => {
          const active = form[field];
          return (
            <label
              key={field}
              className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
            >
              <div
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? activeColor : "var(--text-4)" }}
              >
                {active ? <IconActive className="w-4 h-4" /> : <Icon className="w-4 h-4" strokeWidth={2} />}
              </div>
              <input
                type="checkbox"
                id={`cf-${field}`}
                checked={active}
                onChange={set(field)}
                className="sr-only"
              />
              <span
                className="text-sm font-medium"
                style={{ color: active ? activeColor : "var(--text-2)" }}
              >
                {label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Buttons */}
      <div className="flex gap-2.5 pt-1">
        <button type="submit" className="btn-primary flex-1 py-2.5" disabled={loading} id="cf-submit">
          {loading ? <LoadingSpinner size="sm" /> : initial ? "Save Changes" : "Add Contact"}
        </button>
        <button type="button" className="btn-secondary px-5" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </form>
  );
}
