"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Users, Plus, ShieldCheck, Key, Edit2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { canManageUsers } from "@/lib/rbac";

export default function UsersPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("OPERATOR");
  const [status, setStatus] = useState("ACTIVE");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUsers(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditId("");
    setName("");
    setEmail("");
    setPassword("");
    setRole("OPERATOR");
    setStatus("ACTIVE");
    setModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setIsEditing(true);
    setEditId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword("");
    setRole(u.role);
    setStatus(u.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = isEditing ? `/api/users/${editId}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";
      const payload: any = { name, email, role, status };
      if (password) payload.password = password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Operation failed");
      }

      success(
        isEditing ? "User Updated" : "User Created",
        `${name} account has been ${isEditing ? "updated" : "provisioned"}.`
      );
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      error("User Management Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRolePill = (userRole: string) => {
    switch (userRole) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-white/10 text-white border border-white/20">
            ADMIN
          </span>
        );
      case "OPERATOR":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-white/[0.05] text-white/80 border border-white/[0.08]">
            OPERATOR
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-white/[0.03] text-white/50 border border-white/[0.06]">
            VIEWER
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Users</h1>
          <p className="text-sm text-white/50 mt-1">
            Manage trading desk operators, administrators, and access permissions.
          </p>
        </div>

        {user && canManageUsers(user.role) && (
          <Button variant="primary" onClick={openCreateModal} className="gap-2">
            <Plus className="w-4 h-4" /> Add User
          </Button>
        )}
      </div>

      {/* Users Table (Section 30) */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NAME</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>ROLE</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>LAST ACTIVE</TableHead>
              <TableHead className="text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="py-5 text-center">
                    <div className="h-6 w-full bg-white/[0.03] animate-pulse rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="h-16">
                  <TableCell className="font-semibold text-xs text-white">
                    {u.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-white/60">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    {getRolePill(u.role)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-white/[0.06] text-white/40"
                      }`}
                    >
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-white/40 font-mono">
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never logged in"}
                  </TableCell>
                  <TableCell className="text-right">
                    {user && canManageUsers(user.role) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(u)}
                        className="text-xs h-7 px-2.5"
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User Account" : "Provision New User"}</DialogTitle>
          <DialogDescription>
            Configure user credentials and assign role-based authorization tiers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Full Name *</label>
            <Input
              required
              placeholder="e.g. Elena Rostova"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Email Address *</label>
            <Input
              type="email"
              required
              placeholder="e.g. operator@desk.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">
              {isEditing ? "New Password (Leave blank to keep unchanged)" : "Password *"}
            </label>
            <Input
              type="password"
              required={!isEditing}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Role</label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="OPERATOR">OPERATOR</option>
                <option value="ADMIN">ADMIN</option>
                <option value="VIEWER">VIEWER</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Account Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {isEditing ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
