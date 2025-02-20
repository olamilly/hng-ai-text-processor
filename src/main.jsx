import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const originMeta1 = document.createElement("meta");
originMeta1.httpEquiv = "origin-trial";
originMeta1.content = import.meta.env.VITE_SUMMARIZER_TOKEN;
document.head.append(originMeta1);

const originMeta2 = document.createElement("meta");
originMeta2.httpEquiv = "origin-trial";
originMeta2.content = import.meta.env.VITE_DETECTOR_TOKEN;
document.head.append(originMeta2);

const originMeta3 = document.createElement("meta");
originMeta3.httpEquiv = "origin-trial";
originMeta3.content = import.meta.env.VITE_TRANSLATOR_TOKEN;
document.head.append(originMeta3);

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<App />
	</StrictMode>
);
