export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
	return btoa(String.fromCharCode(...uint8Array));
};
