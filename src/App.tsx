import { useEffect, useState } from "react";
import "./App.css";
import type { PluginMessageEvent, ShapeInfo } from "./model";
import { analyzeWithClaude } from "./services/claudeApi";

function App() {
	const url = new URL(window.location.href);
	const initialTheme = url.searchParams.get("theme");

	const [theme, setTheme] = useState(initialTheme || null);
	const [hasSelection, setHasSelection] = useState(false);
	const [selectedShape, setSelectedShape] = useState<ShapeInfo | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportStatus, setExportStatus] = useState<string>("");

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
					if (!message.hasSelection) {
						setExportStatus("");
					}
					break;

				case "export-start":
					setIsExporting(true);
					setExportStatus("Экспортируем shape...");
					break;

				case "export-complete":
					setIsExporting(false);
					setExportStatus(`Экспорт завершен: ${message.fileName}`);
					downloadFile(message.fileName, message.imageData);
					break;

				case "export-and-analyze-complete":
					setIsExporting(false);
					setExportStatus(`Файл скачан: ${message.fileName}`);
					downloadFile(message.fileName, message.imageData);

					// Анализируем с Claude
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

							setExportStatus("Анализ завершен и текст создан");
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

	// Функция для скачивания файла
	const downloadFile = (fileName: string, imageData: Uint8Array) => {
		try {
			const blob = new Blob([imageData], { type: "image/png" });
			// Создаем URL для blob
			const url = URL.createObjectURL(blob);

			// Создаем временную ссылку для скачивания
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;

			// Добавляем в DOM, кликаем и удаляем
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Освобождаем память
			URL.revokeObjectURL(url);

			setExportStatus(`Файл скачан: ${fileName}`);
		} catch (error) {
			console.error("Ошибка скачивания файла:", error);
			setExportStatus("Ошибка скачивания файла");
		}
	};

	// Отправляем команду экспорта (старая функция)
	const handleExportClick = () => {
		if (!hasSelection) return;

		// Отправляем сообщение в plugin.ts
		parent.postMessage({ type: "export-shape" }, "*");
	};

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
						className="export-button"
						onClick={handleExportClick}
						disabled={!hasSelection || isExporting}
					>
						{isExporting ? "Экспортируем..." : "Экспортировать PNG"}
					</button>

					<button
						className="export-button claude-button"
						onClick={handleExportAndAnalyzeClick}
						disabled={!hasSelection || isExporting}
						style={{ marginTop: "8px", backgroundColor: "#7c3aed" }}
					>
						{isExporting
							? "Экспортируем..."
							: "Скачать и анализировать с Claude"}
					</button>

					{exportStatus && (
						<div
							className={`status-message ${exportStatus.includes("Ошибка") ? "error" : "success"}`}
						>
							{exportStatus}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
