// Import React hooku useState, ktorý slúži na ukladanie stavových premenných
import { useState } from "react";

// Hlavná React komponenta pre registráciu používateľa
export default function Register() {

    // Jeden spoločný stav pre celý formulár (všetky vstupné polia)
    const [form, setForm] = useState({
        firstName: "",   // krstné meno používateľa
        lastName: "",    // priezvisko používateľa
        email: "",       // email používateľa
        password: "",    // heslo používateľa
        isStudent: false, // informácia, či je používateľ študent
    });

    // Stav na ukladanie chýb ku konkrétnym poliam + všeobecná chyba
    const [errors, setErrors] = useState({});

    // Stav určujúci, či prebieha odosielanie formulára na server
    const [loading, setLoading] = useState(false);

    // Stav pre úspešnú správu po správnej registrácii
    const [success, setSuccess] = useState("");

    // Univerzálna funkcia na spracovanie zmien v input poliach
    function onChange(field) {
        return (e) => {

            // Ak ide o checkbox (isStudent), berie sa checked, inak value
            const value = field === "isStudent"
                ? e.target.checked
                : e.target.value;

            // Aktualizácia konkrétneho poľa vo formulári
            setForm((f) => ({ ...f, [field]: value }));

            // Odstránenie chyby pre konkrétne pole
            setErrors((prev) => ({ ...prev, [field]: undefined }));

            // Vymazanie úspešnej správy pri zmene údajov
            setSuccess("");
        };
    }

    // Funkcia na klientskú validáciu údajov pred odoslaním na server
    function validate() {
        const e = {}; // Objekt na ukladanie validančných chýb

        // Kontrola, či je krstné meno vyplnené
        if (!form.firstName.trim()) {
            e.firstName = "First name is required";
        }

        // Kontrola, či je priezvisko vyplnené
        if (!form.lastName.trim()) {
            e.lastName = "Last name is required";
        }

        // Kontrola, či je email vyplnený
        if (!form.email.trim()) {
            e.email = "Email is required";
        }
        // Kontrola formátu emailu pomocou regulárneho výrazu
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
            e.email = "Invalid email";
        }

        // Kontrola dĺžky hesla
        if (!form.password || form.password.length < 6) {
            e.password = "Min 6 characters";
        }

        // Vrátenie zoznamu chýb
        return e;
    }

    // Funkcia, ktorá sa zavolá po odoslaní formulára
    async function handleSubmit(e) {

        // Zruší klasický reload stránky po odoslaní formulára
        e.preventDefault();

        // Spustenie validácie
        const eMap = validate();

        // Nastavenie chýb do stavu
        setErrors(eMap);

        // Vymazanie starej úspešnej správy
        setSuccess("");

        // Ak existujú chyby, formulár sa neodošle
        if (Object.keys(eMap).length) return;

        // Zapnutie stavu načítavania
        setLoading(true);

        try {
            // Odoslanie POST požiadavky na backend
            const res = await fetch("http://localhost/?c=register&a=register", {
                method: "POST", // HTTP metóda POST
                headers: {
                    "Content-Type": "application/json", // odosielame JSON
                },
                body: JSON.stringify({
                    // Odosielané dáta na server
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    isStudent: form.isStudent ? 1 : 0, // boolean sa prevádza na 1 / 0
                }),
            });

            // Pokus o načítanie JSON odpovede zo servera
            const data = await res.json().catch(() => ({}));

            // Ak odpoveď zo servera NIE je úspešná
            if (!res.ok) {

                // Ak backend poslal chyby ku konkrétnym poliam
                if (data && data.errors && typeof data.errors === "object") {
                    setErrors((prev) => ({ ...prev, ...data.errors }));
                }

                // Ak backend poslal len všeobecnú správu
                else if (data && data.message) {
                    setErrors((prev) => ({ ...prev, general: data.message }));
                }

                // Ak server nevrátil žiadne dáta
                else {
                    setErrors((prev) => ({ ...prev, general: "Request failed" }));
                }

                // Vymazanie úspešnej správy
                setSuccess("");
            }

            // Ak bola registrácia úspešná
            else {
                setSuccess("Registration successful"); // úspešná hláška
                setErrors({}); // vymazanie chýb

                // Vyčistenie formulára
                setForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    isStudent: false,
                });
            }
        }

            // Ak nastane sieťová chyba (server neodpovedá)
        catch {
            setErrors((prev) => ({ ...prev, general: "Network error" }));
        }

            // V každom prípade sa vypne loading
        finally {
            setLoading(false);
        }
    }

    // HTML (JSX) rozhranie registračného formulára
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">

            {/* Samotný registračný formulár */}
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md bg-white shadow rounded p-6"
                noValidate
            >

                {/* Nadpis formulára */}
                <h1 className="text-2xl font-bold mb-4">Registration</h1>

                {/* Všeobecná chyba zo servera */}
                {errors.general && (
                    <p className="text-red-600 text-sm mb-3">{errors.general}</p>
                )}

                {/* Úspešná správa po registrácii */}
                {success && (
                    <p className="text-green-600 text-sm mb-3">{success}</p>
                )}

                {/* Input pre krstné meno */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">First name</span>
                    <input
                        type="text"
                        value={form.firstName}
                        onChange={onChange("firstName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.firstName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="John"
                    />
                    {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.firstName}
                        </p>
                    )}
                </label>

                {/* Input pre priezvisko */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">Last name</span>
                    <input
                        type="text"
                        value={form.lastName}
                        onChange={onChange("lastName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.lastName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Doe"
                    />
                    {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.lastName}
                        </p>
                    )}
                </label>

                {/* Input pre email */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">Email</span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={onChange("email")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.email ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="john.doe@example.com"
                    />
                    {errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.email}
                        </p>
                    )}
                </label>

                {/* Input pre heslo */}
                <label className="block mb-3">
                    <span className="text-sm font-medium">Password</span>
                    <input
                        type="password"
                        value={form.password}
                        onChange={onChange("password")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${
                            errors.password ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="********"
                    />
                    {errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                            {errors.password}
                        </p>
                    )}
                </label>

                {/* Checkbox pre študenta */}
                <label className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        checked={form.isStudent}
                        onChange={onChange("isStudent")}
                        className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">I am a student</span>
                </label>

                {/* Tlačidlo na odoslanie formulára */}
                <button
                    type="submit"
                    className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-60"
                    disabled={loading}
                >
                    {loading ? "Submitting..." : "Register"}
                </button>

            </form>
        </div>
    );
}
