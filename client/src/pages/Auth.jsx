import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (isLogin) {
        const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
        localStorage.setItem("token", res.data.token);
        alert("Logged in");
      } else {
        await axios.post(`${API_BASE_URL}/auth/register`, { email, password });
        alert("Registered");
        setIsLogin(true); // Switch to login after register
      }
    } catch (error) {
      alert(error.response?.data?.message || "Error");
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
        <input
          className="w-full p-3 mb-4 rounded bg-black/30"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-3 mb-4 rounded bg-black/30"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className={`w-full py-3 rounded-lg ${isLogin ? "hover:bg-blue-600 bg-blue-500" : "hover:bg-purple-600 bg-purple-500"}`}
          onClick={handleSubmit}
        >
          {isLogin ? "Login" : "Register"}
        </button>
      </div>
    </div>
  );
}