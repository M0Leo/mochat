import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password });

export const register = (data: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}) => api.post("/auth/register", data);

export const logout = () => api.post("/auth/logout");

// Users
export const getMe = () => api.get("/users/me");
export const getUser = (id: string) => api.get(`/users/${id}`);
export const searchUsers = (q: string) => api.get(`/users/search?q=${q}`);
export const updateMe = (data: Record<string, string>) =>
  api.patch("/users/me", data);

// Chats
export const getChats = () => api.get("/chats");
export const getChat = (id: string) => api.get(`/chats/${id}`);
export const createChat = (data: {
  type: string;
  title?: string;
  participants: string[];
}) => api.post("/chats", data);
export const getPublicGroups = () => api.get("/chats/public");
export const joinChat = (chatId: string) => api.post(`/chats/${chatId}/join`);
export const getMessages = (chatId: string, cursor?: string) =>
  api.get(`/chats/${chatId}/messages${cursor ? `?cursor=${cursor}` : ""}`);
export const sendMessage = (
  chatId: string,
  data: { content?: string; type: string; mediaUrl?: string }
) => api.post(`/chats/${chatId}/messages`, data);
export const leaveChat = (chatId: string) =>
  api.delete(`/chats/${chatId}/leave`);
