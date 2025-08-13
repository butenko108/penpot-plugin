/**
 * AST Storage Service
 * Handles saving and loading AST data to/from Penpot Plugin Data
 */

export interface ASTStorageData {
	ast: string;
	timestamp: number;
	version: string;
	metadata: {
		shapeInfo: any;
		htmlCode: string;
		cssCode: string;
		metaInfo: string;
	};
}

const AST_PLUGIN_KEY = "component-ast";
const VERSION = "1.0";

/**
 * Save AST data to Penpot shape plugin data
 * @param shape Penpot shape object
 * @param astData Generated AST string from Claude
 * @param metadata Additional metadata about the generation
 */
export function saveASTToShape(
	shape: any,
	astData: string,
	metadata: {
		shapeInfo: any;
		htmlCode: string;
		cssCode: string;
		metaInfo: string;
	},
): void {
	try {
		const astStorage: ASTStorageData = {
			ast: astData,
			timestamp: Date.now(),
			version: VERSION,
			metadata,
		};

		shape.setPluginData(AST_PLUGIN_KEY, JSON.stringify(astStorage));
		console.log("✅ AST saved to shape plugin data", shape.id);
	} catch (error) {
		console.error("❌ Error saving AST to shape:", error);
		throw new Error(`Failed to save AST: ${error.message}`);
	}
}

/**
 * Load AST data from Penpot shape plugin data
 * @param shape Penpot shape object
 * @returns AST storage data or null if not found
 */
export function loadASTFromShape(shape: any): ASTStorageData | null {
	try {
		const astDataString = shape.getPluginData(AST_PLUGIN_KEY);

		if (!astDataString) {
			return null;
		}

		const astData: ASTStorageData = JSON.parse(astDataString);
		console.log("✅ AST loaded from shape plugin data", shape.id);

		return astData;
	} catch (error) {
		console.error("❌ Error loading AST from shape:", error);
		return null;
	}
}

/**
 * Check if shape has AST data
 * @param shape Penpot shape object
 * @returns boolean indicating if AST exists
 */
export function hasAST(shape: any): boolean {
	try {
		const astDataString = shape.getPluginData(AST_PLUGIN_KEY);
		return !!astDataString;
	} catch (error) {
		console.error("❌ Error checking AST existence:", error);
		return false;
	}
}

/**
 * Remove AST data from shape
 * @param shape Penpot shape object
 */
export function removeASTFromShape(shape: any): void {
	try {
		shape.setPluginData(AST_PLUGIN_KEY, "");
		console.log("✅ AST removed from shape plugin data", shape.id);
	} catch (error) {
		console.error("❌ Error removing AST from shape:", error);
		throw new Error(`Failed to remove AST: ${error.message}`);
	}
}
