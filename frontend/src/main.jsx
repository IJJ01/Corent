import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { ColorModeProvider } from "./styles/ColorModeProvider";
import { AuthProvider } from "./auth/AuthContext";
import "./styles/userTheme.css";
import "./styles/app.css";
import "./styles/userFooter.css";

import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ColorModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ColorModeProvider>
  </React.StrictMode>
);
