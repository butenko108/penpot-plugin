/**
 * Storybook Storage Service
 * Handles saving and loading Storybook code to/from Penpot Plugin Data
 */

export interface StorybookStorageData {
	storybookCode: string;
	timestamp: number;
	version: string;
	metadata: {
		shapeInfo: any;
		reactCode?: string;
	};
}

const STORYBOOK_PLUGIN_KEY = "storybook-component";
const VERSION = "1.0";

/**
 * Save Storybook code to Penpot shape plugin data
 */
export function saveStorybookToShape(
	shape: any,
	storybookCode: string,
	metadata: {
		shapeInfo: any;
		reactCode?: string;
	},
): void {
	try {
		const storybookStorage: StorybookStorageData = {
			storybookCode,
			timestamp: Date.now(),
			version: VERSION,
			metadata,
		};

		shape.setPluginData(STORYBOOK_PLUGIN_KEY, JSON.stringify(storybookStorage));
		console.log("✅ Storybook saved to shape plugin data", shape.id);
	} catch (error) {
		console.error("❌ Error saving Storybook to shape:", error);
		throw new Error(`Failed to save Storybook: ${error.message}`);
	}
}

/**
 * Load Storybook code from Penpot shape plugin data
 */
export function loadStorybookFromShape(
	shape: any,
): StorybookStorageData | null {
	try {
		const storybookDataString = shape.getPluginData(STORYBOOK_PLUGIN_KEY);

		if (!storybookDataString) {
			return null;
		}

		const storybookData: StorybookStorageData = JSON.parse(storybookDataString);
		console.log("✅ Storybook loaded from shape plugin data", shape.id);

		return storybookData;
	} catch (error) {
		console.error("❌ Error loading Storybook from shape:", error);
		return null;
	}
}

/**
 * Check if shape has Storybook data
 */
export function hasStorybook(shape: any): boolean {
	try {
		const storybookDataString = shape.getPluginData(STORYBOOK_PLUGIN_KEY);
		return !!storybookDataString;
	} catch (error) {
		console.error("❌ Error checking Storybook existence:", error);
		return false;
	}
}

/**
 * Remove Storybook data from shape
 */
export function removeStorybookFromShape(shape: any): void {
	try {
		shape.setPluginData(STORYBOOK_PLUGIN_KEY, "");
		console.log("✅ Storybook removed from shape plugin data", shape.id);
	} catch (error) {
		console.error("❌ Error removing Storybook from shape:", error);
		throw new Error(`Failed to remove Storybook: ${error.message}`);
	}
}
