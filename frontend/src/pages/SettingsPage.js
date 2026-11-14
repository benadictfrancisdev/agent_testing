import { Settings as SettingsIcon, Building2, User, Shield, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div data-testid="settings-page" className="space-y-6">
      <div>
        <h1 className="heading-font text-3xl sm:text-4xl font-bold tracking-tight text-[#f4f4f5]">Settings</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Platform configuration and preferences</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Organization */}
        <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[#00f0ff]" />
            <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Organization</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Name</span>
              <span className="text-sm text-[#f4f4f5]">Default Organization</span>
            </div>
            <Separator className="bg-[#27272a]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Plan</span>
              <Badge className="bg-[#6366f1]/10 text-[#6366f1] border-0 text-xs">Enterprise</Badge>
            </div>
            <Separator className="bg-[#27272a]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Tenant Mode</span>
              <span className="text-sm text-[#f4f4f5]">Single Organization</span>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#10b981]" />
            <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Account</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Email</span>
              <span className="text-sm mono-font text-[#f4f4f5]">admin@platform.com</span>
            </div>
            <Separator className="bg-[#27272a]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Role</span>
              <Badge className="bg-[#f59e0b]/10 text-[#f59e0b] border-0 text-xs">Super Admin</Badge>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Authentication</span>
              <Badge className="bg-[#10b981]/10 text-[#10b981] border-0 text-xs">Google SSO (Clerk)</Badge>
            </div>
            <Separator className="bg-[#27272a]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Access</span>
              <span className="text-sm text-[#f4f4f5]">Single Admin</span>
            </div>
            <Separator className="bg-[#27272a]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Credential Vault</span>
              <Badge className="bg-[#10b981]/10 text-[#10b981] border-0 text-xs">Ready</Badge>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-[#121215] border border-[#27272a] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-[#6366f1]" />
            <h3 className="heading-font text-base font-semibold text-[#f4f4f5]">Appearance</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#a1a1aa]">Theme</span>
            <span className="text-sm text-[#f4f4f5]">Dark</span>
          </div>
        </div>
      </div>

      {/* Platform Info */}
      <div className="max-w-2xl pt-4 border-t border-[#27272a]">
        <p className="text-xs text-[#52525b] mono-font">
          Ayksa Testing v2.0 — Phase 2
        </p>
      </div>
    </div>
  );
}
