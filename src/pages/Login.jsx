import { useState } from "react";

// Ak chceš, môžeš nastaviť VITE_API_BASE v .env (napr. VITE_API_BASE=http://localhost:8080).
// Ak nie je nastavené, použije sa http://localhost (port 80).
const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost").replace(/\/$/, "");

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    function validateClientSide() {
        const e = {};
        if (!email || !email.includes("@")) e.email = "Email nie je platný";
        if (!password || password.length < 8) e.password = "Heslo musí mať aspoň 8 znakov";
        return e;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        const clientErrors = validateClientSide();
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            return;
        }

        setLoading(true);
        try {
            // Dôležité: ak tvoj backend beží na port 80, toto bude: http://localhost/?c=login&a=login
            // Ak beží inde (napr. 8080), nastav VITE_API_BASE v .env na správny host:port.
            const url = `${API_BASE}/?c=login&a=login`;

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // ponechaj ak používaš sessions/cookies
                body: JSON.stringify({ email, password }),
            });

            let data;
            try {
                data = await res.json();
            } catch {
                setErrors({ general: `Chyba servera: ${res.status}` });
                setLoading(false);
                return;
            }

            if (!res.ok) {
                if (data.errors && typeof data.errors === "object") {
                    setErrors(data.errors);
                } else {
                    setErrors({ general: data.message || "Neznáma chyba servera" });
                }
                setLoading(false);
                return;
            }

            setErrors({});
            setLoading(false);
            alert(data.message || "Prihlásenie úspešné");
        } catch (err) {
            setErrors({ general: "Nepodarilo sa spojiť so serverom" });
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white shadow rounded" noValidate>
            <h2 className="text-2xl font-bold mb-4">Prihlásenie</h2>

            {errors.general && <div className="mb-4 text-sm text-red-600">{errors.general}</div>}

            <label className="block mb-3">
                <span className="text-sm font-medium">Email</span>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.email ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </label>

            <label className="block mb-4">
                <span className="text-sm font-medium">Heslo</span>
                <input
                    type="password"
                    placeholder="Heslo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.password ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </label>

            <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading}>
                {loading ? "Posielam..." : "Prihlásiť"}
            </button>
        </form>
    );
}
