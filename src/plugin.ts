import type { PluginMessageEvent } from "./model";

// Открываем UI плагина
penpot.ui.open("Shape Exporter Plugin", `?theme=${penpot.theme}`, {
	width: 300,
	height: 200,
});

// Отправляем тему при изменении
penpot.on("themechange", (theme) => {
	sendMessage({ type: "theme", content: theme });
});

// Отправляем информацию о выбранных элементах
penpot.on("selectionchange", () => {
	const selection = penpot.selection;
	const hasSelection = selection.length > 0;
	const selectedShape = hasSelection ? selection[0] : null;

	// Читаем сохраненный анализ
	let savedAnalysis = null;
	if (selectedShape) {
		const analysisData = selectedShape.getPluginData("claude-analysis");
		if (analysisData) {
			try {
				savedAnalysis = JSON.parse(analysisData);
			} catch (error) {
				console.error("❌ Ошибка парсинга сохраненного анализа:", error);
			}
		}
	}

	sendMessage({
		type: "selection-change",
		hasSelection,
		shapeInfo: selectedShape
			? {
					id: selectedShape.id,
					name: selectedShape.name || "Unnamed Shape",
					width: selectedShape.width,
					height: selectedShape.height,
					type: selectedShape.type,
				}
			: null,
		savedAnalysis,
	});
});

// Слушаем сообщения от UI
penpot.ui.onMessage<PluginMessageEvent>((message) => {
	if (message.type === "export-and-analyze") {
		handleExportAndAnalyze();
	} else if (message.type === "create-text-shape") {
		handleCreateTextShape(message.analysisText, message.selectedShapeInfo);
	}
});

// Функция экспорта shape с анализом (новая)
async function handleExportAndAnalyze() {
	try {
		console.log("🚀 Начинаем экспорт с анализом...");
		const selection = penpot.selection;

		if (selection.length === 0) {
			sendMessage({
				type: "error",
				content: "Пожалуйста, выберите элемент для экспорта",
			});
			return;
		}

		const shape = selection[0];
		console.log("🎯 Shape для экспорта с анализом:", shape);

		sendMessage({ type: "export-start" });

		const uint8Array = await shape.export({
			type: "png",
			scale: 2,
		});
		console.log("✅ Результат экспорта:", uint8Array);

		const fileName = `${shape.name || "shape"}_claude_${Date.now()}.png`;
		console.log("✅ Название файла:", fileName);

		sendMessage({
			type: "export-and-analyze-complete",
			fileName,
			imageData: uint8Array,
			shapeInfo: {
				id: shape.id,
				name: shape.name || "Unnamed Shape",
				width: shape.width,
				height: shape.height,
				type: shape.type,
			},
		});
		console.log("✉️ Сообщение с анализом отправлено");
	} catch (error) {
		console.error("💥 Ошибка экспорта с анализом:", error);
		sendMessage({
			type: "error",
			content: `Ошибка экспорта: ${error.message}`,
		});
	}
}

// 👉 НОВАЯ ФУНКЦИЯ: Создание текста снизу от выбранного элемента
async function handleCreateTextShape(analysisText: string, shapeInfo: any) {
	try {
		console.log("💾 Сохраняем анализ Claude в PluginData...");

		// Найти оригинальный shape по ID
		const allShapes = penpot.currentPage?.findShapes();
		const originalShape = allShapes?.find((s) => s.id === shapeInfo.id);

		if (!originalShape) {
			console.error("❌ Не найден оригинальный shape");
			return;
		}

		// Создаем структурированные данные
		const analysisData = {
			markdown: analysisText,
			timestamp: Date.now(),
			shapeInfo: {
				name: shapeInfo.name,
				type: shapeInfo.type,
			},
		};

		// Сохраняем в PluginData
		originalShape.setPluginData(
			"claude-analysis",
			JSON.stringify(analysisData),
		);

		console.log("✅ Анализ сохранен в PluginData");
	} catch (error) {
		console.error("❌ Ошибка сохранения:", error);
		sendMessage({
			type: "error",
			content: `Ошибка сохранения анализа: ${error.message}`,
		});
	}
}
// Вспомогательная функция для отправки сообщений
function sendMessage(message: PluginMessageEvent) {
	penpot.ui.sendMessage(message);
}
