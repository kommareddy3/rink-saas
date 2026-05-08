// Thin axios wrapper that automatically attaches the Supabase access token
// to every outgoing request. Import this everywhere instead of raw axios.
import axios from "axios";
import API_BASE_URL from "./config";
import supabase from "./supabaseClient";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* unauthenticated requests are still allowed */
  }
  return config;
});

export default api;
