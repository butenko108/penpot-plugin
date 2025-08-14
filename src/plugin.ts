import type { PluginMessage, PluginToUIMessage } from "./model";
import { loadASTFromShape, saveASTToShape } from "./services/astStorageService";
import { AutoTagService } from "./services/auto-tag-service";
import { ExportService } from "./services/export-service";
import {
	loadReactComponentFromShape,
	removeReactComponentFromShape,
	saveReactComponentToShape,
} from "./services/reactComponentStorageService";
import { TagService } from "./services/tag-service";

// ==========================================
// ИНИЦИАЛИЗАЦИЯ СЕРВИСОВ
// ==========================================

// Сервисы для семантического тегирования
const tagService = new TagService();
const exportService = new ExportService();
const autoTagService = new AutoTagService();

// ==========================================
// ИНИЦИАЛИЗАЦИЯ ПЛАГИНА
// ==========================================

// Открываем UI плагина
penpot.ui.open("Claude Analysis & Semantic Tagging", `?theme=${penpot.theme}`, {
	width: 350,
	height: 700,
});

// ==========================================
// ОБРАБОТЧИКИ СОБЫТИЙ PENPOT
// ==========================================

// Отправляем тему при изменении
penpot.on("themechange", (theme) => {
	sendMessage({ type: "theme", content: theme });
});

// Отправляем информацию о выбранных элементах (для обеих функций)
penpot.on("selectionchange", () => {
	const selection = penpot.selection;
	const hasSelection = selection.length > 0;
	const selectedShape = hasSelection ? selection[0] : null;

	// Читаем сохраненный Claude анализ
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

	// ДОБАВИТЬ: Читаем сохраненный AST
	let savedAST = null;
	if (selectedShape) {
		const astData = loadASTFromShape(selectedShape);
		if (astData) {
			savedAST = astData;
			console.log("✅ AST загружен для shape:", selectedShape.id);
		}
	}

	// Отправляем данные для Claude функциональности
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

	// ДОБАВИТЬ: Отправляем AST данные в UI
	sendMessage({
		type: "ast-loaded",
		data: savedAST,
	});

	// Отправляем данные для Semantic функциональности
	const selectionData = selection.map((element) => ({
		id: element.id,
		name: element.name || "Unnamed",
		type: element.type,
	}));

	sendMessage({
		type: "selection-update",
		data: selectionData,
	});

	// ДОБАВИТЬ: Читаем сохраненный React компонент
	let savedReactComponent = null;
	if (selectedShape) {
		const reactComponentData = loadReactComponentFromShape(selectedShape);
		if (reactComponentData) {
			savedReactComponent = {
				componentCode: reactComponentData.componentCode,
				timestamp: reactComponentData.timestamp,
			};
			console.log("✅ React компонент загружен для shape:", selectedShape.id);
		}
	}

	// Отправляем данные для Claude функциональности (существующий код остается)
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

	// ДОБАВИТЬ: Отправляем AST данные в UI (существующий код остается)
	sendMessage({
		type: "ast-loaded",
		data: savedAST,
	});

	// ДОБАВИТЬ: Отправляем React компонент данные в UI
	sendMessage({
		type: "react-component-loaded",
		data: savedReactComponent,
	});
});

// ==========================================
// ЗАГРУЗКА СУЩЕСТВУЮЩИХ ДАННЫХ
// ==========================================

// Загружаем существующие семантические теги при запуске
function loadExistingTags(): void {
	const loadedTags = tagService.loadExistingTags();

	// Отправляем загруженные данные в UI
	sendMessage({
		type: "tags-loaded",
		data: loadedTags,
	});
}

// Инициализируем загрузку тегов
loadExistingTags();

// ==========================================
// ОБРАБОТЧИК СООБЩЕНИЙ ОТ UI
// ==========================================

