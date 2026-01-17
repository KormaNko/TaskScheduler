// Import React knižnice a hookov useState a useEffect
import React, { useEffect, useState } from "react"; // React a základné hooky

// Základná adresa backendu – buď z .env súboru alebo localhost
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost").replace(/\/$/, ""); // odstráni trailing slash

// Hlavný React komponent pre správu používateľov
export default function UsersPage() {

    // ============================
    // ===== STAVY (useState) =====
    // ============================

    // Zoznam používateľov z databázy
    const [users, setUsers] = useState([]); // pole user objektov

    // Indikátor načítavania zoznamu
    const [loadingList, setLoadingList] = useState(false); // boolean pre loading list

    // Indikátor pre vytváranie, úpravu, mazanie
    const [loadingAction, setLoadingAction] = useState(false); // boolean pre akcie (create/update/delete)

    // Všeobecná chyba (napr. zo servera)
    const [error, setError] = useState(""); // globálna chybová správa

    // Chyby konkrétnych polí formulára
    const [fieldErrors, setFieldErrors] = useState({}); // objekt mapujúci pole -> chyba

    // Clear in-memory users when app logs out
    React.useEffect(() => {
        function onLoggedOut() {
            setUsers([]);
            setLoadingList(false);
            setLoadingAction(false);
            setError("");
            setFieldErrors({});
            setShowForm(false);
        }
        window.addEventListener('app:logged-out', onLoggedOut);
        return () => window.removeEventListener('app:logged-out', onLoggedOut);
    }, []);

    // Preddefinovaný prázdny formulár
    const emptyForm = {
        id: null, // id pre editáciu
        firstName: "", // meno
        lastName: "", // priezvisko
        email: "", // email
        password: "", // heslo (iba pri vytváraní alebo ak sa mení)
        isStudent: false, // boolean indikujúci študenta
    };

    // Stav pre formulár
    const [form, setForm] = useState(emptyForm); // aktuálne hodnoty formulára

    // Určuje, či upravujeme existujúceho používateľa
    const [isEditing, setIsEditing] = useState(false); // režim editácie

    // Určuje, či sa má zobraziť formulár
    const [showForm, setShowForm] = useState(false); // či je formulár viditeľný

    // ============================
    // ===== NAČÍTANIE DÁT ========
    // ============================

    // Spustí sa automaticky po načítaní stránky
    useEffect(() => {
        fetchUsers(); // načítaj používateľov pri mount
    }, []); // prázdne závislosti -> len raz

    // Funkcia na načítanie používateľov zo servera
    async function fetchUsers() {
        setLoadingList(true);  // zapne sa loading
        setError("");          // vymaže sa stará chyba

        try {
            // Odoslanie GET požiadavky na backend
            const res = await fetch(`${API_BASE}/?c=users&a=list`, {
                method: "GET", // GET požiadavka
                credentials: "include", // kvôli session cookies
            });

            // Pokus o načítanie JSON odpovede
            const data = await res.json().catch(() => null); // bezpečný parse

            // Ak odpoveď nie je OK (status != 200)
            if (!res.ok) {
                setError(data?.message || `Načítanie zlyhalo (${res.status})`); // nastav chybovú správu
            } else {
                // Uloženie používateľov do stavu
                setUsers(data.data || []); // ulož pole (alebo prázdne)
            }
        } catch (e) {
            setError("Nepodarilo sa načítať používateľov"); // sieť alebo iná chyba
        } finally {
            setLoadingList(false); // vypne sa loading
        }
    }

    // ============================
    // ===== OTVORENIE FORMULÁRA ===
    // ============================

    // Otvorenie formulára pre vytvorenie nového používateľa
    function openCreate() {
        setForm(emptyForm);     // vyčistenie formulára
        setIsEditing(false);   // prepnutie do režimu vytvárania
        setFieldErrors({});    // vymazanie chýb
        setError(""); // vymaž globálnu chybu
        setShowForm(true);     // zobrazenie formulára
    }

    // Otvorenie formulára pre úpravu používateľa
    function openEdit(user) {
        setForm({
            id: user.id, // nastav id z existujúceho usera
            firstName: user.firstName ?? "", // bezpečný fallback
            lastName: user.lastName ?? "",
            email: user.email ?? "",
            password: "",       // heslo ostane prázdne pri editácii
            isStudent: !!user.isStudent, // prekonvertuj na boolean
        });

        setIsEditing(true);   // prepnutie do režimu úpravy
        setFieldErrors({}); // vymaž polia chýb
        setError(""); // vymaž globálnu chybu
        setShowForm(true); // zobraz formulár
    }

    // ============================
    // ===== OVLÁDANIE INPUTOV =====
    // ============================

    // Univerzálny onChange pre všetky inputy
    function onChange(field) {
        return (e) => {
            // Checkbox používa checked, input používa value
            const value = field === "isStudent"
                ? e.target.checked // checkbox
                : e.target.value; // text/email/password

            // Aktualizácia formulára
            setForm((f) => ({...f, [field]: value})); // spread + override

            // Vymazanie chyby konkrétneho poľa
            setFieldErrors((prev) => ({...prev, [field]: undefined})); // odstráni chybu
        };
    }

    // ============================
    // ===== VALIDÁCIA FORMULÁRA ==
    // ============================

    function validateForm() {
        const errs = {}; // objekt pre chyby

        if (!form.firstName.trim()) errs.firstName = "Meno je povinné"; // meno required
        if (!form.lastName.trim()) errs.lastName = "Priezvisko je povinné"; // priezvisko required

        if (!form.email.trim()) errs.email = "Email je povinný"; // email required
        else if (!/^\S+@\S+\.\S+$/.test(form.email))
            errs.email = "Neplatný email"; // jednoduchý regex

        if (!isEditing) {
            if (!form.password || form.password.length < 6)
                errs.password = "Heslo musí mať aspoň 6 znakov"; // pri vytváraní povinné heslo
        } else {
            if (form.password && form.password.length < 6)
                errs.password = "Heslo musí mať aspoň 6 znakov"; // pri editácii len ak sa zadá
        }

        return errs; // vráť chyby (prázdny objekt = OK)
    }

    // ============================
    // ===== ODOSLANIE FORMULÁRA ==
    // ============================

    async function handleSubmit(e) {
        e.preventDefault(); // zabráni reloadu stránky

        setFieldErrors({}); // reset chýb
        setError(""); // reset globálnej chyby

        // Kontrola formulára
        const errs = validateForm(); // získaj chyby
        if (Object.keys(errs).length) {
            setFieldErrors(errs); // ak sú chyby, zobraz ich
            return; // nepristupuj k serveru
        }

        setLoadingAction(true); // zapni loading pre akciu

        try {
            // ===== VYTVÁRANIE =====
            if (!isEditing) {
                const res = await fetch(`${API_BASE}/?c=users&a=create`, {
                    method: "POST", // POST pre vytvorenie
                    headers: {"Content-Type": "application/json"}, // JSON
                    credentials: "include", // cookies
                    body: JSON.stringify({
                        firstName: form.firstName.trim(), // trimni meno
                        lastName: form.lastName.trim(), // trimni priezvisko
                        email: form.email.trim(), // trimni email
                        password: form.password, // heslo
                        isStudent: form.isStudent ? 1 : 0, // backend očakáva 1/0
                    }),
                });

                const data = await res.json().catch(() => null); // parse alebo null

                if (!res.ok) {
                    if (data?.errors) setFieldErrors(data.errors); // field errors z backendu
                    else setError(data?.message || "Vytvorenie zlyhalo"); // iná chyba
                } else {
                    setShowForm(false); // zatvor formulár
                    fetchUsers(); // refresh zoznamu
                }
            }
            // ===== ÚPRAVA =====
            else {
                const body = {
                    firstName: form.firstName.trim(), // trim
                    lastName: form.lastName.trim(),
                    email: form.email.trim(),
                    isStudent: form.isStudent ? 1 : 0, // 1/0
                };

                if (form.password) body.password = form.password; // pridaj heslo len ak je zadané

                const res = await fetch(
                    `${API_BASE}/?c=users&a=update&id=${encodeURIComponent(form.id)}`,
                    {
                        method: "POST", // POST pre update
                        headers: {"Content-Type": "application/json"},
                        credentials: "include",
                        body: JSON.stringify(body), // telo s upravenými dátami
                    }
                );

                const data = await res.json().catch(() => null); // parse alebo null

                if (!res.ok) {
                    if (data?.errors) setFieldErrors(data.errors); // nastav field errors
                    else setError(data?.message || "Úprava zlyhala"); // iná chyba
                } else {
                    setShowForm(false); // zatvor formulár
                    fetchUsers(); // reload zoznamu
                }
            }
        } catch (e) {
            setError("Akcia zlyhala"); // sieťová chyba
        } finally {
            setLoadingAction(false); // vypni loading akcie
        }
    }

    // ============================
    // ===== MAZANIE USERA ========
    // ============================

    async function handleDelete(id) {
        if (!confirm("Naozaj zmazať používateľa?")) return; // potvrdenie od používateľa

        setLoadingAction(true); // zapni loading
        setError(""); // vymaž chybu

        try {
            const res = await fetch(
                `${API_BASE}/?c=users&a=delete&id=${encodeURIComponent(id)}`,
                { method: "POST", credentials: "include" } // POST pre delete
            );

            const data = await res.json().catch(() => null); // parse alebo null

            if (!res.ok) {
                setError(data?.message || "Mazanie zlyhalo"); // nastav chybu
            } else {
                fetchUsers(); // refresh zoznamu
            }
        } catch (e) {
            setError("Odstránenie zlyhalo"); // sieťová chyba
        } finally {
            setLoadingAction(false); // vypni loading
        }
    }

    // ============================
    // ===== RENDER (JSX) ========
    // ============================

    return (
        <div className="p-6">{/* hlavný kontajner s paddingom */}
            <div className="flex items-center justify-between mb-4">{/* header s titulkom a tlačidlom */}
                <h1 className="text-2xl font-bold">Používatelia</h1>{/* názov sekcie */}
                <div className="flex items-center gap-2">{/* wrapper pre tlačidlá */}
                    <button
                        type="button"
                        onClick={openCreate}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Nový používateľ{/* text tlačidla */}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 text-sm text-red-600">{error}</div> // zobrazenie globálnej chyby
            )}

            {loadingList ? (
                <div className="text-gray-500">Načítavam používateľov...</div> // loading indikátor pre zoznam
            ) : (
                <>
                    {/* DESKTOP / TABLE VIEW - visible on md+ */}
                    <div className="hidden md:block overflow-x-auto bg-white rounded shadow">
                        <table className="w-full table-auto">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="text-left p-2">Meno</th>
                                    <th className="text-left p-2">Priezvisko</th>
                                    <th className="text-left p-2">Email</th>
                                    <th className="text-left p-2">Študent</th>
                                    <th className="text-right p-2">Akcie</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500">Žiadni používatelia</td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="border-t">
                                            <td className="p-2">{u.firstName}</td>
                                            <td className="p-2">{u.lastName}</td>
                                            <td className="p-2">{u.email}</td>
                                            <td className="p-2">{u.isStudent ? "Áno" : "Nie"}</td>
                                            <td className="p-2 text-right">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="mr-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    Upraviť
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                                >
                                                    Zmazať
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE / CARD VIEW - visible on small screens */}
                    <div className="md:hidden space-y-3">
                        {users.length === 0 ? (
                            <div className="p-4 bg-white rounded shadow text-center text-gray-500">Žiadni používatelia</div>
                        ) : (
                            users.map((u) => (
                                <div key={u.id} className="bg-white rounded shadow p-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{u.firstName} {u.lastName}</div>
                                            <div className="text-sm text-gray-500">{u.email}</div>
                                        </div>
                                        <div className="text-sm text-gray-600">{u.isStudent ? 'Študent' : ''}</div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => openEdit(u)} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded">Upraviť</button>
                                        <button onClick={() => handleDelete(u.id)} className="flex-1 px-3 py-2 bg-red-600 text-white rounded">Zmazať</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="mt-6 bg-white p-4 shadow rounded max-w-lg">{/* formulár */}
                    <h2 className="text-lg font-semibold mb-3">{isEditing ? "Upraviť používateľa" : "Nový používateľ"}</h2>{/* nadpis formulára */}

                    <label className="block mb-2">{/* meno */}
                        <span className="text-sm">Meno</span>
                        <input
                            type="text"
                            value={form.firstName} // via state
                            onChange={onChange("firstName")} // handler
                            className={`mt-1 block w-full p-2 border rounded ${fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {fieldErrors.firstName && <div className="text-red-600 text-sm mt-1">{fieldErrors.firstName}</div>}
                    </label>

                    <label className="block mb-2">{/* priezvisko */}
                        <span className="text-sm">Priezvisko</span>
                        <input
                            type="text"
                            value={form.lastName}
                            onChange={onChange("lastName")}
                            className={`mt-1 block w-full p-2 border rounded ${fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {fieldErrors.lastName && <div className="text-red-600 text-sm mt-1">{fieldErrors.lastName}</div>}
                    </label>

                    <label className="block mb-2">{/* email */}
                        <span className="text-sm">Email</span>
                        <input
                            type="email"
                            value={form.email}
                            onChange={onChange("email")}
                            className={`mt-1 block w-full p-2 border rounded ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {fieldErrors.email && <div className="text-red-600 text-sm mt-1">{fieldErrors.email}</div>}
                    </label>

                    <label className="block mb-2">{/* heslo */}
                        <span className="text-sm">Heslo {isEditing ? <small className="text-gray-500">(nepovinné)</small> : null}</span>
                        <input
                            type="password"
                            value={form.password}
                            onChange={onChange("password")}
                            className={`mt-1 block w-full p-2 border rounded ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {fieldErrors.password && <div className="text-red-600 text-sm mt-1">{fieldErrors.password}</div>}
                    </label>

                    <label className="flex items-center gap-2 mb-4">{/* isStudent checkbox */}
                        <input type="checkbox" checked={!!form.isStudent} onChange={onChange("isStudent")} className="h-4 w-4" />
                        <span className="text-sm">Je študent</span>
                    </label>

                    <div className="flex items-center gap-2">{/* tlačidlá uložiť / zrušiť */}
                        <button type="submit" disabled={loadingAction} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                            {loadingAction ? 'Ukladám...' : 'Uložiť'}{/* dynamický text tlačidla */}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1 bg-gray-200 rounded">
                            Zrušiť{/* zrušenie formulára */}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
