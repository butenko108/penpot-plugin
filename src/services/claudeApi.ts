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
Изучи изображения. Опиши коротко, что вообще изображено на картинке. Дай описание и мета-информацию подробно. 
Это изображение - это shape из penpot. Эту мета-информацию я использую в будущем чтобы описать AST, а затем создать ui компоненты.

Не нужно давать описание css стилей. 
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

export const generateReactComponentWithClaude = async (
	astData: string,
): Promise<string> => {
	const prompt = `Задача:
Создай реакт компонент на основании этой ast. 
${astData}
Ничего не добавляй от себя. Просто следуй этим инструкциям. css стили, реакт компонент. Сам компонент - это один файл.`;

	console.log(
		"📡 Отправляем запрос на генерацию React компонента в Claude API...",
	);

	try {
		const message = await anthropic.messages.create({
			model: "claude-sonnet-4-20250514",
			max_tokens: 4000,
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

		console.log("✅ React Component response received from Claude");

		// Извлекаем текст из ответа
		const textContent = message.content.find(
			(content) => content.type === "text",
		);

		const rawResponse = textContent?.text || "No React component generated";

		// Очистка от markdown
		const cleanedResponse = rawResponse
			.replace(/```jsx\s*/g, "") // убрать ```jsx
			.replace(/```javascript\s*/g, "") // убрать ```javascript
			.replace(/```\s*/g, "") // убрать ```
			.trim(); // убрать лишние пробелы

		return cleanedResponse;
	} catch (error) {
		console.error("❌ Claude React Component Error:", error);
		throw new Error(`Claude React Component API Error: ${error.message}`);
	}
};

export const generateStorybookWithClaude = async (
	reactCode: string,
): Promise<string> => {
	const prompt = `Задача:
Создай storybook файл на основании кода Реакт Компонента.
${reactCode}
Сторибук - это один файл.`;

	console.log("📡 Отправляем запрос на генерацию Storybook в Claude API...");

	try {
		const message = await anthropic.messages.create({
			model: "claude-sonnet-4-20250514",
			max_tokens: 4000,
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

		console.log("✅ Storybook response received from Claude");

		// Извлекаем текст из ответа
		const textContent = message.content.find(
			(content) => content.type === "text",
		);

		const rawResponse = textContent?.text || "No Storybook generated";

		// Очистка от markdown
		const cleanedResponse = rawResponse
			.replace(/```typescript\s*/g, "") // убрать ```typescript
			.replace(/```javascript\s*/g, "") // убрать ```javascript
			.replace(/```jsx\s*/g, "") // убрать ```jsx
			.replace(/```\s*/g, "") // убрать ```
			.trim(); // убрать лишние пробелы

		return cleanedResponse;
	} catch (error) {
		console.error("❌ Claude Storybook Error:", error);
		throw new Error(`Claude Storybook API Error: ${error.message}`);
	}
};
