import { useState } from "react";

export default function Register() {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        isStudent: false,
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");

    function onChange(field) {
        return (e) => {
            const value = field === "isStudent" ? e.target.checked : e.target.value;
            setForm((f) => ({ ...f, [field]: value }));
            setErrors((prev) => ({ ...prev, [field]: undefined }));
            setSuccess("");
        };
    }

    function validate() {
        const e = {};
        if (!form.firstName.trim()) e.firstName = "First name is required";
        if (!form.lastName.trim()) e.lastName = "Last name is required";
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";
        if (!form.password || form.password.length < 6) e.password = "Min 6 characters";
        return e;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const eMap = validate();
        setErrors(eMap);
        setSuccess("");
        if (Object.keys(eMap).length) return;

        setLoading(true);
        try {
            const res = await fetch("http://localhost/?c=register&a=register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    isStudent: form.isStudent ? 1 : 0,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // Map backend field errors if present
                if (data && data.errors && typeof data.errors === "object") {
                    setErrors((prev) => ({ ...prev, ...data.errors }));
                } else if (data && data.message) {
                    setErrors((prev) => ({ ...prev, general: data.message }));
                } else {
                    setErrors((prev) => ({ ...prev, general: "Request failed" }));
                }
                setSuccess("");
            } else {
                setSuccess("Registration successful");
                setErrors({});
                // Optional: clear form
                setForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    isStudent: false,
                });
            }
        } catch {
            setErrors((prev) => ({ ...prev, general: "Network error" }));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-white shadow rounded p-6" noValidate>
                <h1 className="text-2xl font-bold mb-4">Registration</h1>

                {errors.general && <p className="text-red-600 text-sm mb-3">{errors.general}</p>}
                {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

                <label className="block mb-3">
                    <span className="text-sm font-medium">First name</span>
                    <input
                        type="text"
                        value={form.firstName}
                        onChange={onChange("firstName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.firstName ? "border-red-500" : "border-gray-300"}`}
                        placeholder="John"
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Last name</span>
                    <input
                        type="text"
                        value={form.lastName}
                        onChange={onChange("lastName")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.lastName ? "border-red-500" : "border-gray-300"}`}
                        placeholder="Doe"
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Email</span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={onChange("email")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.email ? "border-red-500" : "border-gray-300"}`}
                        placeholder="john.doe@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium">Password</span>
                    <input
                        type="password"
                        value={form.password}
                        onChange={onChange("password")}
                        className={`mt-1 block w-full p-2 border rounded focus:outline-none ${errors.password ? "border-red-500" : "border-gray-300"}`}
                        placeholder="********"
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </label>

                <label className="flex items-center gap-2 mb-4">
                    <input type="checkbox" checked={form.isStudent} onChange={onChange("isStudent")} className="h-4 w-4" />
                    <span className="text-sm font-medium">I am a student</span>
                </label>

                <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading}>
                    {loading ? "Submitting..." : "Register"}
                </button>
            </form>
        </div>
    );
}
