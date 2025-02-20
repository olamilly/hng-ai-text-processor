import { useState, useRef } from "react";
import { Check, Copy, Languages, Send, X } from "lucide-react";
import Loader from "./components/Loader";

const loader =
	"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' class='h-7 w-7 animate-spin text-white'><path d='M21 12a9 9 0 1 1-6.219-8.56' /></svg>";

export default function App() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [targetLanguage, setTargetLanguage] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [isSummarizing, setIsSummarizing] = useState(false);
	const [error, setError] = useState("");
	const supportedLanguages = {
		"": "",
		en: "English",
		pt: "Portuguese",
		es: "Spanish",
		ru: "Russian",
		tr: "Turkish",
		fr: "French",
	};
	const textBoxRef = useRef();

	const handleSendMessage = async (e) => {
		e.preventDefault();
		if (input.trim()) {
			setIsProcessing(true);
			setError("");
			try {
				const newMessage = {
					id: Date.now(),
					text: input.trim(),
					copied: false,
					isTranslating: false,
				};

				setInput("");

				// Detect language
				const canDetect = await self.ai.languageDetector.capabilities();
				let detector;
				if (canDetect && canDetect.available !== "no") {
					if (canDetect.available === "readily") {
						// The detection API can immediately be used.
						detector = await self.ai.languageDetector.create();
					} else {
						// The detection API can be used after the model download.
						detector = await self.ai.languageDetector.create();
						alert(
							"Detector API model downloading...check developer console for progress"
						);
						detector.addEventListener("downloadprogress", (e) => {
							console.log((e.loaded / e.total) * 100, "%");
						});
						await detector.ready;
					}

					const results = await detector.detect(newMessage.text);

					const detectedLanguage = results[0].detectedLanguage;
					newMessage.detectedLanguage = detectedLanguage;
					setMessages([...messages, newMessage]);
				} else {
					// The Detector can't be used at all.
					newMessage.detectedLanguage = "";
					setMessages([...messages, newMessage]);
					throw "CustomError: Language Detector API unavailable on your device. 😢";
				}
			} catch (err) {
				setError(String(err).split(":")[1]);
			} finally {
				setIsProcessing(false);
			}
		}
	};

	const handleSummarize = async (messageId, e) => {
		e.target.innerHTML = loader;
		setIsSummarizing(true);
		setError("");

		try {
			const messageToSummarize = messages.find((msg) => msg.id === messageId);
			if (messageToSummarize) {
				//summarize message
				const canSummarize = await self.ai.summarizer.capabilities();
				let summarizer;
				if (canSummarize && canSummarize.available !== "no") {
					const summaryOptions = {
						type: "tl;dr",
						format: "plain-text",
					};
					if (canSummarize.available === "readily") {
						// The summarizer can immediately be used.
						summarizer = await self.ai.summarizer.create(summaryOptions);
					} else {
						//after-download
						// The summarizer can be used after the model download.
						alert(
							"Summarizer API model downloading...check developer console for progress"
						);
						summarizer = await self.ai.summarizer.create(summaryOptions);
						summarizer.addEventListener("downloadprogress", (e) => {
							console.log((e.loaded / e.total) * 100, "%");
						});
						await summarizer.ready;
					}
					const summary = await summarizer.summarize(messageToSummarize.text);

					setMessages((prevMessages) =>
						prevMessages.map((msg) =>
							msg.id === messageId ? { ...msg, summary } : msg
						)
					);
				} else {
					throw "CustomError: 😢 Summary API unavailable on your device.";
				}
			}
		} catch (err) {
			setError(String(err).split(":")[1]);
		} finally {
			setIsSummarizing(false);
			e.target.innerHTML = "Summarize";
		}
	};

	const handleTranslate = async (messageId, e) => {
		setError("");
		setMessages((prevMessages) =>
			prevMessages.map((msg) =>
				msg.id === messageId ? { ...msg, isTranslating: true } : msg
			)
		);
		try {
			const messageToTranslate = messages.find((msg) => msg.id === messageId);
			if (messageToTranslate) {
				// translate message
				if ("ai" in self && "translator" in self.ai) {
					const translator = await self.ai.translator.create({
						sourceLanguage: messageToTranslate.detectedLanguage,
						targetLanguage: targetLanguage,
					});
					const translation = await translator.translate(
						messageToTranslate.text
					);
					setMessages((prevMessages) =>
						prevMessages.map((msg) =>
							msg.id === messageId
								? {
										...msg,
										translation,
										lang: targetLanguage,
										copiedSummary: false,
										copiedTranslation: false,
										isTranslating: false,
								  }
								: msg
						)
					);
				} else {
					throw "Custom Error:Translation API unavailable on your device 😢";
				}
			}
		} catch (err) {
			setError(String(err).split(":")[1]);
			setMessages((prevMessages) =>
				prevMessages.map((msg) =>
					msg.id === messageId
						? {
								...msg,
								isTranslating: false,
						  }
						: msg
				)
			);
		}
	};

	const copySummary = async (messageId) => {
		const messageToCopy = messages.find((msg) => msg.id === messageId);
		if (messageToCopy && messageToCopy.summary) {
			try {
				await navigator.clipboard.writeText(messageToCopy.summary);
				setMessages((prevMessages) =>
					prevMessages.map((msg) =>
						msg.id === messageId ? { ...msg, copiedSummary: true } : msg
					)
				);
				setTimeout(() => {
					setMessages((prevMessages) =>
						prevMessages.map((msg) =>
							msg.id === messageId ? { ...msg, copiedSummary: false } : msg
						)
					);
				}, 3000);
			} catch (err) {
				setError("Failed to copy the summary to the clipboard.");
			}
		}
	};

	const copyTranslation = async (messageId) => {
		const messageToCopy = messages.find((msg) => msg.id === messageId);
		if (messageToCopy && messageToCopy.translation) {
			try {
				await navigator.clipboard.writeText(messageToCopy.translation);
				setMessages((prevMessages) =>
					prevMessages.map((msg) =>
						msg.id === messageId ? { ...msg, copiedTranslation: true } : msg
					)
				);
				setTimeout(() => {
					setMessages((prevMessages) =>
						prevMessages.map((msg) =>
							msg.id === messageId ? { ...msg, copiedTranslation: false } : msg
						)
					);
				}, 3000);
			} catch (err) {
				setError("Failed to copy the translation to the clipboard.");
			}
		}
	};
	const getLanguageString = (lng) => {
		if (lng) {
			const lang = new Intl.DisplayNames(["en"], { type: "language" });
			return `${lang.of(lng)} detected`;
		} else {
			return "unable to detect language";
		}
	};

	return (
		<div className="flex flex-col h-screen bg-gray-100">
			<header className="p-4 bg-white w-full text-center border-b border-gray-200">
				<h1 className="text-[3.2rem]">Polyglot.ai</h1>
				<p className="text-blue-800">
					smart text summarization and translation in any language
				</p>
			</header>
			<main className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length > 0 ? (
					messages.map((message) => (
						<div
							key={message.id}
							className="bg-white rounded-lg shadow p-4 space-y-2"
						>
							<p className="text-gray-800 ">{message.text}</p>

							{message.text.length > 150 &&
								!message.summary &&
								message.detectedLanguage == "en" && (
									<button
										aria-label="Summarize"
										onClick={(e) => handleSummarize(message.id, e)}
										className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-500 disabled:opacity-50"
										disabled={isProcessing || isSummarizing}
									>
										Summarize
									</button>
								)}
							{message.summary && (
								<div className="relative">
									{!message.copiedSummary ? (
										<Copy
											onClick={() => {
												copySummary(message.id);
											}}
											size={17}
											className="absolute right-3 top-2 opacity-50 cursor-pointer hover:opacity-100"
										/>
									) : (
										<Check
											onClick={() => {
												copyTranslation(message.id);
											}}
											size={17}
											className="absolute right-3 text-green-500 top-2 cursor-pointer"
										/>
									)}

									<div className="bg-gray-100 p-2 rounded">
										<h3>Summary</h3>
										<p className="text-sm text-gray-700">{message.summary}</p>
									</div>
								</div>
							)}
							<div className="flex items-center justify-between max-sm:justify-center max-sm:flex-col flex-wrap">
								<p className="text-sm mb-1 text-gray-400">
									{getLanguageString(message.detectedLanguage)}
								</p>

								<div className="space-x-2 flex items-center justify-center max-sm:w-full">
									<span>Translate to: </span>
									<select
										value={targetLanguage}
										onChange={(e) => setTargetLanguage(e.target.value)}
										disabled={isProcessing || message.isTranslating}
										className="cursor-pointer rounded px-2 py-1 text-sm border border-gray-300 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										{Object.entries(supportedLanguages).map(
											([key, value]) =>
												key !== message.detectedLanguage && (
													<option key={key} value={key}>
														{value}
													</option>
												)
										)}
									</select>
									<button
										aria-label="Translate"
										onClick={(e) => handleTranslate(message.id, e)}
										className=" bg-blue-500 text-white px-3 disabled:opacity-50 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
										disabled={
											isProcessing ||
											targetLanguage.length === 0 ||
											message.isTranslating
										}
									>
										{message.isTranslating ? (
											<Loader />
										) : (
											<div className="flex items-center flex-wrap justify-center">
												<Languages size={17} />
												<span>Translate</span>
											</div>
										)}
									</button>
								</div>
							</div>
							{message.translation && (
								<div>
									{!message.isTranslating ? (
										<div className="relative">
											{!message.copiedTranslation ? (
												<Copy
													onClick={() => {
														copyTranslation(message.id);
													}}
													size={17}
													className="absolute right-3 top-2 opacity-50 cursor-pointer hover:opacity-100"
												/>
											) : (
												<Check
													onClick={() => {
														copyTranslation(message.id);
													}}
													size={17}
													className="absolute right-3 text-green-500 top-2 cursor-pointer"
												/>
											)}

											<div className="bg-gray-100 p-2 rounded">
												<h3>
													Translated to {supportedLanguages[message.lang]}
												</h3>
												<p className="text-sm text-gray-700">
													{message.translation}
												</p>
											</div>
										</div>
									) : (
										<div className="bg-gray-100 p-2 rounded">
											<h3>
												Translating to {supportedLanguages[targetLanguage]}...
											</h3>
										</div>
									)}
								</div>
							)}
						</div>
					))
				) : (
					<div className="h-full flex flex-col items-center justify-center gap-3 opacity-15">
						<h1>Powered by</h1>
						<img alt="chrome logo" className="w-[21rem]" src="/chrome.png" />
					</div>
				)}
			</main>
			{error && (
				<div
					className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
					role="alert"
				>
					<span className="block sm:inline">{error}</span>
					<X
						className="absolute right-2 top-3 cursor-pointer"
						onClick={() => {
							setError("");
						}}
					/>
				</div>
			)}
			<form
				onSubmit={handleSendMessage}
				className="p-4 bg-white border-t border-gray-200"
			>
				<div className="flex space-x-4">
					<div className="relative flex-1">
						<textarea
							aria-label="Message text box"
							id="message-text-box"
							name="message-text-box"
							ref={textBoxRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							className="w-full h-full p-2 border font-bold border-gray-300 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Type your text here..."
							rows={3}
							disabled={isProcessing}
						/>
						{input.trim().length > 0 && (
							<p className="absolute right-2 px-2 top-0 opacity-50 bg-blue-300 rounded-md">
								{input.length} characters
							</p>
						)}
					</div>

					<button
						aria-label="Submit"
						type="submit"
						className="px-4 py-2 disabled:bg-blue-500 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
						// Number to check if its just numbers/digits
						disabled={
							isProcessing ||
							textBoxRef.current?.value.trim().length <= 0 ||
							Number(textBoxRef.current?.value)
						}
					>
						<Send />
					</button>
				</div>
			</form>
		</div>
	);
}
