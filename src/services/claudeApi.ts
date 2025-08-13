import Anthropic from "@anthropic-ai/sdk";
import { uint8ArrayToBase64 } from "../utils/imageUtils";
import { ASTPromptService } from "./astPromptService";

// Инициализируем клиент Anthropic
const anthropic = new Anthropic({
	apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
	dangerouslyAllowBrowser: true, // Включаем поддержку браузера
});

export const analyzeWithClaude = async (
	imageData: Uint8Array,
): Promise<string> => {
	const base64Image = uint8ArrayToBase64(imageData);
	const prompt = `
Задача: 
Напиши мета-информацию для прикрепленного изображения по следующим категориям. 
Это изображение - это shape из penpot. Эту мета-информацию я использую в будущем чтобы описать AST, а затем создать ui компоненты по best practices.

Категории мета-информации для AST и разработки UI-компонентов:
1. Описание и назначение
Тип компонента и его основная цель
Контекст использования в интерфейсе
Функциональное назначение

2. Система вариантов
Размерные варианты (small, medium, large)
Стилистические варианты (primary, secondary, outline)
Функциональные модификаторы (with-icon, loading)

3. Иерархия важности
Primary/secondary элементы
Default состояния и приоритеты
Визуальный вес компонентов

4. Состояния и поведение
Интерактивные состояния (default, hover, focus, active, disabled)
Логика переключения состояний
Условия активации/деактивации

5. Структура контента
Типы контента (текст, иконки, комбинации)
Обязательные и опциональные элементы
Ограничения по контенту

6. Семантика и доступность
ARIA роли и атрибуты
Клавиатурная навигация
Screen reader поддержка
Семантическое назначение компонента

7. Контекст использования
UX паттерны применения
Типичные сценарии использования
Группировка с другими компонентами

Ты можешь добавлять любую информацию, которая будет полезна для разработчика во время работы над компонентом на основании твоего описания, однако не выдумывай ничего от себя. Описывай то, что видишь на изображении.

Категории мета-информации, по которым не нужно давать мне информацию:
- css стили: цвета, шрифты, размеры и т.д.
- количество элементов
- не нужно добавлять любую информацию, которая не актуальна для разработки того, что изображено на картинке 
`;

	console.log("📡 Отправляем запрос в Claude API через официальный SDK...");

	try {
		const message = await anthropic.messages.create({
			model: "claude-sonnet-4-20250514",
			max_tokens: 1000,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "image",
							source: {
								type: "base64",
								media_type: "image/png",
								data: base64Image,
							},
						},
						{
							type: "text",
							text: prompt,
						},
					],
				},
			],
		});

		console.log("✅ Claude response received via SDK");

		// Извлекаем текст из ответа
		const textContent = message.content.find(
			(content) => content.type === "text",
		);
		return textContent?.text || "Нет текстового ответа от Claude";
	} catch (error) {
		console.error("❌ Claude SDK Error:", error);
		throw new Error(`Claude API Error: ${error.message}`);
	}
};

export const generateASTWithClaude = async (
	htmlCode: string,
	cssCode: string,
	metaInfo: string,
): Promise<string> => {
	const astPromptService = new ASTPromptService();
	const prompt = astPromptService.generateASTPrompt(
		htmlCode,
		cssCode,
		metaInfo,
	);

	console.log("📡 Отправляем запрос на генерацию AST в Claude API...");

	try {
		const message = await anthropic.messages.create({
			model: "claude-sonnet-4-20250514",
			max_tokens: 2000,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: prompt,
						},
					],
				},
			],
		});

		console.log("✅ AST response received from Claude");

		// Извлекаем текст из ответа
		const textContent = message.content.find(
			(content) => content.type === "text",
		);

		const rawResponse = textContent?.text || "No AST generated";

		// ДОБАВИТЬ очистку от markdown
		const cleanedResponse = rawResponse
			.replace(/```json\s*/g, "") // убрать ```json
			.replace(/```\s*/g, "") // убрать ```
			.trim(); // убрать лишние пробелы

		return cleanedResponse;
	} catch (error) {
		console.error("❌ Claude AST Error:", error);
		throw new Error(`Claude AST API Error: ${error.message}`);
	}
};
