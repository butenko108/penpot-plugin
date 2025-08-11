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
	});
});

// Слушаем сообщения от UI
penpot.ui.onMessage<PluginMessageEvent>((message) => {
	if (message.type === "export-shape") {
		handleExportShape();
	} else if (message.type === "export-and-analyze") {
		handleExportAndAnalyze();
	} else if (message.type === "create-text-shape") {
		handleCreateTextShape(message.analysisText, message.selectedShapeInfo);
	}
});

// Функция экспорта shape (старая)
async function handleExportShape() {
	try {
		console.log("🚀 Начинаем экспорт...");
		const selection = penpot.selection;

		if (selection.length === 0) {
			sendMessage({
				type: "error",
				content: "Пожалуйста, выберите элемент для экспорта",
			});
			return;
		}

		const shape = selection[0];
		console.log("🎯 Shape для экспорта:", shape);

		// Показываем статус загрузки
		sendMessage({ type: "export-start" });

		// Экспортируем shape в PNG используя метод shape.export()
		const uint8Array = await shape.export({
			type: "png",
			scale: 2,
		});
		console.log("✅ Результат экспорта:", uint8Array);

		// Генерируем имя файла
		const fileName = `${shape.name || "shape"}_${Date.now()}.png`;
		console.log("✅ Название файла:", fileName);

		// Отправляем данные в UI (БЕЗ создания Blob здесь)
		console.log("📬 Отправляем Uint8Array в UI...");
		sendMessage({
			type: "export-complete",
			fileName,
			imageData: uint8Array, // Передаем сырые данные
			shapeInfo: {
				id: shape.id,
				name: shape.name || "Unnamed Shape",
				width: shape.width,
				height: shape.height,
				type: shape.type,
			},
		});
		console.log("✉️ Сообщение отправлено");
	} catch (error) {
		console.error("💥 Ошибка экспорта:", error);
		sendMessage({
			type: "error",
			content: `Ошибка экспорта: ${error.message}`,
		});
	}
}

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
		console.log("📝 Создаем текст с анализом Claude...");

		// Найти оригинальный shape по ID
		const allShapes = penpot.currentPage?.findShapes();
		const originalShape = allShapes?.find((s) => s.id === shapeInfo.id);

		if (!originalShape) {
			console.error("❌ Не найден оригинальный shape");
			return;
		}

		// Позиция снизу от выбранного элемента
		const textX = originalShape.x;
		const textY = originalShape.y + originalShape.height + 20;

		console.log(`📍 Создаем текст в позиции: x=${textX}, y=${textY}`);

		// Создать текст
		const textShape = penpot.createText(analysisText);
		textShape.x = textX;
		textShape.y = textY;
		textShape.resize(300, 100);

		// Настроить стили (опционально)
		textShape.name = `Claude Analysis: ${shapeInfo.name}`;

		console.log("✅ Текст создан:", textShape.id);
	} catch (error) {
		console.error("❌ Ошибка создания текста:", error);
		sendMessage({
			type: "error",
			content: `Ошибка создания текста: ${error.message}`,
		});
	}
}

// Вспомогательная функция для отправки сообщений
function sendMessage(message: PluginMessageEvent) {
	penpot.ui.sendMessage(message);
}
