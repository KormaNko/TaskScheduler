import React, { useEffect, useState } from "react";

// adjust via VITE_API_BASE in .env if backend is on different host/port
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost").replace(/\/$/, "");

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);
    const [error, setError] = useState(""); // general error
    const [fieldErrors, setFieldErrors] = useState({});

    // form state for create/edit
    const emptyForm = { id: null, firstName: "", lastName: "", email: "", password: "", isStudent: false };
    const [form, setForm] = useState(emptyForm);
    const [isEditing, setIsEditing] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoadingList(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/?c=users&a=list`, {
                method: "GET",
                credentials: "include",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.message || `Load failed (${res.status})`);
            } else {
                setUsers(data.data || []);
            }
        } catch (e) {
            setError("Nepodarilo sa načítať používateľov");
        } finally {
            setLoadingList(false);
        }
    }

    function openCreate() {
        setForm(emptyForm);
        setIsEditing(false);
        setFieldErrors({});
        setError("");
        setShowForm(true);
    }

    function openEdit(user) {
        setForm({
            id: user.id,
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            email: user.email ?? "",
            password: "", // blank = unchanged
            isStudent: !!user.isStudent,
        });
        setIsEditing(true);
        setFieldErrors({});
        setError("");
        setShowForm(true);
    }

    function onChange(field) {
        return (e) => {
            const value = field === "isStudent" ? e.target.checked : e.target.value;
            setForm((f) => ({ ...f, [field]: value }));
            setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
        };
    }

    function validateForm() {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = "First name is required";
        if (!form.lastName.trim()) errs.lastName = "Last name is required";
        if (!form.email.trim()) errs.email = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Invalid email";
        if (!isEditing) {
            if (!form.password || form.password.length < 6) errs.password = "Password min 6 chars";
        } else {
            if (form.password && form.password.length > 0 && form.password.length < 6) errs.password = "Password min 6 chars";
        }
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setFieldErrors({});
        setError("");
        const errs = validateForm();
        if (Object.keys(errs).length) {
            setFieldErrors(errs);
            return;
        }

        setLoadingAction(true);
        try {
            if (!isEditing) {
                // create
                const res = await fetch(`${API_BASE}/?c=users&a=create`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        firstName: form.firstName.trim(),
                        lastName: form.lastName.trim(),
                        email: form.email.trim(),
                        password: form.password,
                        isStudent: form.isStudent ? 1 : 0,
                    }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    if (data?.errors) setFieldErrors(data.errors);
                    else setError(data?.message || `Create failed (${res.status})`);
                } else {
                    setShowForm(false);
                    fetchUsers();
                }
            } else {
                // update
                const id = form.id;
                const body = {
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    email: form.email.trim(),
                    isStudent: form.isStudent ? 1 : 0,
                };
                if (form.password) body.password = form.password; // only if changed
                const res = await fetch(`${API_BASE}/?c=users&a=update&id=${encodeURIComponent(id)}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    if (data?.errors) setFieldErrors(data.errors);
                    else setError(data?.message || `Update failed (${res.status})`);
                } else {
                    setShowForm(false);
                    fetchUsers();
                }
            }
        } catch (e) {
            setError("Akcia zlyhala");
        } finally {
            setLoadingAction(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm("Naozaj zmazať používateľa?")) return;
        setLoadingAction(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/?c=users&a=delete&id=${encodeURIComponent(id)}`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.message || `Delete failed (${res.status})`);
            } else {
                fetchUsers();
            }
        } catch {
            setError("Odstránenie zlyhalo");
        } finally {
            setLoadingAction(false);
        }
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Správa používateľov</h1>
                    <div>
                        <button onClick={openCreate} className="px-4 py-2 bg-green-600 text-white rounded">Nový používateľ</button>
                        <button onClick={fetchUsers} className="ml-2 px-3 py-2 bg-gray-200 rounded">Obnoviť</button>
                    </div>
                </div>

                {error && <div className="mb-4 text-red-600">{error}</div>}

                {showForm && (
                    <div className="mb-6 p-4 border rounded bg-white">
                        <h2 className="font-semibold mb-2">{isEditing ? "Upraviť používateľa" : "Nový používateľ"}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm">First name</label>
                                    <input value={form.firstName} onChange={onChange("firstName")} className={`mt-1 w-full p-2 border rounded ${fieldErrors.firstName ? "border-red-500" : "border-gray-300"}`} />
                                    {fieldErrors.firstName && <p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm">Last name</label>
                                    <input value={form.lastName} onChange={onChange("lastName")} className={`mt-1 w-full p-2 border rounded ${fieldErrors.lastName ? "border-red-500" : "border-gray-300"}`} />
                                    {fieldErrors.lastName && <p className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm">Email</label>
                                    <input value={form.email} onChange={onChange("email")} className={`mt-1 w-full p-2 border rounded ${fieldErrors.email ? "border-red-500" : "border-gray-300"}`} />
                                    {fieldErrors.email && <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm">Password {isEditing ? "(zmeňte len ak chcete)" : ""}</label>
                                    <input type="password" value={form.password} onChange={onChange("password")} className={`mt-1 w-full p-2 border rounded ${fieldErrors.password ? "border-red-500" : "border-gray-300"}`} />
                                    {fieldErrors.password && <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>}
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={form.isStudent} onChange={onChange("isStudent")} />
                                        <span className="text-sm">Študent</span>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button type="submit" disabled={loadingAction} className="px-4 py-2 bg-blue-600 text-white rounded">
                                    {loadingAction ? "Čakajte..." : (isEditing ? "Uložiť" : "Vytvoriť")}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded">Zrušiť</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white shadow rounded overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 text-left">ID</th>
                            <th className="p-2 text-left">Meno</th>
                            <th className="p-2 text-left">Priezvisko</th>
                            <th className="p-2 text-left">Email</th>
                            <th className="p-2 text-left">Študent</th>
                            <th className="p-2 text-left">Vytvorené</th>
                            <th className="p-2 text-left">Akcie</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loadingList ? (
                            <tr><td colSpan="7" className="p-4 text-center">Načítavam...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="7" className="p-4 text-center">Žiadni používatelia</td></tr>
                        ) : users.map((u) => (
                            <tr key={u.id} className="border-t">
                                <td className="p-2">{u.id}</td>
                                <td className="p-2">{u.firstName}</td>
                                <td className="p-2">{u.lastName}</td>
                                <td className="p-2">{u.email}</td>
                                <td className="p-2">{u.isStudent ? "Áno" : "Nie"}</td>
                                <td className="p-2">{u.created_at ?? "-"}</td>
                                <td className="p-2">
                                    <button onClick={() => openEdit(u)} className="mr-2 px-2 py-1 bg-yellow-400 text-black rounded">Upraviť</button>
                                    <button onClick={() => handleDelete(u.id)} className="px-2 py-1 bg-red-600 text-white rounded">Vymazať</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
