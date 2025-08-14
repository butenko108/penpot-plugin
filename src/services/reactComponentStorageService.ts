/**
 * React Component Storage Service
 * Handles saving and loading React component code to/from Penpot Plugin Data
 */

export interface ReactComponentStorageData {
	componentCode: string;
	timestamp: number;
	version: string;
	metadata: {
		shapeInfo: any;
		astData?: string;
	};
}

const REACT_COMPONENT_PLUGIN_KEY = "react-component";
const VERSION = "1.0";

/**
 * Save React component code to Penpot shape plugin data
 */
export function saveReactComponentToShape(
	shape: any,
	componentCode: string,
	metadata: {
		shapeInfo: any;
		astData?: string;
	},
): void {
	try {
		const componentStorage: ReactComponentStorageData = {
			componentCode,
			timestamp: Date.now(),
			version: VERSION,
			metadata,
		};

		shape.setPluginData(
			REACT_COMPONENT_PLUGIN_KEY,
			JSON.stringify(componentStorage),
		);
		console.log("✅ React component saved to shape plugin data", shape.id);
	} catch (error) {
		console.error("❌ Error saving React component to shape:", error);
		throw new Error(`Failed to save React component: ${error.message}`);
	}
}

/**
 * Load React component code from Penpot shape plugin data
 */
export function loadReactComponentFromShape(
	shape: any,
): ReactComponentStorageData | null {
	try {
		const componentDataString = shape.getPluginData(REACT_COMPONENT_PLUGIN_KEY);

		if (!componentDataString) {
			return null;
		}

		const componentData: ReactComponentStorageData =
			JSON.parse(componentDataString);
		console.log("✅ React component loaded from shape plugin data", shape.id);

		return componentData;
	} catch (error) {
		console.error("❌ Error loading React component from shape:", error);
		return null;
	}
}

/**
 * Check if shape has React component data
 */
export function hasReactComponent(shape: any): boolean {
	try {
		const componentDataString = shape.getPluginData(REACT_COMPONENT_PLUGIN_KEY);
		return !!componentDataString;
	} catch (error) {
		console.error("❌ Error checking React component existence:", error);
		return false;
	}
}

/**
 * Remove React component data from shape
 */
export function removeReactComponentFromShape(shape: any): void {
	try {
		shape.setPluginData(REACT_COMPONENT_PLUGIN_KEY, "");
		console.log("✅ React component removed from shape plugin data", shape.id);
	} catch (error) {
		console.error("❌ Error removing React component from shape:", error);
		throw new Error(`Failed to remove React component: ${error.message}`);
	}
}
