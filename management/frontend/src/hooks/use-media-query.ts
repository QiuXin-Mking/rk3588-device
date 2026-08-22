import * as React from "react";

export function useMediaQuery(query: string) {
	const [value, setValue] = React.useState(false);

	React.useEffect(() => {
		function onChange(event: MediaQueryListEvent) {
			setValue(event.matches);
		}

		// Prevent SSR errors where window handles might be unavailable
		if (typeof window !== "undefined") {
			const result = window.matchMedia(query);
			result.addEventListener("change", onChange);
			setValue(result.matches);

			return () => result.removeEventListener("change", onChange);
		}
	}, [query]);

	return value;
}