penpot.ui.onMessage<PluginMessage>((message) => {
	switch (message.type) {
		// ==========================================
		// CLAUDE ФУНКЦИОНАЛЬНОСТЬ
		// ==========================================
		case "export-and-analyze":
			handleExportAndAnalyze();
			break;

		case "create-text-shape":
			handleCreateTextShape(message.analysisText, message.selectedShapeInfo);
			break;

		// ==========================================
		// SEMANTIC ФУНКЦИОНАЛЬНОСТЬ
		// ==========================================
		case "get-selection":
			sendSelectionUpdate();
			break;

		case "apply-tag":
			handleApplyTag(message.data);
			break;

		case "remove-tag":
			handleRemoveTag(message.data);
			break;

		case "export-tags":
			handleExportTags();
			break;

		case "auto-tag-selection":
			handleAutoTagSelection(message.data);
			break;

		case "generate-rich-json":
			handleGenerateRichJson();
			break;

		case "save-ast":
			handleSaveAST(message.data);
			break;

		case "clear-ast":
			handleClearAST(message.shapeId);
			break;

		case "generate-react-component":
			handleGenerateReactComponent(message.data);
			break;

		case "save-react-component":
			handleSaveReactComponent(message.data);
			break;

		case "clear-react-component":
			handleClearReactComponent(message.shapeId);
			break;

		default:
			console.warn("Неизвестный тип сообщения:", message.type);
	}
});

// ==========================================
// CLAUDE ФУНКЦИИ
// ==========================================

// Функция экспорта shape с анализом
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

// Создание текста и сохранение анализа Claude
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

// ==========================================
// SEMANTIC ФУНКЦИИ
// ==========================================

// Отправка обновления выбора
function sendSelectionUpdate(): void {
	const selection = penpot.selection;
	const selectionData = selection.map((element) => ({
		id: element.id,
		name: element.name || "Unnamed",
		type: element.type,
	}));

	sendMessage({
		type: "selection-update",
		data: selectionData,
	});
}

// Применение тега к элементам
function handleApplyTag(data: any): void {
	if (data) {
		const appliedTags = tagService.applyTagToElements(
			data.tag,
			data.properties,
			data.elementIds,
		);

		// Отправляем подтверждение для каждого примененного тега
		appliedTags.forEach((tagData) => {
			sendMessage({
				type: "tag-applied",
				data: tagData,
			});
		});

		// Сохраняем в файл
		tagService.saveTagsToFile();
	}
}

// Удаление тега с элементов
function handleRemoveTag(data: any): void {
	if (data) {
		const removedIds = tagService.removeTagFromElements(data.elementIds);

		// Отправляем подтверждение для каждого удаленного тега
		removedIds.forEach((elementId) => {
			sendMessage({
				type: "tag-removed",
				data: { elementId },
			});
		});

		// Сохраняем в файл
		tagService.saveTagsToFile();
	}
}

// Экспорт тегов
function handleExportTags(): void {
	const exportData = exportService.exportTags(tagService.getTaggedElements());

	// Отправляем данные в UI для обработки загрузки
	sendMessage({
		type: "export-data",
		data: exportData,
	});
}

// Автоматическое тегирование выбранных элементов
function handleAutoTagSelection(data: any): void {
	if (data && data.elementIds) {
		const result = autoTagService.autoTagElements(
			data.elementIds,
			tagService.getTaggedElements(),
		);

		// Отправляем подтверждение для каждого примененного тега
		result.appliedTags.forEach((tagData) => {
			sendMessage({
				type: "tag-applied",
				data: tagData,
			});
		});

		// Отправляем сообщение о завершении
		sendMessage({
			type: "auto-tag-complete",
			data: {
				taggedCount: result.taggedCount,
				processedElements: result.processedElements,
			},
		});

		// Сохраняем в файл
		tagService.saveTagsToFile();
	}
}

