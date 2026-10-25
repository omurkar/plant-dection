declare module './context/AuthContext' {
  export const AuthProvider: any;
  export const useAuth: () => { currentUser?: any };
}

declare module './context/ThemeContext' {
  export const ThemeProvider: any;
}

declare module '../context/ThemeContext' {
  export const useTheme: () => { darkMode: boolean; toggleTheme: () => void };
}
