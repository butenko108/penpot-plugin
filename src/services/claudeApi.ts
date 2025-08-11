import Anthropic from "@anthropic-ai/sdk";
import { uint8ArrayToBase64 } from "../utils/imageUtils";

// Инициализируем клиент Anthropic
const anthropic = new Anthropic({
	apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
	dangerouslyAllowBrowser: true, // Включаем поддержку браузера
});

export const analyzeWithClaude = async (
	imageData: Uint8Array,
): Promise<string> => {
	const base64Image = uint8ArrayToBase64(imageData);
	const prompt = `Задача: 
Изучи изображения. Опиши коротко, что вообще изображено на картинке. Дай описание и мета-информацию коротко. 
Это изображение - это shape из penpot. Эту мета-информацию я использую в будущем чтобы описать AST, а затем создать ui компоненты.`;

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