// Генерация богатого JSON для кодогенерации
function handleGenerateRichJson(): void {
	const taggedElements = tagService.getTaggedElements();

	if (taggedElements.size === 0) {
		sendMessage({
			type: "rich-json-data",
			data: { metadata: {}, tree: [] },
		});
		return;
	}

	// Используем ту же логику, что и в exportTags, для получения только корневых shape
	const exportData = exportService.exportTags(taggedElements);

	// Отправляем богатые JSON данные в UI для генерации кода
	sendMessage({
		type: "rich-json-data",
		data: exportData,
	});
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

// Вспомогательная функция для отправки сообщений
function sendMessage(message: PluginToUIMessage) {
	penpot.ui.sendMessage(message);
}

/**
 * Handle saving AST to shape plugin data
 */
function handleSaveAST(data: any): void {
	try {
		console.log("💾 Сохраняем AST в Plugin Data...");

		// Найти shape по ID
		const shape = penpot.currentPage?.getShapeById(data.shapeId);
		if (!shape) {
			throw new Error("Shape не найден");
		}

		// Подготовить метаданные для сохранения
		const metadata = {
			shapeInfo: {
				id: data.shapeId,
				name: shape.name || "Unnamed",
			},
			htmlCode: data.metadata.htmlOutput,
			cssCode: data.metadata.cssOutput,
			metaInfo: data.metadata.metaInfo,
		};

		// Сохранить AST используя storage service
		saveASTToShape(shape, data.astData, metadata);

		// Попробовать распарсить AST для отправки в UI
		let parsedAST;
		try {
			parsedAST = JSON.parse(data.astData);
		} catch (parseError) {
			console.warn("AST не является валидным JSON, отправляем как строку");
			parsedAST = data.astData;
		}

		// Отправить подтверждение в UI
		sendMessage({
			type: "ast-generated",
			data: {
				astData: parsedAST,
				success: true,
			},
		});

		console.log("✅ AST успешно сохранен");
	} catch (error) {
		console.error("❌ Ошибка сохранения AST:", error);
		sendMessage({
			type: "ast-error",
			content: error.message,
		});
	}
}

function handleClearAST(shapeId: string): void {
	try {
		const shape = penpot.currentPage?.getShapeById(shapeId);
		if (shape) {
			shape.setPluginData("component-ast", "");
			console.log("✅ AST очищен для shape:", shapeId);
		}
	} catch (error) {
		console.error("❌ Ошибка очистки AST:", error);
	}
}

/**
 * Handle generating React component from AST
 */
async function handleGenerateReactComponent(data: any): Promise<void> {
	try {
		console.log("🚀 Начинаем генерацию React компонента...");

		const { astData, shapeId } = data;

		if (!astData) {
			throw new Error("AST данные не найдены");
		}

		const shape = penpot.currentPage?.getShapeById(shapeId);
		if (!shape) {
			throw new Error("Shape не найден");
		}

		// Передаем данные в UI для обработки Claude API
		sendMessage({
			type: "generate-react-component-start",
			data: { astData, shapeId },
		});

		console.log("✅ Данные переданы в UI для генерации React компонента");
	} catch (error) {
		console.error("❌ Ошибка генерации React компонента:", error);
		sendMessage({
			type: "react-component-error",
			content: error.message,
		});
	}
}

/**
 * Handle saving React component to shape plugin data
 */
function handleSaveReactComponent(data: any): void {
	try {
		const { componentCode, shapeId } = data;
		const shape = penpot.currentPage?.getShapeById(shapeId);

		if (!shape) {
			throw new Error("Shape не найден");
		}

		// Использовать storage service
		const metadata = {
			shapeInfo: {
				id: shapeId,
				name: shape.name || "Unnamed",
			},
		};

		saveReactComponentToShape(shape, componentCode, metadata);

		console.log("✅ React компонент сохранен");
	} catch (error) {
		console.error("❌ Ошибка сохранения React компонента:", error);
		sendMessage({
			type: "react-component-error",
			content: error.message,
		});
	}
}

/**
 * Handle clearing React component from shape
 */
function handleClearReactComponent(shapeId: string): void {
	try {
		const shape = penpot.currentPage?.getShapeById(shapeId);
		if (shape) {
			removeReactComponentFromShape(shape);
			console.log("✅ React компонент очищен для shape:", shapeId);
		}
	} catch (error) {
		console.error("❌ Ошибка очистки React компонента:", error);
	}
}
