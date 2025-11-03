import React from "react";
import ReactDOM from "react-dom/client";
import Game from "./App.jsx"; // у тебя в канвасе export default function Game() { ... }

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>
);
