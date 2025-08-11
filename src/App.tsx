import { useEffect, useState } from "react";
import "./App.css";
import type { PluginMessageEvent, SavedAnalysis, ShapeInfo } from "./model";
import { analyzeWithClaude } from "./services/claudeApi";

function App() {
	const url = new URL(window.location.href);
	const initialTheme = url.searchParams.get("theme");

	const [theme, setTheme] = useState(initialTheme || null);
	const [hasSelection, setHasSelection] = useState(false);
	const [selectedShape, setSelectedShape] = useState<ShapeInfo | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportStatus, setExportStatus] = useState<string>("");
	const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis | null>(
		null,
	);

	useEffect(() => {
		// Слушаем сообщения от plugin.ts
		const handleMessage = (event: MessageEvent<PluginMessageEvent>) => {
			const message = event.data;

			switch (message.type) {
				case "theme":
					setTheme(message.content);
					break;

				case "selection-change":
					setHasSelection(message.hasSelection);
					setSelectedShape(message.shapeInfo);
					setSavedAnalysis(message.savedAnalysis || null);
					if (!message.hasSelection) {
						setExportStatus("");
					}
					break;

				case "export-start":
					setIsExporting(true);
					setExportStatus("Экспортируем shape...");
					break;

				case "export-and-analyze-complete":
					setIsExporting(false);
					setExportStatus("Анализируем с Claude...");

					// Сразу анализируем с Claude (БЕЗ скачивания файла)
					analyzeWithClaude(message.imageData)
						.then((analysis) => {
							console.log("🤖 Claude Analysis:", analysis);

							// 👉 НОВОЕ: отправляем команду создать текст
							parent.postMessage(
								{
									type: "create-text-shape",
									analysisText: analysis,
									selectedShapeInfo: message.shapeInfo,
								},
								"*",
							);

							setExportStatus("Анализ завершен");
						})
						.catch((error) => {
							console.error("❌ Claude Error:", error);
							setExportStatus("Ошибка анализа Claude");
						});
					break;

				case "error":
					setIsExporting(false);
					setExportStatus(`Ошибка: ${message.content}`);
					break;
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// Отправляем команду экспорта с анализом (новая функция)
	const handleExportAndAnalyzeClick = () => {
		if (!hasSelection) return;

		// Отправляем команду экспорта с анализом
		parent.postMessage({ type: "export-and-analyze" }, "*");
	};

	return (
		<div data-theme={theme} className="plugin-container">
			<div className="plugin-header">
				<h2>Shape Exporter</h2>
			</div>

			<div className="plugin-content">
				{hasSelection && selectedShape ? (
					<div className="selection-info">
						<h3>Выбранный элемент:</h3>
						<div className="shape-details">
							<p>
								<strong>Имя:</strong> {selectedShape.name}
							</p>
							<p>
								<strong>Тип:</strong> {selectedShape.type}
							</p>
							<p>
								<strong>Размер:</strong> {Math.round(selectedShape.width)} ×{" "}
								{Math.round(selectedShape.height)}px
							</p>
						</div>
					</div>
				) : (
					<div className="no-selection">
						<p>Выберите элемент на холсте для экспорта</p>
					</div>
				)}

				<div className="export-section">
					<button
						type="button"
						className="export-button claude-button"
						onClick={handleExportAndAnalyzeClick}
						disabled={!hasSelection || isExporting}
						style={{ marginTop: "8px", backgroundColor: "#7c3aed" }}
					>
						{isExporting ? "Анализируем..." : "Анализировать с Claude"}
					</button>

					{exportStatus && (
						<div
							className={`status-message ${exportStatus.includes("Ошибка") ? "error" : "success"}`}
						>
							{exportStatus}
						</div>
					)}
				</div>

				{hasSelection && savedAnalysis && (
					<div className="analysis-section">
						<h3>Claude Analysis:</h3>
						<div className="analysis-content">
							<div style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>
								{savedAnalysis.markdown}
							</div>
						</div>
						<div className="analysis-meta">
							<small>
								Analyzed: {new Date(savedAnalysis.timestamp).toLocaleString()}
							</small>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default App;
