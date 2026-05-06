import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn({ email, password });
        if (error) throw error;
        alert("Logged in successfully");
        navigate("/");
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          alert("First name and last name are required for registration.");
          setSubmitting(false);
          return;
        }

        const { error, data } = await signUp({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        });

        if (error) throw error;

        if (data?.session) {
          alert("Signed up successfully");
          navigate("/");
        } else {
          alert("Registration successful. Check your email to confirm your account.");
          setIsLogin(true);
        }
      }
    } catch (error) {
      alert(error.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen px-4 py-10">
      <div className="bg-white/10 backdrop-blur-xl p-6 sm:p-10 rounded-3xl w-full max-w-md border border-white/20">
        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 rounded-l-lg ${isLogin ? "bg-blue-500" : "bg-gray-500"}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded-r-lg ${!isLogin ? "bg-purple-500" : "bg-gray-500"}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <h2 className="text-2xl mb-6 text-center">{isLogin ? "Login" : "Register"}</h2>

        {!isLogin && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <input
                className="w-full p-3 rounded bg-black/30"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                type="text"
              />
              <input
                className="w-full p-3 rounded bg-black/30"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                type="text"
              />
            </div>
            <input
              className="w-full p-3 mb-4 rounded bg-black/30"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
          </>
        )}

        <input
          className="w-full p-3 mb-4 rounded bg-black/30"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
        />

        <input
          className="w-full p-3 mb-4 rounded bg-black/30"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? "current-password" : "new-password"}
        />

        <button
          className={`w-full py-3 rounded-lg ${isLogin ? "hover:bg-blue-600 bg-blue-500" : "hover:bg-purple-600 bg-purple-500"}`}
          onClick={handleSubmit}
          disabled={
            submitting ||
            !email ||
            !password ||
            (!isLogin && (!firstName.trim() || !lastName.trim()))
          }
        >
          {submitting ? "Processing..." : isLogin ? "Login" : "Register"}
        </button>
      </div>
    </div>
  );
}
