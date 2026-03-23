"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UserIcon,
  MailIcon,
  CalendarIcon,
  LogOutIcon,
  KeyIcon,
  ShieldIcon,
  PhoneIcon,
  BriefcaseIcon,
  MapPinIcon,
  FileTextIcon,
} from "lucide-react";

const SUPABASE_STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

function DetailSection({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">{children}</div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
    </div>
  );
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUser(data.user);

      const { data: emp } = await supabase
        .from("employees")
        .select("*")
        .eq("work_email", data.user.email)
        .maybeSingle();
      if (emp) setEmployee(emp);

      setLoading(false);
    }
    load();
  }, []);

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMsg("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
        Loading...
      </div>
    );
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const provider = user?.app_metadata?.provider || "email";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Unknown";

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and security settings.</p>
      </div>

      {/* Account info */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          Account Information
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-semibold">
              {(user?.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">Auth provider: {provider}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">Member since</span>
              </div>
              <p className="text-sm">{createdAt}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <ShieldIcon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">Last sign in</span>
              </div>
              <p className="text-sm">{lastSignIn}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-border text-xs text-muted-foreground">
            <MailIcon className="h-3.5 w-3.5" />
            User ID: <span className="font-mono">{user?.id}</span>
          </div>
        </div>
      </div>

      {/* Employee details */}
      {employee && (
        <>
          <DetailSection icon={UserIcon} title="Personal Information">
            <DetailField label="First Name" value={employee.first_name} />
            <DetailField label="Middle Name" value={employee.middle_name} />
            <DetailField label="Last Name" value={employee.last_name} />
            <DetailField label="Gender" value={employee.gender} />
            <DetailField label="Date of Birth" value={employee.date_of_birth} />
          </DetailSection>

          <DetailSection icon={PhoneIcon} title="Contact Information">
            <DetailField label="Work Email" value={employee.work_email} />
            <DetailField label="Personal Email" value={employee.personal_email} />
            <DetailField label="Mobile Number" value={employee.mobile_number} />
            <DetailField label="Emergency Contact" value={employee.mobile_number_secondary} />
          </DetailSection>

          <DetailSection icon={BriefcaseIcon} title="Employment Information">
            <DetailField label="Employee ID" value={employee.employee_number} />
            <DetailField label="Date of Joining" value={employee.date_of_joining} />
            <DetailField label="Designation" value={employee.designation} />
            <DetailField label="Department" value={employee.department} />
            <DetailField label="Role" value={employee.role} />
            <DetailField label="Status" value={employee.employee_status || "active"} />
          </DetailSection>

          <DetailSection icon={MapPinIcon} title="Address Information">
            <DetailField label="Address Line 1" value={employee.personal_address_line_1} />
            <DetailField label="Address Line 2" value={employee.personal_address_line_2} />
            <DetailField label="City" value={employee.personal_city} />
            <DetailField label="State" value={employee.personal_state} />
            <DetailField label="Postal Code" value={employee.personal_postal_code} />
          </DetailSection>

          <DetailSection icon={ShieldIcon} title="Additional Information">
            <DetailField label="PAN Number" value={employee.pan_number} />
            <DetailField label="Aadhaar Number" value={employee.aadhaar_number} />
            <DetailField label="Blood Type" value={employee.blood_type} />
            <DetailField label="Shirt Size" value={employee.shirt_size} />
          </DetailSection>

          {(employee.pan_card_url || employee.aadhaar_card_url) && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-muted-foreground" /> Documents
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employee.pan_card_url && (
                  <a
                    href={`${SUPABASE_STORAGE}/employee-documents/${employee.pan_card_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <FileTextIcon size={16} className="text-orange-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">PAN Card</p>
                      <p className="text-[11px] text-muted-foreground">View PDF</p>
                    </div>
                  </a>
                )}
                {employee.aadhaar_card_url && (
                  <a
                    href={`${SUPABASE_STORAGE}/employee-documents/${employee.aadhaar_card_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <FileTextIcon size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Aadhaar Card</p>
                      <p className="text-[11px] text-muted-foreground">View PDF</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <KeyIcon className="h-4 w-4 text-muted-foreground" />
          Change Password
        </h3>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {passwordError && (
            <p className="text-xs text-red-400">{passwordError}</p>
          )}
          {passwordMsg && (
            <p className="text-xs text-green-400">{passwordMsg}</p>
          )}
          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>

      {/* Sign out */}
      <div className="rounded-lg border border-border bg-card p-5">
        <button
          onClick={handleSignOut}
          className="text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
        >
          <LogOutIcon className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
