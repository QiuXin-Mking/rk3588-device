export async function copyTextToClipboard(text: string): Promise<boolean> {
	if (!text) return false;

	try {
		if (globalThis.navigator?.clipboard?.writeText) {
			await globalThis.navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Fall back to execCommand below.
	}

	const doc = globalThis.document;
	if (!doc?.body) return false;

	const textarea = doc.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "true");
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	textarea.style.opacity = "0";
	doc.body.appendChild(textarea);
	textarea.focus();
	textarea.select();

	let ok = false;
	try {
		ok = doc.execCommand("copy");
	} catch {
		ok = false;
	} finally {
		doc.body.removeChild(textarea);
	}

	return ok;
}
