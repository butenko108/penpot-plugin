import { useEffect, useState } from "react";
import "./App.css";
import type {
	PluginMessage,
	PluginToUIMessage,
	SavedAnalysis,
	ShapeInfo,
	TagData,
} from "./model";
import { analyzeWithClaude } from "./services/claudeApi";
import {
	CodeGenerator,
	type CodeGeneratorNode,
} from "./services/code-generator";

function App() {
	const url = new URL(window.location.href);
	const initialTheme = url.searchParams.get("theme");

	// ==========================================
	// ОБЩЕЕ СОСТОЯНИЕ
	// ==========================================
	const [theme, setTheme] = useState(initialTheme || null);

	// ==========================================
	// CLAUDE СОСТОЯНИЕ
	// ==========================================
	const [hasSelection, setHasSelection] = useState(false);
	const [selectedShape, setSelectedShape] = useState<ShapeInfo | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportStatus, setExportStatus] = useState<string>("");
	const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis | null>(
		null,
	);

	// ==========================================
	// SEMANTIC СОСТОЯНИЕ
	// ==========================================
	const [currentSelection, setCurrentSelection] = useState<any[]>([]);
	const [taggedElements, setTaggedElements] = useState<Map<string, TagData>>(
		new Map(),
	);

	// Tagging form state
	const [tagSelect, setTagSelect] = useState("");
	const [customTag, setCustomTag] = useState("");
	const [properties, setProperties] = useState<
		Array<{ key: string; value: string }>
	>([]);

	// Auto-tagging state
	const [autoTagEnabled, setAutoTagEnabled] = useState(true);
	const [autoTagFeedback, setAutoTagFeedback] = useState<{
		message: string;
		type: string;
	} | null>(null);

	// Code generation state
	const [htmlOutput, setHtmlOutput] = useState("");
	const [cssOutput, setCssOutput] = useState("");
	const [codeGenerator] = useState(new CodeGenerator());

	// ==========================================
	// ОБРАБОТЧИКИ СООБЩЕНИЙ
	// ==========================================
	useEffect(() => {
		const handleMessage = (event: MessageEvent<PluginToUIMessage>) => {
			const message = event.data;

			switch (message.type) {
				// ОБЩИЕ СООБЩЕНИЯ
				case "theme":
					setTheme(message.content);
					break;

				// CLAUDE СООБЩЕНИЯ
				case "selection-change":
					setHasSelection(message.hasSelection);
					setSelectedShape(message.shapeInfo);
					setSavedAnalysis(message.savedAnalysis || null);
					if (!message.hasSelection) {
						setExportStatus("");
					}
					break;

				case "export-start":
					setIsExporting(true);
					setExportStatus("Экспортируем shape...");
					break;

				case "export-and-analyze-complete":
					setIsExporting(false);
					setExportStatus("Анализируем с Claude...");

					analyzeWithClaude(message.imageData)
						.then((analysis) => {
							console.log("🤖 Claude Analysis:", analysis);

							parent.postMessage(
								{
									type: "create-text-shape",
									analysisText: analysis,
									selectedShapeInfo: message.shapeInfo,
								},
								"*",
							);

							setExportStatus("Анализ завершен");
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

				// SEMANTIC СООБЩЕНИЯ
				case "selection-update":
					setCurrentSelection(message.data || []);
					break;

				case "tag-applied":
					const {
						elementId,
						elementName,
						tag,
						properties: tagProps,
					} = message.data;
					setTaggedElements(
						(prev) =>
							new Map(
								prev.set(elementId, {
									tag,
									properties: tagProps,
									elementId,
									elementName,
								}),
							),
					);
					break;

				case "tag-removed":
					setTaggedElements((prev) => {
						const newMap = new Map(prev);
						newMap.delete(message.data.elementId);
						return newMap;
					});
					// Update form if this was the selected element
					if (
						currentSelection.length > 0 &&
						currentSelection[0].id === message.data.elementId
					) {
						clearTaggingForm();
					}
					break;

				case "tags-loaded":
					const newTaggedElements = new Map();
					message.data.forEach((tagData: TagData) => {
						newTaggedElements.set(tagData.elementId, tagData);
					});
					setTaggedElements(newTaggedElements);
					break;

				case "export-data":
					downloadJsonFile(message.data);
					break;

				case "auto-tag-complete":
					const { taggedCount } = message.data;
					if (taggedCount > 0) {
						showAutoTagFeedback(
							`✅ ${taggedCount} elements were successfully tagged.`,
							"success",
						);
					} else {
						showAutoTagFeedback(
							"ℹ️ No elements with valid names were found to tag.",
							"info",
						);
					}
					break;

				case "rich-json-data":
					processRichJsonForCodeGeneration(message.data);
					break;
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [currentSelection]);

	// ==========================================
	// CLAUDE ФУНКЦИИ
	// ==========================================
	const handleExportAndAnalyzeClick = () => {
		if (!hasSelection) return;
		parent.postMessage({ type: "export-and-analyze" }, "*");
	};

	// ==========================================
	// SEMANTIC ФУНКЦИИ
	// ==========================================

	// Tagging functions
	const handleTagSelectChange = (value: string) => {
		setTagSelect(value);
		if (value) {
			setCustomTag("");
			updatePropertiesForTag(value);
		}
	};

	const handleCustomTagChange = (value: string) => {
		setCustomTag(value);
		if (value) {
			setTagSelect("");
		}
	};

	const updatePropertiesForTag = (tag: string) => {
		setProperties([]);
		const suggestedProperties = getSuggestedProperties(tag);
		setProperties(
			suggestedProperties.map((prop) => ({
				key: prop.key,
				value: prop.value,
			})),
		);
	};

	const getSuggestedProperties = (
		tag: string,
	): Array<{ key: string; value: string; placeholder: string }> => {
		const suggestions: Record<
			string,
			Array<{ key: string; value: string; placeholder: string }>
		> = {
			button: [
				{ key: "type", value: "button", placeholder: "button, submit, reset" },
				{ key: "onClick", value: "", placeholder: "handleClick" },
			],
			input: [
				{
					key: "type",
					value: "text",
					placeholder: "text, password, email, number",
				},
				{ key: "placeholder", value: "", placeholder: "Enter your text..." },
				{ key: "required", value: "true", placeholder: "true, false" },
			],
			a: [
				{ key: "href", value: "", placeholder: "https://example.com" },
				{ key: "target", value: "_blank", placeholder: "_blank, _self" },
			],
			img: [
				{ key: "src", value: "", placeholder: "path/image.jpg" },
				{ key: "alt", value: "", placeholder: "Image description" },
			],
			MuiButton: [
				{
					key: "variant",
					value: "contained",
					placeholder: "contained, outlined, text",
				},
				{
					key: "color",
					value: "primary",
					placeholder: "primary, secondary, error",
				},
				{ key: "onClick", value: "", placeholder: "handleClick" },
			],
			MuiTextField: [
				{ key: "label", value: "", placeholder: "Field label" },
				{
					key: "variant",
					value: "outlined",
					placeholder: "outlined, filled, standard",
				},
				{ key: "required", value: "false", placeholder: "true, false" },
			],
			ChakraButton: [
				{
					key: "colorScheme",
					value: "blue",
					placeholder: "blue, red, green, purple",
				},
				{ key: "size", value: "md", placeholder: "xs, sm, md, lg" },
				{ key: "onClick", value: "", placeholder: "handleClick" },
			],
		};

		return (
			suggestions[tag] || [
				{ key: "className", value: "", placeholder: "css-class-name" },
			]
		);
	};

	const addProperty = () => {
		setProperties((prev) => [...prev, { key: "", value: "" }]);
	};

	const updateProperty = (
		index: number,
		field: "key" | "value",
		value: string,
	) => {
		setProperties((prev) =>
			prev.map((prop, i) => (i === index ? { ...prop, [field]: value } : prop)),
		);
	};

	const removeProperty = (index: number) => {
		setProperties((prev) => prev.filter((_, i) => i !== index));
	};

	const applyTag = () => {
		if (currentSelection.length === 0) {
			alert("No elements selected");
			return;
		}

		const tag = customTag.trim() || tagSelect;
		if (!tag) {
			alert("Select or enter a tag");
			return;
		}

		const tagProperties: Record<string, string> = {};
		properties.forEach((prop) => {
			if (prop.key.trim() && prop.value.trim()) {
				tagProperties[prop.key.trim()] = prop.value.trim();
			}
		});

		const message: PluginMessage = {
			type: "apply-tag",
			data: {
				tag,
				properties: tagProperties,
				elementIds: currentSelection.map((el) => el.id),
			},
		};

		parent.postMessage(message, "*");
	};

	const removeTag = () => {
		if (currentSelection.length === 0) {
			alert("No elements selected");
			return;
		}

		const message: PluginMessage = {
			type: "remove-tag",
			data: {
				elementIds: currentSelection.map((el) => el.id),
			},
		};

		parent.postMessage(message, "*");
	};

	const removeTagFromElement = (elementId: string) => {
		const message: PluginMessage = {
			type: "remove-tag",
			data: {
				elementIds: [elementId],
			},
		};

		parent.postMessage(message, "*");
	};

	const exportTags = () => {
		const message: PluginMessage = {
			type: "export-tags",
		};

		parent.postMessage(message, "*");
	};

	const autoTagSelection = () => {
		if (!autoTagEnabled) {
			showAutoTagFeedback(
				"Auto-tagging is disabled. Enable the option to continue.",
				"info",
			);
			return;
		}

		if (currentSelection.length === 0) {
			showAutoTagFeedback(
				"Please select at least one group or layer.",
				"error",
			);
			return;
		}

		const message: PluginMessage = {
			type: "auto-tag-selection",
			data: {
				elementIds: currentSelection.map((el) => el.id),
			},
		};

		parent.postMessage(message, "*");
	};

	const showAutoTagFeedback = (
		message: string,
		type: "success" | "error" | "info",
	) => {
		setAutoTagFeedback({ message, type });
		setTimeout(() => {
			setAutoTagFeedback(null);
		}, 5000);
	};

	const clearTaggingForm = () => {
		setTagSelect("");
		setCustomTag("");
		setProperties([]);
	};

	// Code generation functions
	const generateCode = () => {
		if (taggedElements.size === 0) {
			showCodeGenerationFeedback(
				"No tagged elements found. Please tag some elements first.",
				"error",
			);
			return;
		}

		try {
			const message: PluginMessage = {
				type: "generate-rich-json",
			};

			parent.postMessage(message, "*");
		} catch (error) {
			console.error("Error generating code:", error);
			showCodeGenerationFeedback(
				"Error generating code. Please try again.",
				"error",
			);
		}
	};

	const processRichJsonForCodeGeneration = (exportData: any) => {
		try {
			if (!exportData || !exportData.tree || exportData.tree.length === 0) {
				showCodeGenerationFeedback(
					"No valid data found for code generation.",
					"error",
				);
				return;
			}

			const codeNodes: CodeGeneratorNode[] = exportData.tree.map((node: any) =>
				convertToCodeGeneratorNode(node),
			);

			const htmlCode = codeGenerator.generateHtml(codeNodes);
			const cssCode = codeGenerator.generateCss(codeNodes);

			setHtmlOutput(htmlCode);
			setCssOutput(cssCode);

			showCodeGenerationFeedback(
				`✅ Code generated successfully! ${codeNodes.length} root element(s) processed.`,
				"success",
			);
		} catch (error) {
			console.error("Error processing rich JSON:", error);
			showCodeGenerationFeedback(
				"Error processing data for code generation.",
				"error",
			);
		}
	};

	const convertToCodeGeneratorNode = (node: any): CodeGeneratorNode => {
		const codeNode: CodeGeneratorNode = {
			tag: node.tag,
			elementName: node.elementName,
			attributes: node.attributes || {},
			styles: node.styles || {},
			content: node.content,
		};

		if (
			node.children &&
			Array.isArray(node.children) &&
			node.children.length > 0
		) {
			codeNode.children = node.children.map((child: any) =>
				convertToCodeGeneratorNode(child),
			);
		}

		return codeNode;
	};

	const copyToClipboard = async (content: string, type: string) => {
		if (!content || content.trim() === "") {
			showCodeGenerationFeedback(
				`No ${type} code to copy. Generate code first.`,
				"error",
			);
			return;
		}

		try {
			await navigator.clipboard.writeText(content);
			showCodeGenerationFeedback(
				`${type} code copied to clipboard!`,
				"success",
			);
		} catch (error) {
			console.error("Error copying to clipboard:", error);
			showCodeGenerationFeedback(
				"Unable to copy to clipboard. Please select and copy manually.",
				"error",
			);
		}
	};

	const showCodeGenerationFeedback = (
		message: string,
		type: "success" | "error" | "info",
	) => {
		// For now, just console.log - could add state for this later
		console.log(`Code Generation ${type}: ${message}`);
	};

	const downloadJsonFile = (data: any) => {
		try {
			const jsonString = JSON.stringify(data, null, 2);

			const modal = document.createElement("div");
			modal.style.cssText = `
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: rgba(0, 0, 0, 0.8);
				z-index: 1000;
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 20px;
				box-sizing: border-box;
			`;

			const content = document.createElement("div");
			content.style.cssText = `
				background: var(--db-primary);
				border-radius: 8px;
				padding: 20px;
				overflow: auto;
				height: -webkit-fill-available;
				width: -webkit-fill-available;
			`;

			content.innerHTML = `
				<h2 style="margin-top: 0;">Tag Export</h2>
				<p style="margin-bottom: 16px;">Copy the following JSON and save it to a .json file:</p>
				<textarea readonly style="
					width: 100%;
					height: 80%;
					font-family: monospace;
					font-size: 14px;
					background: var(--db-secondary);
					border-radius: 4px;
					padding: 10px;
					color: var(--app-blue);
					resize: vertical;
					box-sizing: border-box;
				">${jsonString}</textarea>
				<div style="margin-top: 15px; display: flex; gap: 10px;">
					<button id="copy-json" data-appearance="primary">Copy to Clipboard</button>
					<button id="close-modal" data-appearance="secondary">Close</button>
				</div>
			`;

			modal.appendChild(content);
			document.body.appendChild(modal);

			const textarea = content.querySelector("textarea")!;
			const copyBtn = content.querySelector("#copy-json")!;
			const closeBtn = content.querySelector("#close-modal")!;

			copyBtn.addEventListener("click", async () => {
				try {
					await navigator.clipboard.writeText(jsonString);
					copyBtn.textContent = "Copied!";
					setTimeout(() => {
						copyBtn.textContent = "Copy to Clipboard";
					}, 2000);
				} catch (error) {
					textarea.select();
					document.execCommand("copy");
					copyBtn.textContent = "Copied!";
					setTimeout(() => {
						copyBtn.textContent = "Copy to Clipboard";
					}, 2000);
				}
			});

			closeBtn.addEventListener("click", () => {
				document.body.removeChild(modal);
			});

			const handleEscape = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					document.body.removeChild(modal);
					document.removeEventListener("keydown", handleEscape);
				}
			};
			document.addEventListener("keydown", handleEscape);

			textarea.select();
		} catch (error) {
			console.error("Error showing JSON:", error);
			alert("Error exporting tags");
		}
	};

	// Load existing tag for selected element
	useEffect(() => {
		if (currentSelection.length > 0) {
			const element = currentSelection[0];
			const existingTag = taggedElements.get(element.id);

			if (existingTag) {
				// Load tag
				if (isStandardTag(existingTag.tag)) {
					setTagSelect(existingTag.tag);
					setCustomTag("");
				} else {
					setTagSelect("");
					setCustomTag(existingTag.tag);
				}

				// Load properties
				const tagProperties = Object.entries(existingTag.properties).map(
					([key, value]) => ({
						key,
						value,
					}),
				);
				setProperties(tagProperties);
			} else {
				clearTaggingForm();
			}
		} else {
			clearTaggingForm();
		}
	}, [currentSelection, taggedElements]);

	const isStandardTag = (tag: string): boolean => {
		const standardTags = [
			"div",
			"span",
			"p",
			"h1",
			"h2",
			"h3",
			"button",
			"input",
			"textarea",
			"select",
			"label",
			"img",
			"li",
			"ul",
			"a",
			"body",
			"nav",
			"main",
			"header",
			"footer",
			"section",
			"article",
			"aside",
			"MuiButton",
			"MuiTextField",
			"MuiCard",
			"MuiAppBar",
			"MuiDrawer",
			"MuiDialog",
			"MuiChip",
			"MuiAvatar",
			"ChakraButton",
			"ChakraInput",
			"ChakraBox",
			"ChakraFlex",
			"ChakraText",
			"ChakraHeading",
			"BsButton",
			"BsCard",
			"BsNavbar",
			"BsModal",
			"BsAlert",
		];
		return standardTags.includes(tag);
	};

	const formatProperties = (properties: Record<string, string>): string => {
		const entries = Object.entries(properties);
		if (entries.length === 0) return "";

		return entries.map(([key, value]) => `${key}="${value}"`).join(" ");
	};

	// ==========================================
	// RENDER
	// ==========================================
	return (
		<div data-theme={theme} className="plugin-container">
			{/* HEADER */}
			<div className="plugin-header">
				<h2>Claude Analysis & Semantic Tagging</h2>
			</div>

			{/* CLAUDE ANALYSIS SECTION */}
			<div className="claude-section">
				<div className="section-header">
					<h3>🤖 Claude Analysis</h3>
				</div>

				<div className="selection-info">
					{hasSelection && selectedShape ? (
						<div className="selection-details">
							<p>
								<strong>Selected:</strong> {selectedShape.name}
							</p>
							<p>
								<strong>Type:</strong> {selectedShape.type}
							</p>
							<p>
								<strong>Size:</strong> {Math.round(selectedShape.width)} ×{" "}
								{Math.round(selectedShape.height)}px
							</p>
						</div>
					) : (
						<div className="no-selection">
							<p>Select an element on the canvas</p>
						</div>
					)}
				</div>

				<div className="export-section">
					<button
						type="button"
						className="export-button claude-button"
						onClick={handleExportAndAnalyzeClick}
						disabled={!hasSelection || isExporting}
					>
						{isExporting ? "Analyzing..." : "🔍 Analyze with Claude"}
					</button>

					{exportStatus && (
						<div
							className={`status-message ${exportStatus.includes("Ошибка") ? "error" : "success"}`}
						>
							{exportStatus}
						</div>
					)}
				</div>

				{hasSelection && savedAnalysis && (
					<div className="analysis-section">
						<h4>Previous Analysis:</h4>
						<div className="analysis-content">
							<div style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>
								{savedAnalysis.markdown}
							</div>
						</div>
						<div className="analysis-meta">
							<small>
								Analyzed: {new Date(savedAnalysis.timestamp).toLocaleString()}
							</small>
						</div>
					</div>
				)}
			</div>

			{/* SEMANTIC TAGGING SECTION */}
			<div className="semantic-section">
				<div className="section-header">
					<h3>🏷️ Semantic Tagging</h3>
				</div>

				<div className="selection-info">
					{currentSelection.length > 0 ? (
						<div className="selection-details">
							<p>
								<strong>Selected:</strong> {currentSelection.length} element(s)
							</p>
							<p>
								<strong>Name:</strong> {currentSelection[0]?.name || "Unnamed"}
							</p>
						</div>
					) : (
						<div className="no-selection">
							<p>Select elements for tagging</p>
						</div>
					)}
				</div>

				{currentSelection.length > 0 && (
					<div className="tagging-form">
						<div className="form-group">
							<label>HTML Tag/Component:</label>
							<select
								value={tagSelect}
								onChange={(e) => handleTagSelectChange(e.target.value)}
								className="select"
							>
								<option value="">Choose a tag...</option>
								<optgroup label="Basic HTML">
									<option value="div">div</option>
									<option value="span">span</option>
									<option value="p">p</option>
									<option value="h1">h1</option>
									<option value="h2">h2</option>
									<option value="h3">h3</option>
									<option value="button">button</option>
									<option value="input">input</option>
									<option value="textarea">textarea</option>
									<option value="select">select</option>
									<option value="label">label</option>
									<option value="img">img</option>
									<option value="li">li</option>
									<option value="ul">ul</option>
									<option value="a">a</option>
									<option value="nav">nav</option>
									<option value="main">main</option>
									<option value="header">header</option>
									<option value="footer">footer</option>
									<option value="section">section</option>
									<option value="article">article</option>
									<option value="aside">aside</option>
								</optgroup>
								<optgroup label="Material UI">
									<option value="MuiButton">MuiButton</option>
									<option value="MuiTextField">MuiTextField</option>
									<option value="MuiCard">MuiCard</option>
									<option value="MuiAppBar">MuiAppBar</option>
									<option value="MuiDrawer">MuiDrawer</option>
									<option value="MuiDialog">MuiDialog</option>
									<option value="MuiChip">MuiChip</option>
									<option value="MuiAvatar">MuiAvatar</option>
								</optgroup>
								<optgroup label="Chakra UI">
									<option value="ChakraButton">ChakraButton</option>
									<option value="ChakraInput">ChakraInput</option>
									<option value="ChakraBox">ChakraBox</option>
									<option value="ChakraFlex">ChakraFlex</option>
									<option value="ChakraText">ChakraText</option>
									<option value="ChakraHeading">ChakraHeading</option>
								</optgroup>
								<optgroup label="Bootstrap">
									<option value="BsButton">BsButton</option>
									<option value="BsCard">BsCard</option>
									<option value="BsNavbar">BsNavbar</option>
									<option value="BsModal">BsModal</option>
									<option value="BsAlert">BsAlert</option>
								</optgroup>
							</select>
						</div>

						<div className="form-group">
							<label>Or custom tag:</label>
							<input
								type="text"
								value={customTag}
								onChange={(e) => handleCustomTagChange(e.target.value)}
								className="input"
								placeholder="e.g. MyCustomComponent"
							/>
						</div>

						<div className="properties-section">
							<h4>Properties</h4>
							<div className="properties-list">
								{properties.map((prop, index) => (
									<div key={index} className="property-item">
										<input
											type="text"
											className="input property-key"
											placeholder="Property"
											value={prop.key}
											onChange={(e) =>
												updateProperty(index, "key", e.target.value)
											}
										/>
										<input
											type="text"
											className="input property-value"
											placeholder="Value"
											value={prop.value}
											onChange={(e) =>
												updateProperty(index, "value", e.target.value)
											}
										/>
										<button
											type="button"
											className="btn-remove"
											onClick={() => removeProperty(index)}
											title="Remove property"
										>
											-
										</button>
									</div>
								))}
							</div>
							<button
								type="button"
								onClick={addProperty}
								data-appearance="secondary"
							>
								+ Add Property
							</button>
						</div>

						<div className="actions">
							<button
								type="button"
								onClick={applyTag}
								data-appearance="primary"
							>
								Apply Tag
							</button>
							<button
								type="button"
								onClick={removeTag}
								data-appearance="secondary"
							>
								Remove Tag
							</button>
						</div>
					</div>
				)}

				{/* Auto-tagging section */}
				<div className="auto-tagging-section">
					<h4>Auto-Tagging</h4>
					<p className="auto-tagging-description">
						Automatically tag elements based on layer names using conventions
						such as:
						<code>button/primary</code>, <code>input/email</code>,{" "}
						<code>nav/main</code>
					</p>

					<div className="auto-tagging-controls">
						<label className="checkbox-label">
							<input
								type="checkbox"
								checked={autoTagEnabled}
								onChange={(e) => setAutoTagEnabled(e.target.checked)}
							/>
							<span>Auto-tag using the layer name</span>
						</label>

						<button
							type="button"
							onClick={autoTagSelection}
							data-appearance="primary"
						>
							🏷️ Auto-Tag Selection
						</button>
					</div>

					{autoTagFeedback && (
						<div className={`auto-tag-feedback ${autoTagFeedback.type}`}>
							{autoTagFeedback.message}
						</div>
					)}
				</div>

				{/* Tagged elements overview */}
				<div className="tags-overview">
					<h4>Tagged Elements ({taggedElements.size})</h4>
					<div className="tagged-elements-list">
						{Array.from(taggedElements.values()).map((tagData) => (
							<div key={tagData.elementId} className="tagged-element-item">
								<div className="tagged-element-info">
									<div className="tagged-element-header">
										<span className="tagged-element-name">
											{tagData.elementName}
										</span>
										<span className="tagged-element-tag">
											&lt;{tagData.tag}&gt;
										</span>
									</div>
									{Object.keys(tagData.properties).length > 0 && (
										<div className="tagged-element-properties">
											{formatProperties(tagData.properties)}
										</div>
									)}
								</div>
								<button
									type="button"
									className="remove-tag-btn"
									onClick={() => removeTagFromElement(tagData.elementId)}
									title="Remove tag"
								>
									×
								</button>
							</div>
						))}
						{taggedElements.size === 0 && (
							<div className="empty-state">No tagged elements</div>
						)}
					</div>
					<button
						type="button"
						onClick={exportTags}
						data-appearance="secondary"
					>
						Export Tags (JSON)
					</button>
				</div>

				{/* Code Generation Section */}
				<div className="code-generation-section">
					<h4>Generated Code</h4>

					<div className="code-generation-controls">
						<button
							type="button"
							onClick={generateCode}
							data-appearance="primary"
						>
							Generate HTML & CSS
						</button>
					</div>

					<div className="code-output">
						<div className="code-block">
							<div className="code-header">
								<h5>HTML</h5>
								<button
									type="button"
									onClick={() => copyToClipboard(htmlOutput, "HTML")}
									data-appearance="secondary"
								>
									Copy HTML
								</button>
							</div>
							<textarea
								className="code-textarea"
								readOnly
								placeholder="Generated HTML will appear here..."
								value={htmlOutput}
							/>
						</div>

						<div className="code-block">
							<div className="code-header">
								<h5>CSS</h5>
								<button
									type="button"
									onClick={() => copyToClipboard(cssOutput, "CSS")}
									data-appearance="secondary"
								>
									Copy CSS
								</button>
							</div>
							<textarea
								className="code-textarea"
								readOnly
								placeholder="Generated CSS will appear here..."
								value={cssOutput}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
