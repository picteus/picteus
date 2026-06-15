// This is a polyfill for ReactDOM.findDOMNode removed in React 19
import "./react-dom-polyfill";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
