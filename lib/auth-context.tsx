import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // TODO: Implement Supabase email/password login
      const mockUser: User = {
        id: "user_1",
        email,
        name: email.split("@")[0],
      };
      setUser(mockUser);
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      // TODO: Implement Supabase signup
      const mockUser: User = {
        id: "user_" + Date.now(),
        email,
        name,
      };
      setUser(mockUser);
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement Supabase logout
      setUser(null);
      await AsyncStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement Google OAuth
      const mockUser: User = {
        id: "user_google_" + Date.now(),
        email: "user@gmail.com",
        name: "Google User",
      };
      setUser(mockUser);
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOTP = async (email: string) => {
    try {
      setIsLoading(true);
      // TODO: Implement OTP sending
      console.log("OTP sent to:", email);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      // TODO: Implement OTP verification
      const mockUser: User = {
        id: "user_otp_" + Date.now(),
        email,
        name: email.split("@")[0],
      };
      setUser(mockUser);
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isSignedIn: !!user,
    login,
    signup,
    logout,
    loginWithGoogle,
    loginWithOTP,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
